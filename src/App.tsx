import { useCallback, useMemo, useRef, useState } from 'react';
import type { Game, Player, TabId } from './types';
import { isSameGameView } from './utils/gameEquals';
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
import { PlayersPanel } from './components/PlayersPanel';
import { SettingsPanel } from './components/SettingsPanel';

function HostApp() {
  const {
    session,
    data,
    loading,
    onAuth,
    logout,
    cloudSync,
    syncToCloudNow,
    replaceData,
    addSeason,
    addPlayer,
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
    !!activeGame?.liveRoomId && !!hostRoom,
    getLocalGame
  );

  const handleSelectGame = (game: Game | null) => {
    activeGameRef.current = game;
    setActiveGame(game);
    if (game) setTab('record');
  };

  const handleUpdateGame = useCallback(
    (game: Game) => {
      activeGameRef.current = game;
      setActiveGame(game);
      updateGame(game);
      if (game.liveRoomId) {
        schedulePush(game);
      }
    },
    [updateGame, schedulePush]
  );

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
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-field-green text-white px-4 py-3 shadow-md">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">⚾ 主控端</h1>
            <p className="text-xs text-green-200">{session.displayName}</p>
          </div>
          <div className="text-xs text-green-200 text-right">
            <div>{TITLES[tab]}</div>
            {activeGame?.liveRoomId && (
              <div className="text-[10px] opacity-80">
                {syncState.syncing ? '同步中...' : syncState.connected ? '即時連線' : '連線中'}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {tab === 'record' && (
          <RecordPanel
            games={data.games}
            players={data.players}
            activeGame={activeGame}
            syncState={activeGame?.liveRoomId ? syncState : null}
            onSyncNow={pushNow}
            onSelectGame={handleSelectGame}
            onUpdateGame={handleUpdateGame}
            hasBottomNav
          />
        )}
        {tab === 'games' && (
          <GamesPanel
            seasons={data.seasons}
            games={data.games}
            players={data.players}
            ownerName={session.displayName}
            onAddSeason={addSeason}
            onAddGame={addGame}
            onSelectGame={handleSelectGame}
            onDeleteGame={deleteGame}
            onUpsertGame={upsertGame}
          />
        )}
        {tab === 'stats' && (
          <StatsPanel players={data.players} seasons={data.seasons} games={data.games} />
        )}
        {tab === 'players' && (
          <PlayersPanel players={data.players} onAddPlayer={addPlayer} onDeletePlayer={deletePlayer} />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            data={data}
            cloudSync={cloudSync}
            onSyncToCloud={syncToCloudNow}
            onReplaceData={replaceData}
            onLogout={logout}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

function App() {
  if (getRecorderParams()) {
    return <RecorderApp />;
  }
  return <HostApp />;
}

export default App;
