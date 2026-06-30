import { useState } from 'react';
import type { Game, Player, Season } from '../types';
import { calculateAllStats, formatAvg, formatWobaPlus, getTeamAvgWoba, getWobaPlusTone } from '../utils/stats';
import { PlayerStatsSheet } from './PlayerStatsSheet';
import { Card, EmptyState, Select } from './ui';

interface Props {
  players: Player[];
  seasons: Season[];
  games: Game[];
  hasBottomNav?: boolean;
}

export function StatsView({ players, seasons, games, hasBottomNav = true }: Props) {
  const [view, setView] = useState<'season' | 'total'>('season');
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const stats = calculateAllStats(
    players,
    games,
    view === 'season' ? seasonId : undefined
  );

  const playerStats = selectedPlayer
    ? stats.find((s) => s.playerId === selectedPlayer) ?? null
    : null;
  const teamAvgWoba = getTeamAvgWoba(stats);

  if (players.length === 0) {
    return (
      <EmptyState icon="📊" title="尚無統計資料" description="請先新增球員並紀錄打席" />
    );
  }

  return (
    <>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('season')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            view === 'season' ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          賽季成績
        </button>
        <button
          type="button"
          onClick={() => setView('total')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            view === 'total' ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          累計成績
        </button>
      </div>

      {view === 'season' && seasons.length > 0 && (
        <Select
          label="選擇賽季"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
          options={seasons.map((s) => ({ value: s.id, label: `${s.year} ${s.name}` }))}
        />
      )}

      {view === 'season' && seasons.length === 0 && (
        <EmptyState icon="🏟️" title="尚無賽季" description="此範圍內沒有賽季資料" />
      )}

      {stats.length === 0 ? (
        <EmptyState icon="📊" title="尚無打擊資料" description="紀錄打席後即可查看統計" />
      ) : (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-gray-500">球員列表（點擊查看詳細）</h3>
          {stats.map((s) => {
            const plusTone = getWobaPlusTone(s.wobaPlus);
            return (
              <Card key={s.playerId}>
                <button
                  type="button"
                  onClick={() => setSelectedPlayer(s.playerId)}
                  className="w-full text-left active:opacity-70"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="font-semibold">{s.playerName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-violet-700 font-bold text-sm">{formatAvg(s.woba)}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${plusTone.bg} ${plusTone.value}`}>
                        {formatWobaPlus(s.wobaPlus)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 grid grid-cols-4 gap-1">
                    <span>{s.games}場</span>
                    <span>{s.ab}打數</span>
                    <span>{s.h}安打</span>
                    <span>AVG {formatAvg(s.avg)}</span>
                  </div>
                </button>
              </Card>
            );
          })}
        </div>
      )}

      {playerStats && (
        <PlayerStatsSheet
          stats={playerStats}
          teamAvgWoba={teamAvgWoba}
          hasBottomNav={hasBottomNav}
          onClose={() => setSelectedPlayer(null)}
        />
      )}
    </>
  );
}
