import { useState } from 'react';
import type { Game, TabId } from './types';
import { useAppData } from './hooks/useAppData';
import { BottomNav } from './components/BottomNav';
import { Onboarding } from './components/Onboarding';
import { GamesPanel } from './components/GamesPanel';
import { RecordPanel } from './components/RecordPanel';
import { StatsPanel } from './components/StatsPanel';
import { PlayersPanel } from './components/PlayersPanel';
import { SettingsPanel } from './components/SettingsPanel';

function App() {
  const {
    data,
    loading,
    initOwner,
    replaceData,
    addSeason,
    addPlayer,
    addGame,
    updateGame,
    deleteGame,
    deletePlayer,
  } = useAppData();

  const [tab, setTab] = useState<TabId>('record');
  const [activeGame, setActiveGame] = useState<Game | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-field-green text-lg">載入中...</div>
      </div>
    );
  }

  if (!data) {
    return <Onboarding onComplete={initOwner} />;
  }

  const handleSelectGame = (game: Game | null) => {
    setActiveGame(game);
    if (game) setTab('record');
  };

  const handleUpdateGame = (game: Game) => {
    updateGame(game);
    setActiveGame(game);
  };

  const handleResetOwner = () => {
    window.location.reload();
  };

  const TITLES: Record<TabId, string> = {
    record: activeGame ? `紀錄 · ${activeGame.opponent}` : '打擊紀錄',
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
            <h1 className="text-lg font-bold">⚾ 壘球賽紀錄器</h1>
            <p className="text-xs text-green-200">{data.ownerName}</p>
          </div>
          <div className="text-xs text-green-200 text-right">
            <div>{TITLES[tab]}</div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {tab === 'record' && (
          <RecordPanel
            games={data.games}
            players={data.players}
            activeGame={activeGame}
            onSelectGame={handleSelectGame}
            onUpdateGame={handleUpdateGame}
          />
        )}
        {tab === 'games' && (
          <GamesPanel
            seasons={data.seasons}
            games={data.games}
            onAddSeason={addSeason}
            onAddGame={addGame}
            onSelectGame={handleSelectGame}
            onDeleteGame={deleteGame}
          />
        )}
        {tab === 'stats' && (
          <StatsPanel
            players={data.players}
            seasons={data.seasons}
            games={data.games}
          />
        )}
        {tab === 'players' && (
          <PlayersPanel
            players={data.players}
            onAddPlayer={addPlayer}
            onDeletePlayer={deletePlayer}
          />
        )}
        {tab === 'settings' && (
          <SettingsPanel
            data={data}
            onReplaceData={replaceData}
            onResetOwner={handleResetOwner}
          />
        )}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;
