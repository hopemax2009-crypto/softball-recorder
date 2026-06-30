import type { Game, GitHubConfig, SharedGameMeta } from '../types';
import { mergeGames } from '../utils/gameMerge';
import { normalizeTeamCode } from '../utils/teamStorage';
import { readJsonFile, writeJsonFile } from './githubStorage';

function sharedGamePath(teamCode: string, gameId: string): string {
  return `data/teams/${normalizeTeamCode(teamCode)}/games/${gameId}.json`;
}

function sharedIndexPath(teamCode: string): string {
  return `data/teams/${normalizeTeamCode(teamCode)}/index.json`;
}

export function generateShareCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function pullSharedGame(
  config: GitHubConfig,
  teamCode: string,
  gameId: string
): Promise<Game | null> {
  const result = await readJsonFile<Game>(config, sharedGamePath(teamCode, gameId));
  return result?.data ?? null;
}

export async function pushSharedGame(config: GitHubConfig, game: Game): Promise<Game> {
  if (!game.teamCode) throw new Error('缺少團隊代碼');
  const path = sharedGamePath(game.teamCode, game.id);
  const toSave: Game = { ...game, syncUpdatedAt: new Date().toISOString() };
  const existing = await readJsonFile<Game>(config, path);
  await writeJsonFile(
    config,
    path,
    toSave,
    `更新共用比賽 ${game.opponent} - ${new Date().toLocaleString('zh-TW')}`,
    existing?.sha
  );
  return toSave;
}

export async function syncSharedGame(
  config: GitHubConfig,
  localGame: Game
): Promise<{ game: Game; action: 'pushed' | 'pulled' | 'merged' }> {
  if (!localGame.teamCode) throw new Error('缺少團隊代碼');
  const remote = await pullSharedGame(config, localGame.teamCode, localGame.id);

  if (!remote) {
    const pushed = await pushSharedGame(config, localGame);
    return { game: pushed, action: 'pushed' };
  }

  const merged = mergeGames(localGame, remote);
  const localOnly = localGame.atBats.filter(
    (a) => !remote.atBats.some((r) => r.id === a.id)
  ).length;
  const remoteOnly = remote.atBats.filter(
    (r) => !localGame.atBats.some((l) => l.id === r.id)
  ).length;

  const pushed = await pushSharedGame(config, merged);
  let action: 'pushed' | 'pulled' | 'merged' = 'merged';
  if (localOnly > 0 && remoteOnly === 0) action = 'pushed';
  else if (remoteOnly > 0 && localOnly === 0) action = 'pulled';

  return { game: pushed, action };
}

export async function registerSharedGameIndex(
  config: GitHubConfig,
  meta: SharedGameMeta
): Promise<void> {
  const path = sharedIndexPath(meta.teamCode);
  const existing = await readJsonFile<SharedGameMeta[]>(config, path);
  const list = existing?.data ?? [];
  const filtered = list.filter((m) => m.gameId !== meta.gameId);
  filtered.push(meta);
  await writeJsonFile(
    config,
    path,
    filtered,
    `註冊共用比賽 ${meta.shareCode}`,
    existing?.sha
  );
}

export async function fetchSharedGameIndex(
  config: GitHubConfig,
  teamCode: string
): Promise<SharedGameMeta[]> {
  const result = await readJsonFile<SharedGameMeta[]>(config, sharedIndexPath(teamCode));
  return result?.data ?? [];
}

export async function joinSharedGameByCode(
  config: GitHubConfig,
  teamCode: string,
  shareCode: string
): Promise<{ meta: SharedGameMeta; game: Game }> {
  const normalized = shareCode.trim().toUpperCase();
  const index = await fetchSharedGameIndex(config, teamCode);
  const meta = index.find((m) => m.shareCode === normalized);
  if (!meta) throw new Error('找不到此比賽代碼，請確認團隊代碼與比賽代碼');
  const game = await pullSharedGame(config, teamCode, meta.gameId);
  if (!game) throw new Error('比賽資料不存在');
  return {
    meta,
    game: { ...game, isShared: true, teamCode: normalizeTeamCode(teamCode), shareCode: normalized },
  };
}

export async function publishSharedGame(
  config: GitHubConfig,
  game: Game,
  teamCode: string,
  shareCode: string,
  createdBy: string,
  rosterSnapshot?: { id: string; name: string; number?: string }[]
): Promise<Game> {
  const normalizedTeam = normalizeTeamCode(teamCode);
  const shared: Game = {
    ...game,
    isShared: true,
    teamCode: normalizedTeam,
    shareCode,
    syncUpdatedAt: new Date().toISOString(),
    rosterSnapshot,
  };
  await pushSharedGame(config, shared);
  await registerSharedGameIndex(config, {
    gameId: game.id,
    shareCode,
    teamCode: normalizedTeam,
    opponent: game.opponent,
    date: game.date,
    createdAt: game.createdAt,
    createdBy,
  });
  return shared;
}
