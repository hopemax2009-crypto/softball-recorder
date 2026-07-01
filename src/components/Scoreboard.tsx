import { useEffect, useRef, useState } from 'react';
import type { Game, HalfInning, Player } from '../types';
import {
  addOpponentRun,
  getAtBatsForHalf,
  getCurrentPitcherId,
  getHalfInningStats,
  getInningLabel,
  getNextHalf,
  getOpponentScore,
  getOpponentScoreEntry,
  getTeamTotals,
  isHalfComplete,
  isOurBattingHalf,
  removeOpponentRun,
  setOpponentScoreWithPitcher,
} from '../utils/gameLogic';
import { Card } from './ui';

interface Props {
  game: Game;
  players?: Player[];
  onUpdate: (game: Game) => void;
  onSelectHalf: (inning: number, half: HalfInning) => void;
  readOnlyOpponent?: boolean;
  readOnly?: boolean;
  ourTeamName?: string;
  opponentName?: string;
}

function TeamLabel({ name, className = '' }: { name: string; className?: string }) {
  return (
    <span className={`block truncate max-w-[4.5rem] mx-auto ${className}`} title={name}>
      {name}
    </span>
  );
}

export function Scoreboard({
  game,
  players = [],
  onUpdate,
  onSelectHalf,
  readOnlyOpponent,
  readOnly,
  ourTeamName = '我方',
  opponentName,
}: Props) {
  const oppName = opponentName ?? game.opponent ?? '對方';
  const noScoreEdit = readOnly || readOnlyOpponent;
  const [editing, setEditing] = useState<{ inning: number; half: HalfInning } | null>(null);
  const [inputRuns, setInputRuns] = useState('0');
  const prevPositionRef = useRef<{ inning: number; half: HalfInning } | null>(null);

  const opponentScores = game.opponentScores ?? [];
  const totals = getTeamTotals(game);
  const maxInning = Math.max(
    game.totalInnings,
    ...game.atBats.map((a) => a.inning),
    ...opponentScores.map((s) => s.inning),
    1
  );
  const innings = Array.from({ length: maxInning }, (_, i) => i + 1);

  const ourHalf = (): HalfInning => (game.isHomeTeam ? 'bottom' : 'top');
  const oppHalf = (): HalfInning => (game.isHomeTeam ? 'top' : 'bottom');

  const isOpponentHalf = (inning: number, half: HalfInning) =>
    !isOurBattingHalf(game, inning, half);

  /** 換至對方進攻半局時，自動開啟得分 +/- 面板 */
  useEffect(() => {
    if (noScoreEdit) {
      setEditing(null);
      return;
    }
    const { currentInning, currentHalf } = game;
    const prev = prevPositionRef.current;
    const positionChanged =
      !prev || prev.inning !== currentInning || prev.half !== currentHalf;
    prevPositionRef.current = { inning: currentInning, half: currentHalf };

    if (isOpponentHalf(currentInning, currentHalf)) {
      if (positionChanged) {
        const existing = getOpponentScore(opponentScores, currentInning, currentHalf);
        setInputRuns(String(existing ?? 0));
        setEditing({ inning: currentInning, half: currentHalf });
      }
    } else if (positionChanged) {
      setEditing(null);
    }
  }, [game.currentInning, game.currentHalf, game.isHomeTeam, noScoreEdit, opponentScores]);

  const handleOurClick = (inning: number) => {
    const half = ourHalf();
    if (!readOnly && isHalfComplete(game, inning, half)) return;
    onSelectHalf(inning, half);
  };

  const openOppEditor = (inning: number) => {
    const half = oppHalf();
    onSelectHalf(inning, half);
    if (noScoreEdit) return;
    const existing = getOpponentScore(opponentScores, inning, half);
    setInputRuns(String(existing ?? 0));
    setEditing({ inning, half });
  };

  const saveOpponentRuns = (inning: number, half: HalfInning, runs: number) => {
    const now = new Date().toISOString();
    onUpdate({
      ...game,
      opponentScores: setOpponentScoreWithPitcher(
        opponentScores,
        inning,
        half,
        runs,
        getCurrentPitcherId(game)
      ),
      syncUpdatedAt: now,
    });
  };

  const adjustOpponentScore = (delta: number) => {
    if (!editing) return;
    const now = new Date().toISOString();
    const pitcherId = getCurrentPitcherId(game);
    const nextScores =
      delta > 0
        ? addOpponentRun(opponentScores, editing.inning, editing.half, pitcherId)
        : removeOpponentRun(opponentScores, editing.inning, editing.half);
    const runs = getOpponentScore(nextScores, editing.inning, editing.half) ?? 0;
    setInputRuns(String(runs));
    onUpdate({
      ...game,
      opponentScores: nextScores,
      syncUpdatedAt: now,
    });
  };

  const finishOpponentScore = () => {
    if (!editing || noScoreEdit) return;
    const runs = Math.max(0, parseInt(inputRuns, 10) || 0);
    const now = new Date().toISOString();
    const next = getNextHalf(editing.inning, editing.half);
    onUpdate({
      ...game,
      opponentScores: setOpponentScoreWithPitcher(
        opponentScores,
        editing.inning,
        editing.half,
        runs,
        getCurrentPitcherId(game)
      ),
      currentInning: next.inning,
      currentHalf: next.half,
      syncUpdatedAt: now,
    });
    setEditing(null);
  };

  const currentPitcherId = getCurrentPitcherId(game);
  const currentPitcher = currentPitcherId
    ? players.find((p) => p.id === currentPitcherId)
    : null;
  const editingScoreEntry = editing
    ? getOpponentScoreEntry(opponentScores, editing.inning, editing.half)
    : undefined;

  const isActiveCell = (inning: number, half: HalfInning) =>
    game.currentInning === inning && game.currentHalf === half;

  const renderOurCell = (inning: number) => {
    const half = ourHalf();
    const stats = getHalfInningStats(game, inning, half);
    const atBats = getAtBatsForHalf(game, inning, half);
    const hasData = atBats.length > 0;
    const complete = isHalfComplete(game, inning, half);
    return (
      <button
        key={inning}
        type="button"
        disabled={complete && !readOnly}
        onClick={() => handleOurClick(inning)}
        className={`py-1.5 rounded-lg w-full ${
          complete && !readOnly
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : isActiveCell(inning, half)
              ? 'bg-green-100 font-bold ring-1 ring-field-green'
              : 'hover:bg-gray-50'
        }`}
      >
        <div>{hasData ? stats.runs : ''}</div>
        {hasData && (
          <div className="text-[9px] text-gray-400">
            {stats.outs}出局{complete ? ' ✓' : ''}
          </div>
        )}
      </button>
    );
  };

  const renderOppCell = (inning: number) => {
    const half = oppHalf();
    const score = getOpponentScore(opponentScores, inning, half);
    const isEditing = editing?.inning === inning && editing?.half === half;
    return (
      <button
        key={inning}
        type="button"
        onClick={() => openOppEditor(inning)}
        className={`py-1.5 rounded-lg w-full text-orange-700 ${
          isEditing || isActiveCell(inning, half)
            ? 'bg-orange-50 font-bold ring-1 ring-orange-300'
            : 'hover:bg-gray-50'
        } ${noScoreEdit ? 'cursor-default' : ''}`}
      >
        {score !== null ? score : '·'}
      </button>
    );
  };

  return (
    <Card className="!p-3 overflow-x-auto">
      <div className="flex justify-between items-center mb-2 text-sm">
        {game.isHomeTeam ? (
          <>
            <span className="font-bold text-gray-700 truncate max-w-[30%]" title={oppName}>
              {oppName} {totals.opponent}
            </span>
            <span className="text-gray-500 text-xs shrink-0">後攻</span>
            <span className="font-bold text-field-green truncate max-w-[30%] text-right" title={ourTeamName}>
              {totals.us} {ourTeamName}
            </span>
          </>
        ) : (
          <>
            <span className="font-bold text-field-green truncate max-w-[30%]" title={ourTeamName}>
              {ourTeamName} {totals.us}
            </span>
            <span className="text-gray-500 text-xs shrink-0">先攻</span>
            <span className="font-bold text-gray-700 truncate max-w-[30%] text-right" title={oppName}>
              {totals.opponent} {oppName}
            </span>
          </>
        )}
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
          {game.isHomeTeam ? (
            <>
              <tr>
                <td className="font-medium text-gray-600 py-1 text-[10px]">
                  <TeamLabel name={oppName} />
                </td>
                {innings.map((i) => (
                  <td key={i} className="p-0.5">{renderOppCell(i)}</td>
                ))}
                <td className="font-bold">{totals.opponent}</td>
              </tr>
              <tr>
                <td className="font-medium text-field-green py-1 text-[10px]">
                  <TeamLabel name={ourTeamName} />
                </td>
                {innings.map((i) => (
                  <td key={i} className="p-0.5">{renderOurCell(i)}</td>
                ))}
                <td className="font-bold text-field-green">{totals.us}</td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className="font-medium text-field-green py-1 text-[10px]">
                  <TeamLabel name={ourTeamName} />
                </td>
                {innings.map((i) => (
                  <td key={i} className="p-0.5">{renderOurCell(i)}</td>
                ))}
                <td className="font-bold text-field-green">{totals.us}</td>
              </tr>
              <tr>
                <td className="font-medium text-gray-600 py-1 text-[10px]">
                  <TeamLabel name={oppName} />
                </td>
                {innings.map((i) => (
                  <td key={i} className="p-0.5">{renderOppCell(i)}</td>
                ))}
                <td className="font-bold">{totals.opponent}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
      <p className="text-[10px] text-gray-400 mt-2 text-center">
        {readOnly
          ? '比賽已完成 · 點擊局次可瀏覽紀錄'
          : `3出局自動換局 · ${oppName}進攻自動開啟得分面板 · 完成後跳至下一半局`}
      </p>

      {editing && !noScoreEdit && (
        <div className="mt-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
          <p className="text-sm font-medium text-center mb-1">
            {getInningLabel(editing.inning, editing.half)} {oppName}得分
          </p>
          <p className="text-xs text-center mb-3">
            目前投手：
            {currentPitcher ? (
              <span className="font-semibold text-orange-800">
                {currentPitcher.number ? `#${currentPitcher.number} ` : ''}
                {currentPitcher.name}
              </span>
            ) : (
              <span className="text-orange-600">未指派（± 得分時無法紀錄投手）</span>
            )}
          </p>
          <div className="flex gap-2 items-center justify-center mb-3">
            <button
              type="button"
              onClick={() => adjustOpponentScore(-1)}
              className="min-w-[52px] min-h-[52px] rounded-xl bg-white border-2 border-orange-300 text-orange-700 text-2xl font-bold"
            >
              −
            </button>
            <input
              type="number"
              min={0}
              max={99}
              value={inputRuns}
              onChange={(e) => setInputRuns(e.target.value)}
              className="input w-16 text-center text-lg font-bold"
            />
            <button
              type="button"
              onClick={() => adjustOpponentScore(1)}
              className="min-w-[52px] min-h-[52px] rounded-xl bg-white border-2 border-orange-300 text-orange-700 text-2xl font-bold"
            >
              +
            </button>
          </div>
          {editingScoreEntry && (editingScoreEntry.pitcherRuns?.length ?? 0) > 0 && (
            <p className="text-[10px] text-gray-500 text-center mb-3 leading-relaxed">
              失分投手：
              {editingScoreEntry.pitcherRuns!.map((run, i) => {
                const p = run.pitcherId ? players.find((pl) => pl.id === run.pitcherId) : null;
                const label = p
                  ? `${p.number ? `#${p.number}` : ''}${p.name}`.trim()
                  : '未記錄';
                return (
                  <span key={i}>
                    {i > 0 ? '、' : ''}
                    {i + 1}分→{label}
                  </span>
                );
              })}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={finishOpponentScore}
              className="btn-primary flex-1 !py-2.5 text-sm"
            >
              完成並下一局
            </button>
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="btn-secondary flex-1 !py-2.5 text-sm"
            >
              關閉
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
