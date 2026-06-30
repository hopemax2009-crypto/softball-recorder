import type { Game } from '../types';

/** 比對 UI 是否需要因遠端同步而重繪（忽略 syncUpdatedAt 等時間戳） */
export function isSameGameView(local: Game | null, incoming: Game): boolean {
  if (!local || local.id !== incoming.id) return false;
  if (local.currentInning !== incoming.currentInning || local.currentHalf !== incoming.currentHalf) {
    return false;
  }
  if (local.atBats.length !== incoming.atBats.length) return false;

  const locLast = local.atBats[local.atBats.length - 1];
  const incLast = incoming.atBats[incoming.atBats.length - 1];
  if (locLast?.id !== incLast?.id) return false;
  if (locLast && incLast) {
    if (locLast.rbi !== incLast.rbi || locLast.outs !== incLast.outs || locLast.result !== incLast.result) {
      return false;
    }
  }

  const locScores = local.opponentScores ?? [];
  const incScores = incoming.opponentScores ?? [];
  if (locScores.length !== incScores.length) return false;
  for (let i = 0; i < locScores.length; i++) {
    if (locScores[i].runs !== incScores[i].runs) return false;
  }

  return true;
}

/** 比賽紀錄資料（打席、先發、對方得分）是否相同；用於已完成比賽僅允許換局瀏覽 */
export function isGameRecordDataEqual(a: Game, b: Game): boolean {
  if (a.atBats.length !== b.atBats.length) return false;
  if (a.lineup.length !== b.lineup.length) return false;
  const aScores = a.opponentScores ?? [];
  const bScores = b.opponentScores ?? [];
  if (aScores.length !== bScores.length) return false;
  for (let i = 0; i < aScores.length; i++) {
    if (aScores[i].inning !== bScores[i].inning || aScores[i].half !== bScores[i].half) return false;
    if (aScores[i].runs !== bScores[i].runs) return false;
  }
  for (let i = 0; i < a.atBats.length; i++) {
    const x = a.atBats[i];
    const y = b.atBats[i];
    if (x.id !== y.id || x.rbi !== y.rbi || x.outs !== y.outs || x.result !== y.result) return false;
  }
  for (const x of a.lineup) {
    const y = b.lineup.find((l) => l.playerId === x.playerId);
    if (!y) return false;
    if (x.battingOrder !== y.battingOrder || x.position !== y.position || x.isActive !== y.isActive) {
      return false;
    }
  }
  return true;
}
