import { useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { AtBat, AtBatResult, Game, Player } from '../types';
import { AT_BAT_RESULTS } from '../types';
import { summarizeAtBat } from '../utils/stats';
import { Button, Card, EmptyState, Select } from './ui';

const RESULT_COLORS: Record<string, string> = {
  '1B': 'bg-green-100 text-green-800 border-green-300',
  '2B': 'bg-green-200 text-green-900 border-green-400',
  '3B': 'bg-green-300 text-green-900 border-green-500',
  HR: 'bg-yellow-100 text-yellow-900 border-yellow-400',
  BB: 'bg-blue-100 text-blue-800 border-blue-300',
  HBP: 'bg-blue-100 text-blue-800 border-blue-300',
  SO: 'bg-red-100 text-red-800 border-red-300',
  FO: 'bg-gray-100 text-gray-700 border-gray-300',
  GO: 'bg-gray-100 text-gray-700 border-gray-300',
  IF: 'bg-gray-100 text-gray-700 border-gray-300',
  SF: 'bg-orange-100 text-orange-800 border-orange-300',
  FC: 'bg-purple-100 text-purple-800 border-purple-300',
  E: 'bg-pink-100 text-pink-800 border-pink-300',
};

interface Props {
  games: Game[];
  players: Player[];
  activeGame: Game | null;
  onSelectGame: (game: Game | null) => void;
  onUpdateGame: (game: Game) => void;
}

export function RecordPanel({
  games,
  players,
  activeGame,
  onSelectGame,
  onUpdateGame,
}: Props) {
  const [selectedPlayer, setSelectedPlayer] = useState(players[0]?.id ?? '');
  const [showRbiPicker, setShowRbiPicker] = useState(false);
  const [pendingResult, setPendingResult] = useState<AtBatResult | null>(null);

  const recentGames = [...games]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);

  const handleResultClick = (result: AtBatResult) => {
    if (!activeGame || !selectedPlayer) return;
    const needsRbi = ['1B', '2B', '3B', 'HR', 'SF'].includes(result);
    if (needsRbi) {
      setPendingResult(result);
      setShowRbiPicker(true);
      return;
    }
    addAtBat(result, 0);
  };

  const addAtBat = (result: AtBatResult, rbiCount: number) => {
    if (!activeGame || !selectedPlayer) return;
    const atBat: AtBat = {
      id: uuid(),
      playerId: selectedPlayer,
      result,
      rbi: rbiCount,
    };
    onUpdateGame({
      ...activeGame,
      atBats: [...activeGame.atBats, atBat],
    });
    setShowRbiPicker(false);
    setPendingResult(null);
  };

  const undoLast = () => {
    if (!activeGame || activeGame.atBats.length === 0) return;
    onUpdateGame({
      ...activeGame,
      atBats: activeGame.atBats.slice(0, -1),
    });
  };

  const removeAtBat = (atBatId: string) => {
    if (!activeGame) return;
    onUpdateGame({
      ...activeGame,
      atBats: activeGame.atBats.filter((a) => a.id !== atBatId),
    });
  };

  if (!activeGame) {
    return (
      <div className="p-4">
        <EmptyState
          icon="✏️"
          title="選擇比賽開始紀錄"
          description="選擇一場比賽進入打擊紀錄"
        />
        {recentGames.length > 0 && (
          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-medium text-gray-500 px-1">最近比賽</h3>
            {recentGames.map((game) => (
              <Card key={game.id}>
                <button
                  onClick={() => onSelectGame(game)}
                  className="w-full text-left"
                >
                  <div className="font-semibold">{game.opponent}</div>
                  <div className="text-sm text-gray-500">
                    {game.date} · {game.atBats.length} 打席
                  </div>
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (players.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon="👥" title="尚無球員" description="請先到「球員」頁面新增球員" />
        <Button variant="secondary" onClick={() => onSelectGame(null)} className="w-full mt-4">
          返回
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg">{activeGame.opponent}</h2>
          <p className="text-sm text-gray-500">{activeGame.date}</p>
        </div>
        <Button variant="secondary" onClick={() => onSelectGame(null)} className="!py-2 !px-3 text-sm">
          換場
        </Button>
      </div>

      <Select
        label="打者"
        value={selectedPlayer}
        onChange={(e) => setSelectedPlayer(e.target.value)}
        options={players.map((p) => ({
          value: p.id,
          label: p.number ? `#${p.number} ${p.name}` : p.name,
        }))}
      />

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">打席結果</h3>
        <div className="grid grid-cols-3 gap-2">
          {AT_BAT_RESULTS.map((r) => (
            <button
              key={r.value}
              onClick={() => handleResultClick(r.value)}
              className={`btn-result border-2 ${RESULT_COLORS[r.value]}`}
            >
              <span className="text-lg">{r.short}</span>
              <span className="text-xs block mt-0.5 opacity-75">{r.label}</span>
            </button>
          ))}
        </div>
      </div>

      {showRbiPicker && pendingResult && (
        <Card className="space-y-3 border-2 border-field-green">
          <p className="font-medium text-center">打點數？</p>
          <div className="grid grid-cols-5 gap-2">
            {[0, 1, 2, 3, 4].map((n) => (
              <button
                key={n}
                onClick={() => addAtBat(pendingResult, n)}
                className="btn-result bg-field-green text-white border-field-green"
              >
                {n}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => setShowRbiPicker(false)} className="w-full">
            取消
          </Button>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="secondary" onClick={undoLast} className="flex-1" disabled={activeGame.atBats.length === 0}>
          復原上一筆
        </Button>
      </div>

      <div>
        <h3 className="text-sm font-medium text-gray-500 mb-2">
          本場紀錄 ({activeGame.atBats.length})
        </h3>
        {activeGame.atBats.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">尚無打席紀錄</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {[...activeGame.atBats].reverse().map((atBat, idx) => {
              const player = players.find((p) => p.id === atBat.playerId);
              return (
                <div
                  key={atBat.id}
                  className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="text-gray-400 mr-2">#{activeGame.atBats.length - idx}</span>
                    {summarizeAtBat(atBat, player?.name ?? '?')}
                  </div>
                  <button
                    onClick={() => removeAtBat(atBat.id)}
                    className="text-red-400 text-xs px-2"
                  >
                    刪
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
