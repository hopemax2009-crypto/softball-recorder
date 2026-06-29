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
  | 'IF';

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
  { value: 'IF', label: '內野飛球', short: 'IF' },
  { value: 'SF', label: '高飛犧牲打', short: 'SF' },
  { value: 'FC', label: '野選', short: 'FC' },
  { value: 'E', label: '失誤上壘', short: 'E' },
];

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

export interface AtBat {
  id: string;
  playerId: string;
  result: AtBatResult;
  rbi: number;
  inning?: number;
  note?: string;
}

export interface Game {
  id: string;
  seasonId: string;
  date: string;
  opponent: string;
  location?: string;
  atBats: AtBat[];
  createdAt: string;
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
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch: string;
}

export type TabId = 'games' | 'record' | 'stats' | 'players' | 'settings';
