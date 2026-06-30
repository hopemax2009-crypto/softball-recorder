import type { AtBat, Game, OpponentScore } from '../types';

function safeArray<T>(value: T[] | undefined | null): T[] {
  return value ?? [];
}

function scoreKey(s: OpponentScore): string {
  return `${s.inning}-${s.half}`;
}

function ts(value: string | undefined, fallback: string): number {
  return new Date(value ?? fallback).getTime();
}

function scoreTimestamp(score: OpponentScore, game: Game): number {
  if (score.updatedAt) return new Date(score.updatedAt).getTime();
  return ts(game.syncUpdatedAt, game.createdAt);
}

function mergeOpponentScores(local: Game, remote: Game): OpponentScore[] {
  const map = new Map<string, OpponentScore>();

  for (const s of safeArray(local.opponentScores)) {
    map.set(scoreKey(s), s);
  }
  for (const s of safeArray(remote.opponentScores)) {
    const key = scoreKey(s);
    const existing = map.get(key);
    if (!existing || scoreTimestamp(s, remote) >= scoreTimestamp(existing, local)) {
      map.set(key, s);
    }
  }
  return Array.from(map.values()).sort((a, b) =>
    a.inning !== b.inning ? a.inning - b.inning : a.half.localeCompare(b.half)
  );
}

function mergeLineup(local: Game, remote: Game): Game['lineup'] {
  const localLineup = safeArray(local.lineup);
  const remoteLineup = safeArray(remote.lineup);
  const localTime = ts(local.lineupUpdatedAt ?? local.syncUpdatedAt, local.createdAt);
  const remoteTime = ts(remote.lineupUpdatedAt ?? remote.syncUpdatedAt, remote.createdAt);
  const base = localTime >= remoteTime ? localLineup : remoteLineup;
  const other = localTime >= remoteTime ? remoteLineup : localLineup;
  const map = new Map(base.map((e) => [e.playerId, e]));
  for (const e of other) {
    if (!map.has(e.playerId)) map.set(e.playerId, e);
  }
  return Array.from(map.values());
}

function mergeRoster(local: Game, remote: Game): Game['rosterSnapshot'] {
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

function pickNewerIso(a: string | undefined, b: string | undefined): string | undefined {
  if (!a) return b;
  if (!b) return a;
  return new Date(a) >= new Date(b) ? a : b;
}

function mergeAtBats(local: Game, remote: Game, prefer: 'local' | 'remote'): AtBat[] {
  const localTime = ts(local.syncUpdatedAt, local.createdAt);
  const remoteTime = ts(remote.syncUpdatedAt, remote.createdAt);

  let authority: 'local' | 'remote';
  if (localTime > remoteTime) authority = 'local';
  else if (remoteTime > localTime) authority = 'remote';
  else authority = prefer;

  const auth = authority === 'local' ? local : remote;
  const other = authority === 'local' ? remote : local;
  const authTime = authority === 'local' ? localTime : remoteTime;

  const map = new Map<string, AtBat>();
  for (const a of safeArray(auth.atBats)) {
    map.set(a.id, a);
  }

  for (const a of safeArray(other.atBats)) {
    const existing = map.get(a.id);
    if (existing) {
      const aTime = new Date(a.updatedAt ?? 0).getTime();
      const eTime = new Date(existing.updatedAt ?? 0).getTime();
      if (aTime > eTime) map.set(a.id, a);
    } else {
      // 僅接受權威版本 sync 之後才新增的打席，避免已刪除的紀錄被還原
      const aTime = new Date(a.updatedAt ?? 0).getTime();
      if (aTime > authTime) map.set(a.id, a);
    }
  }

  return sortAtBats(Array.from(map.values()));
}

export function mergeGames(
  local: Game,
  remote: Game,
  prefer: 'local' | 'remote' = 'remote'
): Game {
  const localTime = ts(local.syncUpdatedAt, local.createdAt);
  const remoteTime = ts(remote.syncUpdatedAt, remote.createdAt);
  const base = remoteTime >= localTime ? remote : local;

  const merged: Game = {
    ...base,
    lineup: mergeLineup(local, remote),
    opponentScores: mergeOpponentScores(local, remote),
    atBats: mergeAtBats(local, remote, prefer),
    isShared: true,
    syncUpdatedAt: new Date().toISOString(),
  };

  const rosterSnapshot = mergeRoster(local, remote) ?? [];
  if (rosterSnapshot.length > 0) merged.rosterSnapshot = rosterSnapshot;

  const teamCode = base.teamCode ?? local.teamCode ?? remote.teamCode;
  if (teamCode) merged.teamCode = teamCode;

  const shareCode = base.shareCode ?? local.shareCode ?? remote.shareCode;
  if (shareCode) merged.shareCode = shareCode;

  const liveRoomId = base.liveRoomId ?? local.liveRoomId ?? remote.liveRoomId;
  if (liveRoomId) merged.liveRoomId = liveRoomId;

  const liveRoomPin = base.liveRoomPin ?? local.liveRoomPin ?? remote.liveRoomPin;
  if (liveRoomPin) merged.liveRoomPin = liveRoomPin;

  const lineupUpdatedAt = pickNewerIso(local.lineupUpdatedAt, remote.lineupUpdatedAt);
  if (lineupUpdatedAt) merged.lineupUpdatedAt = lineupUpdatedAt;

  return merged;
}
