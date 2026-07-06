import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Game, Player, TabId } from './types';
import { isGameRecordDataEqual, isSameGameView } from './utils/gameEquals';
import { getRecorderParams } from './utils/liveRoom';
import { loadHostRoom, type HostRoomInfo } from './utils/hostRoomStorage';
import { useAppData } from './hooks/useAppData';
import { useLiveRoomSync } from './hooks/useLiveRoomSync';
import { BottomNav } from './components/BottomNav';
import { Login } from './components/Login';
import { RecorderApp } from './components/RecorderApp';
import { GamesPanel } from './components/GamesPanel';
import { RecordPanel } from './components/RecordPanel';
import { StatsPanel } from './components/StatsPanel';
import { PublicStatsApp } from './components/PublicStatsApp';
import { PublicGameReportApp } from './components/PublicGameReportApp';
import { getPublicStatsParams } from './utils/publicStats';
import { getPublicGameReportParams } from './utils/publicGameReport';
import { PlayersPanel } from './components/PlayersPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { RegisterPanel } from './components/RegisterPanel';
import { PageHelpButton } from './components/PageHelpButton';
import type { HelpPageId } from './content/helpContent';
import { canUseRegisterForUsername } from './services/auth';

function HostApp() {
  const {
    session,
    data,
    loading,
    onAuth,
    onSessionUpdate,
    logout,
    cloudSync,
    syncToCloudNow,
    replaceData,
    addSeason,
    addPlayer,
    updatePlayer,
    addGame,
    updateGame,
    deleteGame,
    deletePlayer,
    upsertGame,
    mergePlayersFromGame,
  } = useAppData();

  const [tab, setTab] = useState<TabId>('record');
  const [activeGame, setActiveGame] = useState<Game | null>(null);
  const activeGameRef = useRef<Game | null>(null);
  activeGameRef.current = activeGame;

  const getLocalGame = useCallback(() => activeGameRef.current, []);

  const hostRoom = useMemo((): HostRoomInfo | null => {
    if (!activeGame?.liveRoomId) return null;
    const stored = loadHostRoom(activeGame.id);
    const pin = activeGame.liveRoomPin ?? stored?.pin;
    if (!pin) return null;
    return {
      gameId: activeGame.id,
      roomId: activeGame.liveRoomId,
      pin,
    };
  }, [activeGame?.id, activeGame?.liveRoomId, activeGame?.liveRoomPin]);

  const handleGameSynced = useCallback(
    (game: Game, players: Player[]) => {
      const local = activeGameRef.current;
      if (isSameGameView(local, game)) return;

      mergePlayersFromGame({
        ...game,
        rosterSnapshot: players.map((p) => ({ id: p.id, name: p.name, number: p.number })),
      });
      activeGameRef.current = game;
      updateGame(game);
      setActiveGame(game);
    },
    [updateGame, mergePlayersFromGame]
  );

  const { syncState, pushNow, schedulePush } = useLiveRoomSync(
    hostRoom?.roomId,
    hostRoom?.pin,
    activeGame,
    data?.players ?? [],
    handleGameSynced,
    !!activeGame?.liveRoomId && !!hostRoom && !activeGame?.isCompleted,
    getLocalGame
  );

  const handleSelectGame = (game: Game | null) => {
    activeGameRef.current = game;
    setActiveGame(game);
    if (game) setTab('record');
  };

  const handleUpsertGame = useCallback(
    (game: Game) => {
      upsertGame(game);
      if (activeGameRef.current?.id === game.id) {
        activeGameRef.current = game;
        setActiveGame(game);
      }
    },
    [upsertGame]
  );

  const handleUpdateGame = useCallback(
    (game: Game) => {
      const prev = activeGameRef.current;
      if (game.isCompleted && prev?.isCompleted && prev.id === game.id) {
        if (!isGameRecordDataEqual(prev, game)) return;
      }
      activeGameRef.current = game;
      setActiveGame(game);
      updateGame(game);
      if (game.liveRoomId && !game.isCompleted) {
        schedulePush(game);
      }
    },
    [updateGame, schedulePush]
  );

  const canUseRegister = session ? canUseRegisterForUsername(session.username) : false;
  const visibleTabs: TabId[] = canUseRegister
    ? ['record', 'games', 'stats', 'players', 'settings', 'register']
    : ['record', 'games', 'stats', 'players', 'settings'];
  useEffect(() => {
    if (tab === 'register' && !canUseRegister) {
      setTab('settings');
    }
  }, [tab, canUseRegister]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-field-green text-lg">載入中...</div>
      </div>
    );
  }

  if (!session || !data) {
    return <Login onAuth={onAuth} />;
  }

  const TITLES: Record<TabId, string> = {
    record: activeGame ? `主控 · ${activeGame.opponent}` : '打擊紀錄',
    games: '比賽管理',
    stats: '成績統計',
    players: '球員管理',
    settings: '設定',
    register: '註冊帳號',
  };

  const helpPageId: HelpPageId = tab;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-field-green text-white px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">⚾ 主控端</h1>
            <p className="text-xs text-green-200">{session.displayName}</p>
          </div>
          <div className="text-xs text-green-200 text-right flex items-center gap-2">
            <div>
              <div>{TITLES[tab]}</div>
              {activeGame?.liveRoomId && (
                <div className="text-[10px] opacity-80">
                  {syncState.syncing ? '同步中...' : syncState.connected ? '即時連線' : '連線中'}
                </div>
              )}
            </div>
            <PageHelpButton pageId={helpPageId} />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {tab === 'record' && (
          <RecordPanel
            players={data.players}
            activeGame={activeGame}
            seasons={data.seasons}
            syncState={activeGame?.liveRoomId ? syncState : null}
            onSyncNow={pushNow}
            onSelectGame={handleSelectGame}
            onUpdateGame={handleUpdateGame}
            hasBottomNav
            teamName={data.ownerName}
            publishedBy={session.displayName}
          />
        )}
        {tab === 'games' && (
          <GamesPanel
            seasons={data.seasons}
            games={data.games}
            players={data.players}
            ownerName={session.displayName}
            teamName={data.ownerName}
            onAddSeason={addSeason}
            onAddGame={addGame}
            onSelectGame={handleSelectGame}
            onDeleteGame={deleteGame}
            onUpsertGame={handleUpsertGame}
          />
        )}
        {tab === 'stats' && (
          <StatsPanel
            players={data.players}
            seasons={data.seasons}
            games={data.games}
            teamName={data.ownerName}
            publishedBy={data.ownerName}
          />
        )}
        {tab === 'players' && (
          <PlayersPanel
            players={data.players}
            onAddPlayer={addPlayer}
            onUpdatePlayer={updatePlayer}
            onDeletePlayer={deletePlayer}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            session={session}
            data={data}
            cloudSync={cloudSync}
            onSyncToCloud={syncToCloudNow}
            onReplaceData={replaceData}
            onSessionUpdate={onSessionUpdate}
            onLogout={logout}
          />
        )}
        {tab === 'register' && canUseRegister && <RegisterPanel session={session} />}
      </main>

      <BottomNav active={tab} tabs={visibleTabs} onChange={setTab} />
    </div>
  );
}

function App() {
  if (getRecorderParams()) {
    return <RecorderApp />;
  }
  const publicReport = getPublicGameReportParams();
  if (publicReport) {
    return <PublicGameReportApp teamCode={publicReport.team} gameId={publicReport.game} />;
  }
  const publicStats = getPublicStatsParams();
  if (publicStats) {
    return <PublicStatsApp teamCode={publicStats.team} />;
  }
  return <HostApp />;
}

export default App;
