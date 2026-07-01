import type { AtBat, Game, HalfInning, OpponentScore, Position } from '../types';
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
  return [...filtered, { inning, half, runs, updatedAt: new Date().toISOString() }];
}

export function touchLineup(game: Game, lineup: Game['lineup']): Game {
  return { ...game, lineup, lineupUpdatedAt: new Date().toISOString() };
}

export function getPlayerAtBattingOrder(game: Game, order: number): string | null {
  const entry = (game.lineup ?? []).find((l) => l.isActive && l.battingOrder === order);
  return entry?.playerId ?? null;
}

/** 指派球員至棒次（1–16），同一棒次與同一球員不可重複 */
export function assignPlayerToBattingOrder(
  game: Game,
  order: number,
  playerId: string | null
): Game {
  const lineup = (game.lineup ?? []).map((l) => ({ ...l }));

  for (const l of lineup) {
    if (l.isActive && l.battingOrder === order) {
      l.isActive = false;
    }
  }

  if (!playerId) {
    return touchLineup(game, lineup);
  }

  for (const l of lineup) {
    if (l.isActive && l.playerId === playerId) {
      l.isActive = false;
    }
  }

  const existing = lineup.find((l) => l.playerId === playerId);
  if (existing) {
    existing.battingOrder = order;
    existing.isActive = true;
    existing.position = existing.position || 'BN';
  } else {
    lineup.push({ playerId, battingOrder: order, position: 'BN', isActive: true });
  }

  return touchLineup(game, lineup);
}

/** 指派球員至守位，同一守位不可重複（僅限已上棒次球員） */
export function assignPlayerToPosition(
  game: Game,
  position: Position,
  playerId: string | null
): Game {
  if (position === 'BN') return game;
  const lineup = (game.lineup ?? []).map((l) => ({ ...l }));

  for (const l of lineup) {
    if (l.isActive && l.position === position) {
      l.position = 'BN';
    }
  }

  if (!playerId) {
    return touchLineup(game, lineup);
  }

  const existing = lineup.find((l) => l.playerId === playerId);
  if (!existing?.isActive) {
    return game;
  }

  for (const l of lineup) {
    if (l.isActive && l.playerId !== playerId && l.position === position) {
      l.position = 'BN';
    }
  }

  existing.position = position;
  return touchLineup(game, lineup);
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

/** 已完成比賽的勝負（需有得分紀錄才判定） */
export function getGameOutcome(game: Game): 'win' | 'loss' | 'tie' | null {
  if (!game.isCompleted) return null;
  const { us, opponent } = getTeamTotals(game);
  if (us === 0 && opponent === 0 && game.atBats.length === 0) return null;
  if (us > opponent) return 'win';
  if (us < opponent) return 'loss';
  return 'tie';
}

export function getInningLabel(inning: number, half: HalfInning): string {
  return half === 'top' ? `${inning}局上` : `${inning}局下`;
}

export function hasActiveLineup(game: Game): boolean {
  return (game.lineup ?? []).some((l) => l.isActive);
}

export function isHalfComplete(game: Game, inning: number, half: HalfInning): boolean {
  if (!isOurBattingHalf(game, inning, half)) return false;
  return countOuts(getAtBatsForHalf(game, inning, half)) >= 3;
}

/** 打席更新後：若該半局已 3 出局且為目前局，自動跳至下一局 */
export function applyGameAfterAtBatChange(
  game: Game,
  atBats: AtBat[],
  inning: number,
  half: HalfInning,
  now: string
): Game {
  let updated: Game = { ...game, atBats, syncUpdatedAt: now };
  if (
    isOurBattingHalf(game, inning, half) &&
    countOuts(atBats.filter((a) => a.inning === inning && a.half === half)) >= 3 &&
    updated.currentInning === inning &&
    updated.currentHalf === half
  ) {
    const next = getNextHalf(inning, half);
    updated = {
      ...updated,
      currentInning: next.inning,
      currentHalf: next.half,
      syncUpdatedAt: now,
    };
  }
  return updated;
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

/** 確保從 Firebase 讀回的比賽資料具備必要欄位，避免渲染時崩潰 */
export function normalizeGame(game: Game): Game {
  const defaults = createDefaultGameFields(game.isHomeTeam ?? true);
  return {
    ...defaults,
    ...game,
    lineup: game.lineup ?? defaults.lineup,
    atBats: game.atBats ?? [],
    opponentScores: game.opponentScores ?? defaults.opponentScores,
    currentInning: game.currentInning ?? defaults.currentInning,
    currentHalf: game.currentHalf ?? defaults.currentHalf,
    totalInnings: game.totalInnings ?? defaults.totalInnings,
    isHomeTeam: game.isHomeTeam ?? defaults.isHomeTeam,
  };
}
