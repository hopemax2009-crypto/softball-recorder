import { get, onValue, ref, runTransaction, set } from 'firebase/database';
import type { Game, Player } from '../types';
import { mergeGames } from '../utils/gameMerge';
import { normalizeGame } from '../utils/gameLogic';
import { stripUndefined } from '../utils/firebaseSanitize';
import { getFirebaseDb } from '../config/firebase';
import type { LiveRoom } from '../utils/liveRoom';

function sanitizeRoom(room: LiveRoom): LiveRoom {
  return stripUndefined(room);
}

function normalizeRoom(raw: LiveRoom): LiveRoom {
  return {
    ...raw,
    pin: String(raw.pin),
    game: normalizeGame(raw.game),
    players: raw.players ?? [],
  };
}

function roomRef(roomId: string) {
  return ref(getFirebaseDb(), `rooms/${roomId}`);
}

export function generateRoomId(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

export function generatePin(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function createLiveRoom(
  game: Game,
  players: Player[],
  hostName: string,
  pin: string,
  roomId?: string
): Promise<LiveRoom> {
  const id = roomId ?? generateRoomId();
  const room = sanitizeRoom({
    roomId: id,
    pin,
    hostName,
    opponent: game.opponent,
    game: normalizeGame({ ...game, liveRoomId: id, isShared: true, syncUpdatedAt: new Date().toISOString() }),
    players,
    updatedAt: new Date().toISOString(),
  });
  await set(roomRef(id), room);
  return room;
}

export async function updateLiveRoomGame(roomId: string, game: Game, players?: Player[]): Promise<void> {
  await runTransaction(roomRef(roomId), (current) => {
    if (!current) return current;
    const room = current as LiveRoom;
    const merged = mergeGames(normalizeGame(room.game), normalizeGame({ ...game, syncUpdatedAt: new Date().toISOString() }));
    return sanitizeRoom({
      ...room,
      game: merged,
      players: players ?? room.players ?? [],
      opponent: merged.opponent,
      updatedAt: new Date().toISOString(),
    });
  });
}

export function subscribeLiveRoom(
  roomId: string,
  pin: string,
  onUpdate: (room: LiveRoom) => void,
  onError: (msg: string) => void
): () => void {
  return onValue(
    roomRef(roomId),
    (snap) => {
      const raw = snap.val() as LiveRoom | null;
      if (!raw) {
        onError('找不到此場次，可能已結束');
        return;
      }
      const room = normalizeRoom(raw);
      if (String(room.pin) !== String(pin)) {
        onError('PIN 碼錯誤');
        return;
      }
      onUpdate(room);
    },
    (err) => onError(err.message)
  );
}

export async function joinLiveRoom(roomId: string, pin: string): Promise<LiveRoom> {
  const snap = await get(roomRef(roomId));
  const room = snap.val() as LiveRoom | null;
  if (!room) throw new Error('找不到此場次');
  const normalized = normalizeRoom(room);
  if (String(normalized.pin) !== String(pin)) throw new Error('PIN 碼錯誤');
  return normalized;
}

export async function closeLiveRoom(roomId: string): Promise<void> {
  await set(roomRef(roomId), null);
}
