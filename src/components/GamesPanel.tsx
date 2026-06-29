import { useState } from 'react';
import type { Game, Season } from '../types';
import { Button, Card, EmptyState, Input, Select } from './ui';

interface Props {
  seasons: Season[];
  games: Game[];
  onAddSeason: (name: string, year: number) => void;
  onAddGame: (seasonId: string, date: string, opponent: string, location?: string) => void;
  onSelectGame: (game: Game) => void;
  onDeleteGame: (gameId: string) => void;
}

export function GamesPanel({
  seasons,
  games,
  onAddSeason,
  onAddGame,
  onSelectGame,
  onDeleteGame,
}: Props) {
  const [showAddSeason, setShowAddSeason] = useState(false);
  const [showAddGame, setShowAddGame] = useState(false);
  const [seasonName, setSeasonName] = useState('');
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear());
  const [selectedSeason, setSelectedSeason] = useState(seasons[0]?.id ?? '');
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const filteredGames = games
    .filter((g) => !selectedSeason || g.seasonId === selectedSeason)
    .sort((a, b) => b.date.localeCompare(a.date));

  const handleAddSeason = () => {
    if (!seasonName.trim()) return;
    onAddSeason(seasonName.trim(), seasonYear);
    setSeasonName('');
    setShowAddSeason(false);
  };

  const handleAddGame = () => {
    if (!selectedSeason || !opponent.trim()) return;
    onAddGame(selectedSeason, date, opponent.trim(), location.trim() || undefined);
    setOpponent('');
    setLocation('');
    setShowAddGame(false);
  };

  if (seasons.length === 0) {
    return (
      <div className="p-4">
        <EmptyState
          icon="🏟️"
          title="尚無賽季"
          description="請先建立賽季，才能新增比賽"
        />
        {showAddSeason ? (
          <Card className="mt-4 space-y-3">
            <Input
              label="賽季名稱"
              placeholder="例：2025 春季聯賽"
              value={seasonName}
              onChange={(e) => setSeasonName(e.target.value)}
            />
            <Input
              label="年份"
              type="number"
              value={seasonYear}
              onChange={(e) => setSeasonYear(Number(e.target.value))}
            />
            <div className="flex gap-2">
              <Button onClick={handleAddSeason} className="flex-1">建立</Button>
              <Button variant="secondary" onClick={() => setShowAddSeason(false)} className="flex-1">取消</Button>
            </div>
          </Card>
        ) : (
          <Button onClick={() => setShowAddSeason(true)} className="w-full mt-4">
            新增賽季
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Select
          label="選擇賽季"
          value={selectedSeason}
          onChange={(e) => setSelectedSeason(e.target.value)}
          options={seasons.map((s) => ({ value: s.id, label: `${s.year} ${s.name}` }))}
          className="flex-1"
        />
      </div>

      <div className="flex gap-2">
        <Button onClick={() => setShowAddGame(true)} className="flex-1">
          新增比賽
        </Button>
        <Button variant="secondary" onClick={() => setShowAddSeason(true)} className="flex-1">
          新增賽季
        </Button>
      </div>

      {showAddSeason && (
        <Card className="space-y-3">
          <Input
            label="賽季名稱"
            placeholder="例：2025 春季聯賽"
            value={seasonName}
            onChange={(e) => setSeasonName(e.target.value)}
          />
          <Input
            label="年份"
            type="number"
            value={seasonYear}
            onChange={(e) => setSeasonYear(Number(e.target.value))}
          />
          <div className="flex gap-2">
            <Button onClick={handleAddSeason} className="flex-1">建立</Button>
            <Button variant="secondary" onClick={() => setShowAddSeason(false)} className="flex-1">取消</Button>
          </div>
        </Card>
      )}

      {showAddGame && (
        <Card className="space-y-3">
          <Input label="比賽日期" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input
            label="對手"
            placeholder="對手球隊名稱"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
          />
          <Input
            label="地點（選填）"
            placeholder="球場名稱"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleAddGame} className="flex-1">建立</Button>
            <Button variant="secondary" onClick={() => setShowAddGame(false)} className="flex-1">取消</Button>
          </div>
        </Card>
      )}

      {filteredGames.length === 0 ? (
        <EmptyState icon="📋" title="尚無比賽" description="點擊上方按鈕新增比賽" />
      ) : (
        <div className="space-y-3">
          {filteredGames.map((game) => {
            const season = seasons.find((s) => s.id === game.seasonId);
            return (
              <Card key={game.id} className="flex items-center justify-between">
                <button
                  onClick={() => onSelectGame(game)}
                  className="flex-1 text-left"
                >
                  <div className="font-semibold">{game.opponent}</div>
                  <div className="text-sm text-gray-500">
                    {game.date} · {season?.name} · {game.atBats.length} 打席
                  </div>
                </button>
                <button
                  onClick={() => {
                    if (confirm('確定刪除此比賽？')) onDeleteGame(game.id);
                  }}
                  className="text-red-400 px-2 py-1 text-sm"
                >
                  刪除
                </button>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
