import type { Game, Player } from '../types';
import { buildGameBoxScore, type GameBattingLine } from '../utils/gameBoxScore';
import { getResultLabel } from '../utils/stats';
import { Card } from './ui';

interface Props {
  game: Game;
  players: Player[];
  teamName: string;
  seasonName?: string;
}

function outcomeBadge(outcome: ReturnType<typeof buildGameBoxScore>['outcome']) {
  if (outcome === 'win') {
    return <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">勝</span>;
  }
  if (outcome === 'loss') {
    return <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">負</span>;
  }
  if (outcome === 'tie') {
    return <span className="text-xs font-bold bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">和</span>;
  }
  return null;
}

function formatExtraHits(line: GameBattingLine): string {
  const parts: string[] = [];
  if (line.doubles > 0) parts.push(`${line.doubles}二`);
  if (line.triples > 0) parts.push(`${line.triples}三`);
  if (line.hr > 0) parts.push(`${line.hr}全`);
  return parts.join(' ');
}

export function GameBoxScoreView({ game, players, teamName, seasonName }: Props) {
  const box = buildGameBoxScore(game, players);

  const sortedAtBats = [...game.atBats].sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning;
    if (a.half !== b.half) return a.half === 'top' ? -1 : 1;
    return (a.updatedAt ?? '').localeCompare(b.updatedAt ?? '');
  });

  const playerNameById = (id: string) =>
    players.find((p) => p.id === id)?.name ??
    game.rosterSnapshot?.find((s) => s.id === id)?.name ??
    '未知';

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-field-green/10 to-green-50 border-green-200 text-center py-4">
        <p className="text-xs text-gray-500 mb-1">最終比分</p>
        <p className="text-2xl font-bold text-gray-900">
          {teamName} <span className="text-field-green">{box.totals.us}</span>
          {' '}:{' '}
          <span className="text-red-600">{box.totals.opponent}</span> {game.opponent}
        </p>
        <div className="flex items-center justify-center gap-2 mt-1 flex-wrap">
          {outcomeBadge(box.outcome)}
          <p className="text-[10px] text-gray-400">
            {game.isHomeTeam ? '主場' : '客場'} · {game.atBats.length} 打席
          </p>
        </div>
        {(seasonName || game.location) && (
          <p className="text-[10px] text-gray-400 mt-1">
            {[seasonName, game.location].filter(Boolean).join(' · ')}
          </p>
        )}
      </Card>

      {box.inningScores.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">逐局比分</h4>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs border-collapse min-w-[280px]">
              <thead>
                <tr className="text-gray-500">
                  <th className="py-1.5 px-1 text-left font-medium sticky left-0 bg-white">隊伍</th>
                  {box.inningScores.map((cell) => (
                    <th key={cell.inning} className="py-1.5 px-1.5 text-center font-medium min-w-[1.75rem]">
                      {cell.inning}
                    </th>
                  ))}
                  <th className="py-1.5 px-1.5 text-center font-bold text-gray-700">R</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-gray-100">
                  <td className="py-1.5 px-1 font-medium text-gray-800 sticky left-0 bg-white truncate max-w-[4rem]" title={teamName}>
                    {teamName}
                  </td>
                  {box.inningScores.map((cell) => (
                    <td key={cell.inning} className="py-1.5 px-1.5 text-center text-gray-800">
                      {cell.ourRuns ?? '—'}
                    </td>
                  ))}
                  <td className="py-1.5 px-1.5 text-center font-bold text-field-green">{box.totals.us}</td>
                </tr>
                <tr className="border-t border-gray-100">
                  <td className="py-1.5 px-1 font-medium text-gray-800 sticky left-0 bg-white truncate max-w-[4rem]" title={game.opponent}>
                    {game.opponent}
                  </td>
                  {box.inningScores.map((cell) => (
                    <td key={cell.inning} className="py-1.5 px-1.5 text-center text-gray-800">
                      {cell.oppRuns ?? '—'}
                    </td>
                  ))}
                  <td className="py-1.5 px-1.5 text-center font-bold text-red-600">{box.totals.opponent}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {box.battingLines.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">打擊成績</h4>
          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full text-xs border-collapse min-w-[320px]">
              <thead>
                <tr className="text-gray-500 border-b border-gray-100">
                  <th className="py-2 px-1 text-left font-medium sticky left-0 bg-white">球員</th>
                  <th className="py-2 px-1 text-center font-medium">AB</th>
                  <th className="py-2 px-1 text-center font-medium">H</th>
                  <th className="py-2 px-1 text-center font-medium">RBI</th>
                  <th className="py-2 px-1 text-center font-medium">BB</th>
                  <th className="py-2 px-1 text-center font-medium">SO</th>
                  <th className="py-2 px-1 text-left font-medium">長打</th>
                </tr>
              </thead>
              <tbody>
                {box.battingLines.map((line) => (
                  <tr key={line.playerId} className="border-b border-gray-50">
                    <td className="py-2 px-1 sticky left-0 bg-white">
                      <span className="font-medium text-gray-900">
                        {line.order != null && (
                          <span className="text-gray-400 mr-1">{line.order}</span>
                        )}
                        {line.number && (
                          <span className="text-field-green mr-1">#{line.number}</span>
                        )}
                        {line.playerName}
                      </span>
                    </td>
                    <td className="py-2 px-1 text-center">{line.ab}</td>
                    <td className="py-2 px-1 text-center font-medium">{line.h}</td>
                    <td className="py-2 px-1 text-center">{line.rbi}</td>
                    <td className="py-2 px-1 text-center">{line.bb}</td>
                    <td className="py-2 px-1 text-center">{line.so}</td>
                    <td className="py-2 px-1 text-gray-500">{formatExtraHits(line) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {box.pitcherLines.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">投手失分</h4>
          <div className="space-y-2">
            {box.pitcherLines.map((line) => (
              <div
                key={line.playerId}
                className="flex justify-between items-center text-sm bg-sky-50 rounded-xl px-3 py-2.5 border border-sky-100"
              >
                <span className="font-medium">{line.playerName}</span>
                <span className="text-sky-800 text-xs">
                  <span className="font-bold">{line.runsAllowed}</span> 失分 · {line.halfInnings} 半局
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {sortedAtBats.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">打席紀錄</h4>
          <div className="space-y-1.5">
            {sortedAtBats.map((atBat) => (
              <div
                key={atBat.id}
                className="flex items-start gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2"
              >
                <span className="text-gray-400 shrink-0 w-12">
                  {atBat.inning}{atBat.half === 'top' ? '上' : '下'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">
                    {playerNameById(atBat.playerId)} · {getResultLabel(atBat.result)}
                    {atBat.rbi > 0 && (
                      <span className="text-field-green font-medium ml-1">{atBat.rbi} RBI</span>
                    )}
                  </p>
                  {atBat.outs > 0 && atBat.outs !== 1 && (
                    <p className="text-gray-400">{atBat.outs} 出局</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {box.battingLines.length === 0 && box.pitcherLines.length === 0 && sortedAtBats.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-4">此場尚無打席或得分紀錄</p>
      )}
    </div>
  );
}
