import { useState } from 'react';
import type { Game, Player, Season } from '../types';
import { calculateAllStats, formatAvg } from '../utils/stats';
import { Card, EmptyState, Select, StatBox } from './ui';

interface Props {
  players: Player[];
  seasons: Season[];
  games: Game[];
}

export function StatsPanel({ players, seasons, games }: Props) {
  const [view, setView] = useState<'season' | 'total'>('season');
  const [seasonId, setSeasonId] = useState(seasons[0]?.id ?? '');
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const stats = calculateAllStats(
    players,
    games,
    view === 'season' ? seasonId : undefined
  );

  const playerStats = selectedPlayer
    ? stats.find((s) => s.playerId === selectedPlayer)
    : null;

  if (players.length === 0) {
    return (
      <div className="p-4">
        <EmptyState icon="📊" title="尚無統計資料" description="請先新增球員並紀錄打席" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <button
          onClick={() => setView('season')}
          className={`flex-1 py-2 rounded-xl font-medium text-sm transition ${
            view === 'season' ? 'bg-field-green text-white' : 'bg-gray-100 text-gray-600'
          }`}
        >
          賽季成績
        </button>
        <button
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
        <EmptyState icon="🏟️" title="尚無賽季" description="請先到比賽頁面建立賽季" />
      )}

      {stats.length === 0 ? (
        <EmptyState icon="📊" title="尚無打擊資料" description="紀錄打席後即可查看統計" />
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-500">球員列表</h3>
            {stats.map((s) => (
              <Card key={s.playerId}>
                <button
                  onClick={() =>
                    setSelectedPlayer(selectedPlayer === s.playerId ? null : s.playerId)
                  }
                  className="w-full text-left"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">{s.playerName}</span>
                    <span className="text-field-green font-bold">{formatAvg(s.avg)}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 grid grid-cols-4 gap-1">
                    <span>{s.games}場</span>
                    <span>{s.ab}打數</span>
                    <span>{s.h}安打</span>
                    <span>{s.hr}全壘</span>
                  </div>
                </button>
              </Card>
            ))}
          </div>

          {playerStats && (
            <Card className="space-y-4">
              <h3 className="font-bold text-lg text-center">{playerStats.playerName}</h3>
              <div className="grid grid-cols-4 gap-3">
                <StatBox label="打擊率" value={formatAvg(playerStats.avg)} />
                <StatBox label="上壘率" value={formatAvg(playerStats.obp)} />
                <StatBox label="長打率" value={formatAvg(playerStats.slg)} />
                <StatBox label="OPS" value={formatAvg(playerStats.ops)} />
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-sm">
                <div><span className="font-bold">{playerStats.games}</span><br /><span className="text-gray-500 text-xs">出賽</span></div>
                <div><span className="font-bold">{playerStats.ab}</span><br /><span className="text-gray-500 text-xs">打數</span></div>
                <div><span className="font-bold">{playerStats.h}</span><br /><span className="text-gray-500 text-xs">安打</span></div>
                <div><span className="font-bold">{playerStats.rbi}</span><br /><span className="text-gray-500 text-xs">打點</span></div>
                <div><span className="font-bold">{playerStats.singles}</span><br /><span className="text-gray-500 text-xs">一安</span></div>
                <div><span className="font-bold">{playerStats.doubles}</span><br /><span className="text-gray-500 text-xs">二安</span></div>
                <div><span className="font-bold">{playerStats.triples}</span><br /><span className="text-gray-500 text-xs">三安</span></div>
                <div><span className="font-bold">{playerStats.hr}</span><br /><span className="text-gray-500 text-xs">全壘</span></div>
                <div><span className="font-bold">{playerStats.bb}</span><br /><span className="text-gray-500 text-xs">保送</span></div>
                <div><span className="font-bold">{playerStats.hbp}</span><br /><span className="text-gray-500 text-xs">觸身</span></div>
                <div><span className="font-bold">{playerStats.so}</span><br /><span className="text-gray-500 text-xs">三振</span></div>
                <div><span className="font-bold">{playerStats.sf}</span><br /><span className="text-gray-500 text-xs">犧飛</span></div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
