import { useState } from 'react';
import type { Game, Player, Season } from '../types';
import {
  calculateAllPitcherStats,
  calculateAllStats,
  formatAvg,
  formatEra,
  formatWobaPlus,
  getTeamAvgWoba,
  getWobaPlusTone,
} from '../utils/stats';
import { PitcherStatsSheet } from './PitcherStatsSheet';
import { PlayerStatsSheet } from './PlayerStatsSheet';
import { TeamRecordSection } from './TeamRecordSection';
import { Card, EmptyState, Select } from './ui';

interface Props {
  players: Player[];
  seasons: Season[];
  games: Game[];
  hasBottomNav?: boolean;
}

export function StatsView({ players, seasons, games, hasBottomNav = true }: Props) {
  const [statType, setStatType] = useState<'batting' | 'pitching' | 'team'>('batting');
  const [view, setView] = useState<'season' | 'total'>('season');
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedPitcher, setSelectedPitcher] = useState<string | null>(null);

  const seasonFilter = view === 'season' ? seasonId : undefined;

  const battingStats = calculateAllStats(players, games, seasonFilter);
  const pitcherStats = calculateAllPitcherStats(players, games, seasonFilter);

  const playerStats = selectedPlayer
    ? battingStats.find((s) => s.playerId === selectedPlayer) ?? null
    : null;
  const pitcherDetail = selectedPitcher
    ? pitcherStats.find((s) => s.playerId === selectedPitcher) ?? null
    : null;
  const teamAvgWoba = getTeamAvgWoba(battingStats);

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
          onClick={() => setStatType('batting')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            statType === 'batting' ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          打擊
        </button>
        <button
          type="button"
          onClick={() => setStatType('pitching')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            statType === 'pitching' ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          投手
        </button>
        <button
          type="button"
          onClick={() => setStatType('team')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            statType === 'team' ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          球隊戰績
        </button>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setView('season')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            view === 'season' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          賽季成績
        </button>
        <button
          type="button"
          onClick={() => setView('total')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            view === 'total' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
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

      {statType === 'batting' && (
        <>
          {battingStats.length === 0 ? (
            <EmptyState icon="📊" title="尚無打擊資料" description="紀錄打席後即可查看統計" />
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">打擊成績（點擊查看詳細）</h3>
              {battingStats.map((s) => {
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
        </>
      )}

      {statType === 'team' && (
        <TeamRecordSection games={games} seasons={seasons} view={view} seasonId={seasonId} />
      )}

      {statType === 'pitching' && (
        <>
          {pitcherStats.length === 0 ? (
            <EmptyState
              icon="⚾"
              title="尚無投手資料"
              description="請在守位指派投手 P，並於對方得分時輸入失分"
            />
          ) : (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-500">投手成績（點擊查看詳細）</h3>
              {pitcherStats.map((s) => (
                <Card key={s.playerId} className="border-sky-100">
                  <button
                    type="button"
                    onClick={() => setSelectedPitcher(s.playerId)}
                    className="w-full text-left active:opacity-70"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-semibold">{s.playerName}</span>
                      <span className="text-sky-800 font-bold text-sm">
                        ERA {formatEra(s.era)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 grid grid-cols-4 gap-1">
                      <span>{s.games}場</span>
                      <span>{s.runsAllowed}失分</span>
                      <span>{s.halfInnings}半局</span>
                      <span>場均 {s.runsPerGame.toFixed(2)}</span>
                    </div>
                  </button>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {playerStats && (
        <PlayerStatsSheet
          stats={playerStats}
          teamAvgWoba={teamAvgWoba}
          hasBottomNav={hasBottomNav}
          onClose={() => setSelectedPlayer(null)}
        />
      )}

      {pitcherDetail && (
        <PitcherStatsSheet
          stats={pitcherDetail}
          games={games}
          seasonId={seasonFilter}
          hasBottomNav={hasBottomNav}
          onClose={() => setSelectedPitcher(null)}
        />
      )}
    </>
  );
}
