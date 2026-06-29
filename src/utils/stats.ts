import type { AtBat, AtBatResult, BattingStats, Game, Player } from '../types';

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
  let totalBases = 0;

  for (const game of filteredGames) {
    const playerAtBats = game.atBats.filter((a) => a.playerId === player.id);
    if (playerAtBats.length > 0) {
      gameIds.add(game.id);
    }
    for (const atBat of playerAtBats) {
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
      }
      rbi += atBat.rbi;
    }
  }

  const avg = ab > 0 ? h / ab : 0;
  const obpDenom = ab + bb + hbp + sf;
  const obp = obpDenom > 0 ? (h + bb + hbp) / obpDenom : 0;
  const slg = ab > 0 ? totalBases / ab : 0;

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
    avg: formatRate(avg),
    obp: formatRate(obp),
    slg: formatRate(slg),
    ops: formatRate(obp + slg),
  };
}

export function calculateAllStats(
  players: Player[],
  games: Game[],
  seasonId?: string
): BattingStats[] {
  return players
    .map((p) => calculatePlayerStats(p, games, seasonId))
    .filter((s) => s.ab > 0 || s.bb > 0 || s.hbp > 0)
    .sort((a, b) => b.ab - a.ab);
}

export function formatAvg(value: number): string {
  if (value === 0) return '.000';
  const str = value.toFixed(3);
  return str.startsWith('0') ? str.slice(1) : str;
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
    { value: 'IF', label: '內野飛球' },
    { value: 'SF', label: '高飛犧牲打' },
    { value: 'FC', label: '野選' },
    { value: 'E', label: '失誤上壘' },
  ].find((r) => r.value === result);
  return found?.label ?? result;
}

export function summarizeAtBat(atBat: AtBat, playerName: string): string {
  const label = getResultLabel(atBat.result);
  const rbiText = atBat.rbi > 0 ? ` ${atBat.rbi}分打點` : '';
  return `${playerName}：${label}${rbiText}`;
}
