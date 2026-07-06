import type { Game, HalfInning, Player } from '../types';
import { getGameOutcome, getOpponentScore, getTeamTotals, sumRbi } from './gameLogic';
import { calculatePlayerStats } from './stats';

export interface InningScoreCell {
  inning: number;
  ourRuns: number | null;
  oppRuns: number | null;
}

export interface GameBattingLine {
  playerId: string;
  playerName: string;
  number?: string;
  order: number | null;
  ab: number;
  h: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  so: number;
  pa: number;
}

export interface GamePitcherLine {
  playerId: string;
  playerName: string;
  runsAllowed: number;
  halfInnings: number;
}

export interface GameBoxScore {
  totals: { us: number; opponent: number };
  outcome: ReturnType<typeof getGameOutcome>;
  inningScores: InningScoreCell[];
  battingLines: GameBattingLine[];
  pitcherLines: GamePitcherLine[];
}

function ourHalf(game: Game): HalfInning {
  return game.isHomeTeam ? 'bottom' : 'top';
}

function oppHalf(game: Game): HalfInning {
  return game.isHomeTeam ? 'top' : 'bottom';
}

function resolvePlayerName(players: Player[], game: Game, playerId: string): string {
  return (
    players.find((p) => p.id === playerId)?.name ??
    game.rosterSnapshot?.find((s) => s.id === playerId)?.name ??
    '未知'
  );
}

function resolvePlayerNumber(players: Player[], game: Game, playerId: string): string | undefined {
  return (
    players.find((p) => p.id === playerId)?.number ??
    game.rosterSnapshot?.find((s) => s.id === playerId)?.number
  );
}

function getBattingOrder(game: Game, playerId: string): number | null {
  const entry = (game.lineup ?? []).find((l) => l.playerId === playerId && l.isActive);
  return entry?.battingOrder ?? null;
}

export function buildInningScores(game: Game): InningScoreCell[] {
  const maxInning = Math.max(
    game.totalInnings,
    ...game.atBats.map((a) => a.inning),
    ...(game.opponentScores ?? []).map((s) => s.inning),
    1
  );
  const our = ourHalf(game);
  const opp = oppHalf(game);
  const scores: InningScoreCell[] = [];

  for (let inning = 1; inning <= maxInning; inning++) {
    const ourAtBats = game.atBats.filter((a) => a.inning === inning && a.half === our);
    const ourRuns = ourAtBats.length > 0 ? sumRbi(ourAtBats) : null;
    const oppRecorded = getOpponentScore(game.opponentScores ?? [], inning, opp);
    scores.push({
      inning,
      ourRuns,
      oppRuns: oppRecorded,
    });
  }

  return scores;
}

export function buildGameBattingLines(game: Game, players: Player[]): GameBattingLine[] {
  const playerIds = [...new Set(game.atBats.map((a) => a.playerId))];
  const lines: GameBattingLine[] = [];

  for (const playerId of playerIds) {
    const player =
      players.find((p) => p.id === playerId) ??
      ({
        id: playerId,
        name: resolvePlayerName(players, game, playerId),
        number: resolvePlayerNumber(players, game, playerId),
        createdAt: '',
      } satisfies Player);

    const stats = calculatePlayerStats(player, [game]);
    if (stats.pa === 0) continue;

    lines.push({
      playerId,
      playerName: stats.playerName,
      number: player.number,
      order: getBattingOrder(game, playerId),
      ab: stats.ab,
      h: stats.h,
      doubles: stats.doubles,
      triples: stats.triples,
      hr: stats.hr,
      rbi: stats.rbi,
      bb: stats.bb,
      so: stats.so,
      pa: stats.pa,
    });
  }

  return lines.sort((a, b) => {
    if (a.order != null && b.order != null) return a.order - b.order;
    if (a.order != null) return -1;
    if (b.order != null) return 1;
    return a.playerName.localeCompare(b.playerName, 'zh-Hant');
  });
}

export function buildGamePitcherLines(game: Game, players: Player[]): GamePitcherLine[] {
  const byPlayer = new Map<string, { runs: number; halves: Set<string> }>();

  for (const score of game.opponentScores ?? []) {
    const halfKey = `${score.inning}-${score.half}`;
    const pitchersInHalf = new Set<string>();

    if (score.pitcherId) pitchersInHalf.add(score.pitcherId);
    for (const run of score.pitcherRuns ?? []) {
      if (run.pitcherId) {
        pitchersInHalf.add(run.pitcherId);
        const entry = byPlayer.get(run.pitcherId) ?? { runs: 0, halves: new Set<string>() };
        entry.runs++;
        byPlayer.set(run.pitcherId, entry);
      }
    }
    for (const playerId of pitchersInHalf) {
      const entry = byPlayer.get(playerId) ?? { runs: 0, halves: new Set<string>() };
      entry.halves.add(halfKey);
      byPlayer.set(playerId, entry);
    }
  }

  return [...byPlayer.entries()]
    .map(([playerId, { runs, halves }]) => ({
      playerId,
      playerName: resolvePlayerName(players, game, playerId),
      runsAllowed: runs,
      halfInnings: halves.size,
    }))
    .sort((a, b) => b.halfInnings - a.halfInnings || a.runsAllowed - b.runsAllowed);
}

export function buildGameBoxScore(game: Game, players: Player[]): GameBoxScore {
  return {
    totals: getTeamTotals(game),
    outcome: getGameOutcome(game),
    inningScores: buildInningScores(game),
    battingLines: buildGameBattingLines(game, players),
    pitcherLines: buildGamePitcherLines(game, players),
  };
}

export function hasBoxScoreData(game: Game): boolean {
  return game.atBats.length > 0 || (game.opponentScores?.length ?? 0) > 0;
}

function outcomeLabel(outcome: GameBoxScore['outcome']): string {
  if (outcome === 'win') return '勝';
  if (outcome === 'loss') return '負';
  if (outcome === 'tie') return '和';
  return '';
}

function formatBattingExtra(line: GameBattingLine): string {
  const parts: string[] = [];
  if (line.doubles > 0) parts.push(`${line.doubles}二`);
  if (line.triples > 0) parts.push(`${line.triples}三`);
  if (line.hr > 0) parts.push(`${line.hr}全`);
  return parts.join('');
}

/** 純文字戰報，可貼到 LINE、Messenger 等 */
export function formatGameBoxScoreText(
  game: Game,
  players: Player[],
  teamName: string,
  seasonName?: string,
  shareUrl?: string
): string {
  const box = buildGameBoxScore(game, players);
  const lines: string[] = ['【壘球賽戰報】'];

  const meta = [game.date, seasonName, game.location, outcomeLabel(box.outcome)].filter(Boolean);
  lines.push(`${teamName} vs ${game.opponent}`);
  if (meta.length > 0) lines.push(meta.join(' · '));

  lines.push('');
  lines.push(`最終比分：${teamName} ${box.totals.us} : ${box.totals.opponent} ${game.opponent}`);

  if (box.inningScores.length > 0) {
    lines.push('');
    lines.push('【逐局比分】');
    const header = ['', ...box.inningScores.map((c) => String(c.inning)), 'R'].join('\t');
    const usRow = [
      teamName.slice(0, 4),
      ...box.inningScores.map((c) => (c.ourRuns != null ? String(c.ourRuns) : '—')),
      String(box.totals.us),
    ].join('\t');
    const oppRow = [
      game.opponent.slice(0, 4),
      ...box.inningScores.map((c) => (c.oppRuns != null ? String(c.oppRuns) : '—')),
      String(box.totals.opponent),
    ].join('\t');
    lines.push(header, usRow, oppRow);
  }

  if (box.battingLines.length > 0) {
    lines.push('');
    lines.push('【打擊成績】');
    for (const line of box.battingLines) {
      const prefix = [
        line.order != null ? `${line.order}` : '',
        line.number ? `#${line.number}` : '',
        line.playerName,
      ]
        .filter(Boolean)
        .join(' ');
      const extra = formatBattingExtra(line);
      lines.push(
        `${prefix}  AB ${line.ab} H ${line.h} RBI ${line.rbi} BB ${line.bb} SO ${line.so}${extra ? ` ${extra}` : ''}`
      );
    }
  }

  if (box.pitcherLines.length > 0) {
    lines.push('');
    lines.push('【投手失分】');
    for (const line of box.pitcherLines) {
      lines.push(`${line.playerName}  ${line.runsAllowed}失分 · ${line.halfInnings}半局`);
    }
  }

  if (shareUrl) {
    lines.push('');
    lines.push(`詳細戰報：${shareUrl}`);
  }

  return lines.join('\n');
}
