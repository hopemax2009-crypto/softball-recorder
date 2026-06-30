import type { AtBat, Game, OpponentScore } from '../types';

function safeArray<T>(value: T[] | undefined | null): T[] {
  return value ?? [];
}

function scoreKey(s: OpponentScore): string {
  return `${s.inning}-${s.half}`;
}

function mergeOpponentScores(local: Game, remote: Game): OpponentScore[] {
  const localTime = new Date(local.syncUpdatedAt ?? local.createdAt).getTime();
  const remoteTime = new Date(remote.syncUpdatedAt ?? remote.createdAt).getTime();
  const map = new Map<string, OpponentScore>();

  for (const s of safeArray(local.opponentScores)) {
    map.set(scoreKey(s), s);
  }
  for (const s of safeArray(remote.opponentScores)) {
    const key = scoreKey(s);
    if (!map.has(key) || remoteTime >= localTime) {
      map.set(key, s);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.inning !== b.inning ? a.inning - b.inning : a.half.localeCompare(b.half)
  );
}

function mergeLineup(local: Game, remote: Game): Game['lineup'] {
  const localTime = new Date(local.syncUpdatedAt ?? local.createdAt).getTime();
  const remoteTime = new Date(remote.syncUpdatedAt ?? remote.createdAt).getTime();
  const localLineup = safeArray(local.lineup);
  const remoteLineup = safeArray(remote.lineup);
  const base = remoteTime >= localTime ? remoteLineup : localLineup;
  const other = remoteTime >= localTime ? localLineup : remoteLineup;
  const map = new Map(base.map((e) => [e.playerId, e]));
  for (const e of other) {
    if (!map.has(e.playerId)) map.set(e.playerId, e);
  }
  return Array.from(map.values());
}

function mergeRoster(
  local: Game,
  remote: Game
): Game['rosterSnapshot'] {
  const list = [...(local.rosterSnapshot ?? []), ...(remote.rosterSnapshot ?? [])];
  const map = new Map(list.map((p) => [p.id, p]));
  return Array.from(map.values());
}

function sortAtBats(atBats: AtBat[]): AtBat[] {
  return [...atBats].sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning;
    if (a.half !== b.half) return a.half.localeCompare(b.half);
    const ta = a.updatedAt ?? '';
    const tb = b.updatedAt ?? '';
    return ta.localeCompare(tb);
  });
}

export function mergeGames(local: Game, remote: Game): Game {
  const localTime = new Date(local.syncUpdatedAt ?? local.createdAt).getTime();
  const remoteTime = new Date(remote.syncUpdatedAt ?? remote.createdAt).getTime();
  const base = remoteTime >= localTime ? remote : local;

  const atBatMap = new Map<string, AtBat>();
  for (const a of [...safeArray(local.atBats), ...safeArray(remote.atBats)]) {
    const existing = atBatMap.get(a.id);
    const aTime = new Date(a.updatedAt ?? 0).getTime();
    const eTime = existing ? new Date(existing.updatedAt ?? 0).getTime() : -1;
    if (!existing || aTime >= eTime) atBatMap.set(a.id, a);
  }

  return {
    ...base,
    lineup: mergeLineup(local, remote),
    opponentScores: mergeOpponentScores(local, remote),
    atBats: sortAtBats(Array.from(atBatMap.values())),
    rosterSnapshot: mergeRoster(local, remote),
    isShared: true,
    teamCode: base.teamCode ?? local.teamCode ?? remote.teamCode,
    shareCode: base.shareCode ?? local.shareCode ?? remote.shareCode,
    syncUpdatedAt: new Date().toISOString(),
  };
}
