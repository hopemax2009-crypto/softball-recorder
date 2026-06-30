import { useState } from 'react';
import type { Game, HalfInning } from '../types';
import {
  getAtBatsForHalf,
  getHalfInningStats,
  getInningLabel,
  getOpponentScore,
  getTeamTotals,
  setOpponentScore,
} from '../utils/gameLogic';
import { Card } from './ui';

interface Props {
  game: Game;
  onUpdate: (game: Game) => void;
  onSelectHalf: (inning: number, half: HalfInning) => void;
  readOnlyOpponent?: boolean;
}

export function Scoreboard({ game, onUpdate, onSelectHalf, readOnlyOpponent }: Props) {
  const [editing, setEditing] = useState<{ inning: number; half: HalfInning } | null>(null);
  const [inputRuns, setInputRuns] = useState('0');

  const totals = getTeamTotals(game);
  const maxInning = Math.max(
    game.totalInnings,
    ...game.atBats.map((a) => a.inning),
    ...game.opponentScores.map((s) => s.inning),
    1
  );
  const innings = Array.from({ length: maxInning }, (_, i) => i + 1);

  const ourHalf = (): HalfInning => (game.isHomeTeam ? 'bottom' : 'top');
  const oppHalf = (): HalfInning => (game.isHomeTeam ? 'top' : 'bottom');

  const handleOurClick = (inning: number) => {
    const half = ourHalf();
    onSelectHalf(inning, half);
  };

  const handleOppClick = (inning: number) => {
    const half = oppHalf();
    onSelectHalf(inning, half);
    if (readOnlyOpponent) return;
    const existing = getOpponentScore(game.opponentScores, inning, half);
    setInputRuns(String(existing ?? 0));
    setEditing({ inning, half });
  };

  const saveOpponentScore = () => {
    if (!editing) return;
    const runs = Math.max(0, parseInt(inputRuns, 10) || 0);
    onUpdate({
      ...game,
      opponentScores: setOpponentScore(game.opponentScores, editing.inning, editing.half, runs),
    });
    setEditing(null);
  };

  const isActiveCell = (inning: number, half: HalfInning) =>
    game.currentInning === inning && game.currentHalf === half;

  const renderOurCell = (inning: number) => {
    const half = ourHalf();
    const stats = getHalfInningStats(game, inning, half);
    const atBats = getAtBatsForHalf(game, inning, half);
    const hasData = atBats.length > 0;
    return (
      <button
        key={inning}
        onClick={() => handleOurClick(inning)}
        className={`py-1.5 rounded-lg w-full ${
          isActiveCell(inning, half) ? 'bg-green-100 font-bold ring-1 ring-field-green' : 'hover:bg-gray-50'
        }`}
      >
        <div>{hasData ? stats.runs : ''}</div>
        {hasData && <div className="text-[9px] text-gray-400">{stats.outs}出局</div>}
      </button>
    );
  };

  const renderOppCell = (inning: number) => {
    const half = oppHalf();
    const score = getOpponentScore(game.opponentScores, inning, half);
    return (
      <button
        key={inning}
        onClick={() => handleOppClick(inning)}
        className={`py-1.5 rounded-lg w-full text-orange-700 ${
          isActiveCell(inning, half) ? 'bg-orange-50 font-bold ring-1 ring-orange-300' : 'hover:bg-gray-50'
        }`}
      >
        {score !== null ? score : '·'}
      </button>
    );
  };

  return (
    <Card className="!p-3 overflow-x-auto">
      <div className="flex justify-between items-center mb-2 text-sm">
        <span className="font-bold text-field-green">我方 {totals.us}</span>
        <span className="text-gray-500 text-xs">
          {game.isHomeTeam ? '後攻' : '先攻'}
        </span>
        <span className="font-bold text-gray-700">{totals.opponent} 對方</span>
      </div>
      <table className="w-full text-center text-xs min-w-[260px]">
        <thead>
          <tr className="text-gray-500">
            <th className="py-1 w-10">隊</th>
            {innings.map((i) => (
              <th key={i} className="py-1 w-9">{i}</th>
            ))}
            <th className="py-1 w-8">R</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td className="font-medium text-field-green py-1 text-[10px]">我方</td>
            {innings.map((i) => (
              <td key={i} className="p-0.5">{renderOurCell(i)}</td>
            ))}
            <td className="font-bold text-field-green">{totals.us}</td>
          </tr>
          <tr>
            <td className="font-medium text-gray-600 py-1 text-[10px]">對方</td>
            {innings.map((i) => (
              <td key={i} className="p-0.5">{renderOppCell(i)}</td>
            ))}
            <td className="font-bold">{totals.opponent}</td>
          </tr>
        </tbody>
      </table>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        我方：打點加總與出局數自動計算 · 對方：點擊輸入得分
      </p>

      {editing && (
        <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
          <p className="text-sm font-medium text-center mb-2">
            {getInningLabel(editing.inning, editing.half)} 對方得分
          </p>
          <div className="flex gap-2 items-center justify-center">
            <input
              type="number"
              min={0}
              max={99}
              value={inputRuns}
              onChange={(e) => setInputRuns(e.target.value)}
              className="input w-20 text-center"
            />
            <button onClick={saveOpponentScore} className="btn-primary !py-2 !px-4 text-sm">儲存</button>
            <button onClick={() => setEditing(null)} className="btn-secondary !py-2 !px-4 text-sm">取消</button>
          </div>
        </div>
      )}
    </Card>
  );
}
