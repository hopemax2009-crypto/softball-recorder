import type { AtBat, Game, HalfInning, OpponentScore } from '../types';
import { OUT_RESULTS } from '../types';

export function halfKey(inning: number, half: HalfInning): string {
  return `${inning}-${half}`;
}

export function isOurBattingHalf(game: Game, _inning: number, half: HalfInning): boolean {
  return game.isHomeTeam ? half === 'bottom' : half === 'top';
}

export function getAtBatsForHalf(game: Game, inning: number, half: HalfInning): AtBat[] {
  return game.atBats.filter((a) => a.inning === inning && a.half === half);
}

export function isOutResult(result: string): boolean {
  return OUT_RESULTS.includes(result as (typeof OUT_RESULTS)[number]);
}

export function countOuts(atBats: AtBat[]): number {
  return atBats.reduce((sum, a) => sum + Math.max(0, a.outs ?? 0), 0);
}

export function sumRbi(atBats: AtBat[]): number {
  return atBats.reduce((sum, a) => sum + a.rbi, 0);
}

export function getLastOutPlayerId(atBats: AtBat[]): string | null {
  for (let i = atBats.length - 1; i >= 0; i--) {
    if ((atBats[i].outs ?? 0) > 0) return atBats[i].playerId;
  }
  return null;
}

export function getOpponentScore(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning
): number | null {
  const found = scores.find((s) => s.inning === inning && s.half === half);
  return found ? found.runs : null;
}

export function setOpponentScore(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning,
  runs: number
): OpponentScore[] {
  const filtered = scores.filter((s) => !(s.inning === inning && s.half === half));
  return [...filtered, { inning, half, runs }];
}

export interface HalfInningStats {
  runs: number;
  outs: number;
  lastOutPlayerId: string | null;
  isOurs: boolean;
  isManual: boolean;
}

export function getHalfInningStats(
  game: Game,
  inning: number,
  half: HalfInning
): HalfInningStats {
  const isOurs = isOurBattingHalf(game, inning, half);
  if (isOurs) {
    const atBats = getAtBatsForHalf(game, inning, half);
    return {
      runs: sumRbi(atBats),
      outs: countOuts(atBats),
      lastOutPlayerId: getLastOutPlayerId(atBats),
      isOurs: true,
      isManual: false,
    };
  }
  const manual = getOpponentScore(game.opponentScores, inning, half);
  return {
    runs: manual ?? 0,
    outs: 0,
    lastOutPlayerId: null,
    isOurs: false,
    isManual: true,
  };
}

export function getTeamTotals(game: Game): { us: number; opponent: number } {
  let us = 0;
  let opponent = 0;
  const maxInning = Math.max(
    game.totalInnings,
    ...game.atBats.map((a) => a.inning),
    ...game.opponentScores.map((s) => s.inning),
    1
  );
  for (let inning = 1; inning <= maxInning; inning++) {
    for (const half of ['top', 'bottom'] as HalfInning[]) {
      const stats = getHalfInningStats(game, inning, half);
      if (stats.isOurs) {
        const atBats = getAtBatsForHalf(game, inning, half);
        if (atBats.length > 0) us += stats.runs;
      } else {
        const score = getOpponentScore(game.opponentScores, inning, half);
        if (score !== null) opponent += score;
      }
    }
  }
  return { us, opponent };
}

export function getInningLabel(inning: number, half: HalfInning): string {
  return half === 'top' ? `${inning}局上` : `${inning}局下`;
}

export function getNextHalf(inning: number, half: HalfInning): { inning: number; half: HalfInning } {
  if (half === 'top') return { inning, half: 'bottom' };
  return { inning: inning + 1, half: 'top' };
}

export function createDefaultGameFields(isHomeTeam = true): Pick<
  Game,
  'isHomeTeam' | 'totalInnings' | 'lineup' | 'opponentScores' | 'currentInning' | 'currentHalf'
> {
  return {
    isHomeTeam,
    totalInnings: 7,
    lineup: [],
    opponentScores: [],
    currentInning: 1,
    currentHalf: isHomeTeam ? 'top' : 'bottom',
  };
}
