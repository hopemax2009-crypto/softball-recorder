export type AtBatResult =
  | '1B'
  | '2B'
  | '3B'
  | 'HR'
  | 'BB'
  | 'SO'
  | 'FO'
  | 'GO'
  | 'SF'
  | 'HBP'
  | 'E'
  | 'FC'
  | 'DP';

export type HalfInning = 'top' | 'bottom';

export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'EP' | 'FLEX' | 'BN';

export const AT_BAT_RESULTS: { value: AtBatResult; label: string; short: string }[] = [
  { value: '1B', label: '一壘安打', short: '1B' },
  { value: '2B', label: '二壘安打', short: '2B' },
  { value: '3B', label: '三壘安打', short: '3B' },
  { value: 'HR', label: '全壘打', short: 'HR' },
  { value: 'BB', label: '保送', short: 'BB' },
  { value: 'HBP', label: '觸身球', short: 'HBP' },
  { value: 'SO', label: '三振', short: 'K' },
  { value: 'FO', label: '飛球出局', short: 'FO' },
  { value: 'GO', label: '滾地球出局', short: 'GO' },
  { value: 'DP', label: '雙殺', short: 'DP' },
  { value: 'SF', label: '高飛犧牲打', short: 'SF' },
  { value: 'FC', label: '野選', short: 'FC' },
  { value: 'E', label: '失誤上壘', short: 'E' },
];

export const POSITIONS: { value: Position; label: string }[] = [
  { value: 'P', label: '投手 P' },
  { value: 'C', label: '捕手 C' },
  { value: '1B', label: '一壘 1B' },
  { value: '2B', label: '二壘 2B' },
  { value: '3B', label: '三壘 3B' },
  { value: 'SS', label: '游擊 SS' },
  { value: 'LF', label: '左外 LF' },
  { value: 'CF', label: '中外 CF' },
  { value: 'RF', label: '右外 RF' },
  { value: 'DH', label: '指定 DH' },
  { value: 'EP', label: '自由 EP' },
  { value: 'FLEX', label: '彈性 FLEX' },
  { value: 'BN', label: '板凳 BN' },
];

export const OUT_RESULTS: AtBatResult[] = ['SO', 'FO', 'GO', 'SF', 'DP'];

/** 選擇打席結果時的預設出局數 */
export function getDefaultOutsForResult(result: AtBatResult): number {
  switch (result) {
    case 'SO':
    case 'FO':
    case 'GO':
    case 'SF':
    case 'FC':
      return 1;
    case 'DP':
      return 2;
    default:
      return 0;
  }
}

/** 先發打序最大棒次（壘球常見 15 人 + 指定打擊等） */
export const MAX_BATTING_ORDER = 16;
export const BATTING_ORDERS: number[] = Array.from({ length: MAX_BATTING_ORDER }, (_, i) => i + 1);

export interface Player {
  id: string;
  name: string;
  number?: string;
  createdAt: string;
}

export interface Season {
  id: string;
  name: string;
  year: number;
  createdAt: string;
}

export interface LineupEntry {
  playerId: string;
  battingOrder: number;
  position: Position;
  isActive: boolean;
}

export interface OpponentScore {
  inning: number;
  half: HalfInning;
  runs: number;
  updatedAt?: string;
}

export interface AtBat {
  id: string;
  playerId: string;
  result: AtBatResult;
  rbi: number;
  outs: number;
  inning: number;
  half: HalfInning;
  note?: string;
  updatedAt?: string;
}

export interface SharedGameMeta {
  gameId: string;
  shareCode: string;
  teamCode: string;
  opponent: string;
  date: string;
  createdAt: string;
  createdBy: string;
}

export interface SharedGameRegistryEntry {
  shareCode: string;
  gameId: string;
  opponent: string;
  date: string;
  createdAt: string;
}

export interface SharedGameRegistry {
  entries: SharedGameRegistryEntry[];
}

export interface SharedGameFile {
  game: Game;
  syncUpdatedAt: string;
  updatedBy?: string;
}

export interface Game {
  id: string;
  seasonId: string;
  date: string;
  opponent: string;
  location?: string;
  isHomeTeam: boolean;
  totalInnings: number;
  lineup: LineupEntry[];
  opponentScores: OpponentScore[];
  currentInning: number;
  currentHalf: HalfInning;
  atBats: AtBat[];
  createdAt: string;
  isShared?: boolean;
  teamCode?: string;
  shareCode?: string;
  syncUpdatedAt?: string;
  liveRoomId?: string;
  liveRoomPin?: string;
  lineupUpdatedAt?: string;
  rosterSnapshot?: { id: string; name: string; number?: string }[];
  /** 比賽已結束（可關閉 QR 共用） */
  isCompleted?: boolean;
}

export interface UserData {
  version: number;
  ownerId: string;
  ownerName: string;
  players: Player[];
  seasons: Season[];
  games: Game[];
  updatedAt: string;
}

/** 發布至 Firebase 的公開統計快照（唯讀查詢用） */
export interface PublicStatsSnapshot {
  teamCode: string;
  teamName: string;
  players: Player[];
  seasons: Season[];
  games: Game[];
  updatedAt: string;
  publishedBy?: string;
}

export interface BattingStats {
  playerId: string;
  playerName: string;
  games: number;
  ab: number;
  h: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  bb: number;
  hbp: number;
  so: number;
  sf: number;
  fo: number;
  go: number;
  dp: number;
  fc: number;
  e: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
  /** 總打席數（所有紀錄的打席） */
  pa: number;
  /** 幸運值：失誤 ÷ 打數 */
  luckValue: number;
  /** 純長打率 ISO：(二安 + 三安×2 + 全壘×3) / 打數 */
  iso: number;
  /** 惡運值：雙殺 ÷ (三振+滾地+飛球+野選+雙殺) */
  badLuckValue: number;
  /** 慢壘 wOBA */
  woba: number;
  /** 進攻貢獻分：(球員wOBA/全隊平均wOBA)×100 */
  wobaPlus: number;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export interface AuthSession {
  userId: string;
  username: string;
  displayName: string;
}

export type TabId = 'games' | 'record' | 'stats' | 'players' | 'settings';

export type RecordSubTab = 'record' | 'lineup' | 'positions';
