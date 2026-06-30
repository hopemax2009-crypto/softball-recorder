import { get, onValue, ref, runTransaction, set } from 'firebase/database';
import type { Game, Player } from '../types';
import { mergeGames } from '../utils/gameMerge';
import { getFirebaseDb } from '../config/firebase';
import type { LiveRoom } from '../utils/liveRoom';

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
  const room: LiveRoom = {
    roomId: id,
    pin,
    hostName,
    opponent: game.opponent,
    game: { ...game, liveRoomId: id, isShared: true, syncUpdatedAt: new Date().toISOString() },
    players,
    updatedAt: new Date().toISOString(),
  };
  await set(roomRef(id), room);
  return room;
}

export async function updateLiveRoomGame(roomId: string, game: Game, players?: Player[]): Promise<void> {
  await runTransaction(roomRef(roomId), (current) => {
    if (!current) return current;
    const room = current as LiveRoom;
    const merged = mergeGames(room.game, { ...game, syncUpdatedAt: new Date().toISOString() });
    return {
      ...room,
      game: merged,
      players: players ?? room.players,
      opponent: merged.opponent,
      updatedAt: new Date().toISOString(),
    };
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
      const room = snap.val() as LiveRoom | null;
      if (!room) {
        onError('找不到此場次，可能已結束');
        return;
      }
      if (room.pin !== pin) {
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
  if (room.pin !== pin) throw new Error('PIN 碼錯誤');
  return room;
}

export async function closeLiveRoom(roomId: string): Promise<void> {
  await set(roomRef(roomId), null);
}
