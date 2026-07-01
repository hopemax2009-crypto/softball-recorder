import type { AtBat, Game, HalfInning, OpponentScore, Position } from '../types';
import { BATTING_ORDERS, OUT_RESULTS } from '../types';

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

export function getOpponentScoreEntry(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning
): OpponentScore | undefined {
  return scores.find((s) => s.inning === inning && s.half === half);
}

function shouldKeepOpponentScoreEntry(entry: OpponentScore): boolean {
  return entry.runs > 0 || !!entry.pitcherId;
}

function replaceOpponentScoreEntry(
  scores: OpponentScore[],
  entry: OpponentScore
): OpponentScore[] {
  const filtered = scores.filter(
    (s) => !(s.inning === entry.inning && s.half === entry.half)
  );
  if (!shouldKeepOpponentScoreEntry(entry)) return filtered;
  return [...filtered, entry];
}

function mergeHalfPitcherId(
  existing: OpponentScore | undefined,
  halfPitcherId: string | null | undefined
): string | undefined {
  if (halfPitcherId) return halfPitcherId;
  return existing?.pitcherId;
}

/** 對手 +1 分，並記錄當下投手 */
export function addOpponentRun(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning,
  pitcherId: string | null
): OpponentScore[] {
  const existing = getOpponentScoreEntry(scores, inning, half);
  const pitcherRuns = [...(existing?.pitcherRuns ?? [])];
  pitcherRuns.push(pitcherId ? { pitcherId } : {});
  return replaceOpponentScoreEntry(scores, {
    inning,
    half,
    runs: (existing?.runs ?? 0) + 1,
    pitcherRuns,
    pitcherId: mergeHalfPitcherId(existing, pitcherId),
    updatedAt: new Date().toISOString(),
  });
}

/** 對手 -1 分，並移除最後一筆失分投手紀錄 */
export function removeOpponentRun(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning
): OpponentScore[] {
  const existing = getOpponentScoreEntry(scores, inning, half);
  if (!existing || existing.runs <= 0) return scores;
  const pitcherRuns = (existing.pitcherRuns ?? []).slice(0, -1);
  const runs = existing.runs - 1;
  return replaceOpponentScoreEntry(scores, {
    inning,
    half,
    runs,
    pitcherRuns,
    pitcherId: existing.pitcherId,
    updatedAt: new Date().toISOString(),
  });
}

/** 手動設定對方得分；增加的分數以當下投手紀錄 */
export function setOpponentScoreWithPitcher(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning,
  runs: number,
  pitcherIdForNewRuns: string | null
): OpponentScore[] {
  const target = Math.max(0, runs);
  const existing = getOpponentScoreEntry(scores, inning, half);
  const currentRuns = existing?.runs ?? 0;
  let pitcherRuns = [...(existing?.pitcherRuns ?? [])];

  if (target > currentRuns) {
    for (let i = 0; i < target - currentRuns; i++) {
      pitcherRuns.push(pitcherIdForNewRuns ? { pitcherId: pitcherIdForNewRuns } : {});
    }
  } else if (target < currentRuns) {
    pitcherRuns = pitcherRuns.slice(0, target);
  }

  if (target === 0 && !mergeHalfPitcherId(existing, pitcherIdForNewRuns)) {
    return scores.filter((s) => !(s.inning === inning && s.half === half));
  }

  return replaceOpponentScoreEntry(scores, {
    inning,
    half,
    runs: target,
    pitcherRuns: pitcherRuns.length > 0 ? pitcherRuns : undefined,
    pitcherId: mergeHalfPitcherId(existing, pitcherIdForNewRuns),
    updatedAt: new Date().toISOString(),
  });
}

/** 完成對手半局：紀錄得分並標記該半局投手（含 0 失分） */
export function completeOpponentHalf(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning,
  runs: number,
  halfPitcherId: string | null
): OpponentScore[] {
  const target = Math.max(0, runs);
  const existing = getOpponentScoreEntry(scores, inning, half);
  let pitcherRuns = [...(existing?.pitcherRuns ?? [])];

  if (target > (existing?.runs ?? 0)) {
    for (let i = 0; i < target - (existing?.runs ?? 0); i++) {
      pitcherRuns.push(halfPitcherId ? { pitcherId: halfPitcherId } : {});
    }
  } else if (target < (existing?.runs ?? 0)) {
    pitcherRuns = pitcherRuns.slice(0, target);
  }

  if (target === 0 && !halfPitcherId) {
    return scores.filter((s) => !(s.inning === inning && s.half === half));
  }

  return replaceOpponentScoreEntry(scores, {
    inning,
    half,
    runs: target,
    pitcherRuns: pitcherRuns.length > 0 ? pitcherRuns : undefined,
    pitcherId: halfPitcherId ?? existing?.pitcherId,
    updatedAt: new Date().toISOString(),
  });
}

export function setOpponentScore(
  scores: OpponentScore[],
  inning: number,
  half: HalfInning,
  runs: number
): OpponentScore[] {
  const target = Math.max(0, runs);
  const existing = getOpponentScoreEntry(scores, inning, half);
  if (target === 0 && !existing?.pitcherId) {
    return scores.filter((s) => !(s.inning === inning && s.half === half));
  }
  let pitcherRuns = existing?.pitcherRuns ?? [];
  if (pitcherRuns.length > target) {
    pitcherRuns = pitcherRuns.slice(0, target);
  }
  return replaceOpponentScoreEntry(scores, {
    inning,
    half,
    runs: target,
    pitcherRuns: pitcherRuns.length > 0 ? pitcherRuns : undefined,
    pitcherId: existing?.pitcherId,
    updatedAt: new Date().toISOString(),
  });
}

export function touchLineup(game: Game, lineup: Game['lineup']): Game {
  return { ...game, lineup, lineupUpdatedAt: new Date().toISOString() };
}

export function getPlayerAtBattingOrder(game: Game, order: number): string | null {
  const entry = (game.lineup ?? []).find((l) => l.isActive && l.battingOrder === order);
  return entry?.playerId ?? null;
}

export function getNextAvailableBattingOrder(game: Game): number | null {
  for (const order of BATTING_ORDERS) {
    if (!getPlayerAtBattingOrder(game, order)) return order;
  }
  return null;
}

export function getLineupEntryForPlayer(game: Game, playerId: string) {
  return (game.lineup ?? []).find((l) => l.playerId === playerId && l.isActive);
}

export const FIELD_POSITIONS: Position[] = [
  'P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'FLEX',
];

export const BATTING_ONLY_POSITIONS: Position[] = ['DH', 'EP'];

export function isFieldPosition(position: Position): boolean {
  return FIELD_POSITIONS.includes(position);
}

export function isBattingOnlyPosition(position: Position): boolean {
  return BATTING_ONLY_POSITIONS.includes(position);
}

export function getPlayerAtPosition(game: Game, position: Position): string | null {
  const entry = (game.lineup ?? []).find((l) => l.isActive && l.position === position);
  return entry?.playerId ?? null;
}

export function getCurrentPitcherId(game: Game): string | null {
  return getPlayerAtPosition(game, 'P');
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

/** 指派球員至守位，同一守位不可重複（僅限已上棒次球員；DH/EP 請用棒次頁設定） */
export function assignPlayerToPosition(
  game: Game,
  position: Position,
  playerId: string | null
): Game {
  if (position === 'BN' || isBattingOnlyPosition(position)) return game;
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

/** 指派守位並一併排定棒次（新進先發球員須指定棒次；已在打序者僅更新守位） */
export function assignPlayerToPositionAndOrder(
  game: Game,
  position: Position,
  playerId: string | null,
  battingOrder?: number
): Game {
  if (position === 'BN') return game;
  if (!playerId) {
    return assignPlayerToPosition(game, position, null);
  }

  if (getLineupEntryForPlayer(game, playerId)) {
    return assignPlayerToPosition(game, position, playerId);
  }

  if (battingOrder == null) return game;

  const withOrder = assignPlayerToBattingOrder(game, battingOrder, playerId);
  return assignPlayerToPosition(withOrder, position, playerId);
}

function assignPlayerToBattingOnlyRole(
  game: Game,
  order: number,
  playerId: string,
  role: 'DH' | 'EP'
): Game {
  const withOrder = assignPlayerToBattingOrder(game, order, playerId);
  const lineup = (withOrder.lineup ?? []).map((l) => ({ ...l }));

  for (const l of lineup) {
    if (l.isActive && l.position === role && l.playerId !== playerId) {
      l.position = 'BN';
    }
  }

  const entry = lineup.find((l) => l.playerId === playerId && l.isActive);
  if (entry) {
    entry.position = role;
  }

  return touchLineup(withOrder, lineup);
}

/** 棒次頁：指派球員至棒次並一併設定守位 / DH / EP / 僅棒次 */
export function assignPlayerToBattingOrderWithPosition(
  game: Game,
  order: number,
  playerId: string | null,
  position: Position = 'BN'
): Game {
  if (!playerId) {
    return assignPlayerToBattingOrder(game, order, null);
  }

  if (position === 'BN') {
    const withOrder = assignPlayerToBattingOrder(game, order, playerId);
    const lineup = (withOrder.lineup ?? []).map((l) => ({ ...l }));
    const entry = lineup.find((l) => l.playerId === playerId && l.isActive);
    if (entry) {
      entry.position = 'BN';
    }
    return touchLineup(withOrder, lineup);
  }

  if (position === 'DH' || position === 'EP') {
    return assignPlayerToBattingOnlyRole(game, order, playerId, position);
  }

  const withOrder = assignPlayerToBattingOrder(game, order, playerId);
  return assignPlayerToPosition(withOrder, position, playerId);
}

/** 代打：新球員接替棒次並一併接手原球員守位，原球員退出先發 */
export function substitutePlayerInLineup(
  game: Game,
  order: number,
  newPlayerId: string
): Game {
  const lineup = (game.lineup ?? []).map((l) => ({ ...l }));
  const currentEntry = lineup.find((l) => l.isActive && l.battingOrder === order);
  const position = currentEntry?.position ?? 'BN';

  if (currentEntry) {
    currentEntry.isActive = false;
  }

  for (const l of lineup) {
    if (l.isActive && l.playerId === newPlayerId) {
      l.isActive = false;
    }
  }

  const existing = lineup.find((l) => l.playerId === newPlayerId);
  if (existing) {
    existing.battingOrder = order;
    existing.isActive = true;
    existing.position = position;
  } else {
    lineup.push({ playerId: newPlayerId, battingOrder: order, position, isActive: true });
  }

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
