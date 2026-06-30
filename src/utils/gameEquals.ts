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
