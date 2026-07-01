import type { AtBat, AtBatResult, BattingStats, Game, PitcherGameLog, PitcherStats, Player } from '../types';

const HIT_RESULTS: AtBatResult[] = ['1B', '2B', '3B', 'HR'];
const AB_EXCLUDE: AtBatResult[] = ['BB', 'HBP', 'SF'];

function isHit(result: AtBatResult): boolean {
  return HIT_RESULTS.includes(result);
}

function countsAsAB(result: AtBatResult): boolean {
  return !AB_EXCLUDE.includes(result);
}

function getBases(result: AtBatResult): number {
  switch (result) {
    case '1B':
      return 1;
    case '2B':
      return 2;
    case '3B':
      return 3;
    case 'HR':
      return 4;
    default:
      return 0;
  }
}

function formatRate(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function wobaNumerator(stats: Pick<BattingStats, 'bb' | 'singles' | 'doubles' | 'triples' | 'hr'>): number {
  return (
    0.7 * stats.bb +
    0.9 * stats.singles +
    1.25 * stats.doubles +
    1.6 * stats.triples +
    2.0 * stats.hr
  );
}

export function calculatePlayerStats(
  player: Player,
  games: Game[],
  seasonId?: string
): BattingStats {
  const filteredGames = seasonId
    ? games.filter((g) => g.seasonId === seasonId)
    : games;

  const gameIds = new Set<string>();
  let ab = 0;
  let pa = 0;
  let h = 0;
  let singles = 0;
  let doubles = 0;
  let triples = 0;
  let hr = 0;
  let rbi = 0;
  let bb = 0;
  let hbp = 0;
  let so = 0;
  let sf = 0;
  let fo = 0;
  let go = 0;
  let dp = 0;
  let fc = 0;
  let e = 0;
  let totalBases = 0;

  for (const game of filteredGames) {
    const playerAtBats = game.atBats.filter((a) => a.playerId === player.id);
    if (playerAtBats.length > 0) {
      gameIds.add(game.id);
    }
    for (const atBat of playerAtBats) {
      pa++;
      if (countsAsAB(atBat.result)) ab++;
      if (isHit(atBat.result)) {
        h++;
        totalBases += getBases(atBat.result);
      }
      switch (atBat.result) {
        case '1B':
          singles++;
          break;
        case '2B':
          doubles++;
          break;
        case '3B':
          triples++;
          break;
        case 'HR':
          hr++;
          break;
        case 'BB':
          bb++;
          break;
        case 'HBP':
          hbp++;
          break;
        case 'SO':
          so++;
          break;
        case 'SF':
          sf++;
          break;
        case 'FO':
          fo++;
          break;
        case 'GO':
          go++;
          break;
        case 'DP':
          dp++;
          break;
        case 'FC':
          fc++;
          break;
        case 'E':
          e++;
          break;
      }
      rbi += atBat.rbi;
    }
  }

  const avg = ab > 0 ? h / ab : 0;
  const obpDenom = ab + bb + hbp + sf;
  const obp = obpDenom > 0 ? (h + bb + hbp) / obpDenom : 0;
  const slg = ab > 0 ? totalBases / ab : 0;
  const luckValue = ab > 0 ? e / ab : 0;
  const iso = ab > 0 ? (doubles + triples * 2 + hr * 3) / ab : 0;
  const badLuckValue = ab > 0 ? dp / ab : 0;
  const woba = pa > 0 ? wobaNumerator({ bb, singles, doubles, triples, hr }) / pa : 0;

  return {
    playerId: player.id,
    playerName: player.name,
    games: gameIds.size,
    ab,
    h,
    singles,
    doubles,
    triples,
    hr,
    rbi,
    bb,
    hbp,
    so,
    sf,
    fo,
    go,
    dp,
    fc,
    e,
    avg: formatRate(avg),
    obp: formatRate(obp),
    slg: formatRate(slg),
    ops: formatRate(obp + slg),
    pa,
    luckValue: formatRate(luckValue),
    iso: formatRate(iso),
    badLuckValue: formatRate(badLuckValue),
    woba: formatRate(woba),
    wobaPlus: 0,
  };
}

export function calculateAllStats(
  players: Player[],
  games: Game[],
  seasonId?: string
): BattingStats[] {
  const stats = players
    .map((p) => calculatePlayerStats(p, games, seasonId))
    .filter((s) => s.pa > 0);

  const teamNumerator = stats.reduce((sum, s) => sum + wobaNumerator(s), 0);
  const teamPa = stats.reduce((sum, s) => sum + s.pa, 0);
  const teamAvgWoba = teamPa > 0 ? teamNumerator / teamPa : 0;

  return stats
    .map((s) => ({
      ...s,
      wobaPlus: formatRate(teamAvgWoba > 0 ? (s.woba / teamAvgWoba) * 100 : 0),
    }))
    .sort((a, b) => b.ab - a.ab);
}

/** 全隊平均 wOBA（加總加權分子 ÷ 全隊打席） */
export function getTeamAvgWoba(stats: BattingStats[]): number {
  const teamNumerator = stats.reduce((sum, s) => sum + wobaNumerator(s), 0);
  const teamPa = stats.reduce((sum, s) => sum + s.pa, 0);
  return teamPa > 0 ? formatRate(teamNumerator / teamPa) : 0;
}

export function formatAvg(value: number): string {
  if (value === 0) return '.000';
  const str = value.toFixed(3);
  return str.startsWith('0') ? str.slice(1) : str;
}

export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatWobaPlus(value: number): string {
  return Math.round(value).toString();
}

/** 進攻貢獻分色彩：100 為全隊平均 */
export function getWobaPlusTone(value: number): {
  bg: string;
  border: string;
  value: string;
  label: string;
} {
  if (value >= 120) {
    return {
      bg: 'bg-amber-50',
      border: 'border-amber-300',
      value: 'text-amber-700',
      label: 'text-amber-600',
    };
  }
  if (value >= 90) {
    return {
      bg: 'bg-emerald-50',
      border: 'border-emerald-300',
      value: 'text-emerald-700',
      label: 'text-emerald-600',
    };
  }
  return {
    bg: 'bg-orange-50',
    border: 'border-orange-300',
    value: 'text-orange-700',
    label: 'text-orange-600',
  };
}

const RADAR_MAX = {
  avg: 0.7,
  obp: 0.75,
  luck: 0.2,
  iso: 0.6,
  badLuck: 0.15,
} as const;

/** 雷達圖用 0–100 分（依各指標滿分正規化） */
export function getRadarScores(stats: BattingStats): number[] {
  return [
    Math.min(100, (stats.avg / RADAR_MAX.avg) * 100),
    Math.min(100, (stats.obp / RADAR_MAX.obp) * 100),
    Math.min(100, (stats.luckValue / RADAR_MAX.luck) * 100),
    Math.min(100, (stats.badLuckValue / RADAR_MAX.badLuck) * 100),
    Math.min(100, (stats.iso / RADAR_MAX.iso) * 100),
  ];
}

export function getResultLabel(result: AtBatResult): string {
  const found = [
    { value: '1B', label: '一壘安打' },
    { value: '2B', label: '二壘安打' },
    { value: '3B', label: '三壘安打' },
    { value: 'HR', label: '全壘打' },
    { value: 'BB', label: '保送' },
    { value: 'HBP', label: '觸身球' },
    { value: 'SO', label: '三振' },
    { value: 'FO', label: '飛球出局' },
    { value: 'GO', label: '滾地球出局' },
    { value: 'DP', label: '雙殺' },
    { value: 'SF', label: '高飛犧牲打' },
    { value: 'FC', label: '野選' },
    { value: 'E', label: '失誤上壘' },
  ].find((r) => r.value === result);
  return found?.label ?? ((result as string) === 'IF' ? '內野飛球' : result);
}

export function summarizeAtBat(atBat: AtBat, playerName: string): string {
  const label = getResultLabel(atBat.result);
  const rbiText = atBat.rbi > 0 ? ` ${atBat.rbi}分打點` : '';
  return `${playerName}：${label}${rbiText}`;
}

/** 統計投手失分（對手每得 1 分時紀錄的投手 P） */
export function calculatePitcherRunsAllowed(
  playerId: string,
  games: Game[],
  seasonId?: string
): number {
  const filteredGames = seasonId
    ? games.filter((g) => g.seasonId === seasonId)
    : games;

  let runs = 0;
  for (const game of filteredGames) {
    for (const score of game.opponentScores ?? []) {
      for (const run of score.pitcherRuns ?? []) {
        if (run.pitcherId === playerId) runs++;
      }
    }
  }
  return runs;
}

function filterGamesBySeason(games: Game[], seasonId?: string): Game[] {
  return seasonId ? games.filter((g) => g.seasonId === seasonId) : games;
}

export function calculatePitcherStats(
  player: Player,
  games: Game[],
  seasonId?: string
): PitcherStats | null {
  const filteredGames = filterGamesBySeason(games, seasonId);
  const gameIds = new Set<string>();
  const halfKeys = new Set<string>();
  let runsAllowed = 0;
  let scorelessHalves = 0;

  for (const game of filteredGames) {
    for (const score of game.opponentScores ?? []) {
      let pitchedHalf = score.pitcherId === player.id;
      let runsInHalf = 0;
      for (const run of score.pitcherRuns ?? []) {
        if (run.pitcherId === player.id) {
          runsAllowed++;
          runsInHalf++;
          pitchedHalf = true;
        }
      }
      if (pitchedHalf) {
        gameIds.add(game.id);
        halfKeys.add(`${game.id}-${score.inning}-${score.half}`);
        if (runsInHalf === 0) {
          scorelessHalves++;
        }
      }
    }
  }

  if (halfKeys.size === 0 && runsAllowed === 0) return null;

  const halfInnings = halfKeys.size;
  const gamesCount = gameIds.size;
  const era =
    halfInnings > 0 ? formatRate((runsAllowed * 7) / halfInnings) : null;
  const runsPerHalf = halfInnings > 0 ? formatRate(runsAllowed / halfInnings) : 0;
  const scorelessHalfRate =
    halfInnings > 0 ? formatRate(scorelessHalves / halfInnings) : 0;
  const workloadPerGame =
    gamesCount > 0 ? formatRate(halfInnings / gamesCount) : 0;

  return {
    playerId: player.id,
    playerName: player.name,
    games: gamesCount,
    runsAllowed,
    halfInnings,
    era,
    runsPerGame: gamesCount > 0 ? formatRate(runsAllowed / gamesCount) : 0,
    runsPerHalf,
    scorelessHalfRate,
    workloadPerGame,
  };
}

export function calculateAllPitcherStats(
  players: Player[],
  games: Game[],
  seasonId?: string
): PitcherStats[] {
  return players
    .map((p) => calculatePitcherStats(p, games, seasonId))
    .filter((s): s is PitcherStats => s != null)
    .sort((a, b) => a.runsAllowed - b.runsAllowed || b.games - a.games);
}

export function getPitcherGameLogs(
  playerId: string,
  games: Game[],
  seasonId?: string
): PitcherGameLog[] {
  const filteredGames = filterGamesBySeason(games, seasonId);
  const logs: PitcherGameLog[] = [];

  for (const game of filteredGames) {
    let runs = 0;
    const halfSet = new Set<string>();
    for (const score of game.opponentScores ?? []) {
      let pitchedHalf = score.pitcherId === playerId;
      for (const run of score.pitcherRuns ?? []) {
        if (run.pitcherId === playerId) {
          runs++;
          pitchedHalf = true;
        }
      }
      if (pitchedHalf) {
        halfSet.add(`${score.inning}-${score.half}`);
      }
    }
    if (halfSet.size > 0) {
      logs.push({
        gameId: game.id,
        date: game.date,
        opponent: game.opponent,
        runsAllowed: runs,
        halfInnings: halfSet.size,
      });
    }
  }

  return logs.sort((a, b) => b.date.localeCompare(a.date));
}

export function formatEra(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return value.toFixed(2);
}

const PITCHER_RADAR_MAX = {
  era: 7,
  runsPerHalf: 1.5,
  runsPerGame: 4,
  workload: 5,
} as const;

const PITCHER_RADAR_LABELS = ['防禦率', '零失分率', '半局失分', '出勤度', '場均失分'] as const;

function invertRatio(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, ((max - value) / max) * 100));
}

/** 投手雷達圖 0–100（越高越好） */
export function getPitcherRadarScores(stats: PitcherStats): number[] {
  const eraValue = stats.era ?? (stats.runsAllowed === 0 ? 0 : PITCHER_RADAR_MAX.era);
  return [
    invertRatio(eraValue, PITCHER_RADAR_MAX.era),
    Math.min(100, stats.scorelessHalfRate * 100),
    invertRatio(stats.runsPerHalf, PITCHER_RADAR_MAX.runsPerHalf),
    Math.min(100, (stats.workloadPerGame / PITCHER_RADAR_MAX.workload) * 100),
    invertRatio(stats.runsPerGame, PITCHER_RADAR_MAX.runsPerGame),
  ];
}

export function getPitcherRadarLabels(): readonly string[] {
  return PITCHER_RADAR_LABELS;
}

export function getPitcherRadarDisplayValues(stats: PitcherStats): string[] {
  return [
    formatEra(stats.era),
    formatPct(stats.scorelessHalfRate),
    stats.runsPerHalf.toFixed(2),
    stats.workloadPerGame.toFixed(1),
    stats.runsPerGame.toFixed(2),
  ];
}
