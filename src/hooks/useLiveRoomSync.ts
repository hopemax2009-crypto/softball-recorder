import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, Player } from '../types';
import { subscribeLiveRoom, updateLiveRoomGame } from '../services/liveRoomSync';
import type { LiveRoom } from '../utils/liveRoom';

export interface LiveSyncState {
  connected: boolean;
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

export function useLiveRoomSync(
  roomId: string | undefined,
  pin: string | undefined,
  game: Game | null,
  players: Player[],
  onGameUpdate: (game: Game, players: Player[]) => void,
  enabled: boolean
) {
  const [syncState, setSyncState] = useState<LiveSyncState>({
    connected: false,
    syncing: false,
    lastSync: null,
    error: null,
  });
  const gameRef = useRef(game);
  const playersRef = useRef(players);
  const pushingRef = useRef(false);
  gameRef.current = game;
  playersRef.current = players;

  const pushGame = useCallback(async (g: Game, p: Player[]) => {
    if (!roomId || pushingRef.current) return;
    pushingRef.current = true;
    setSyncState((s) => ({ ...s, syncing: true }));
    try {
      await updateLiveRoomGame(roomId, g, p);
      setSyncState((s) => ({ ...s, syncing: false, lastSync: new Date(), error: null }));
    } catch (e) {
      setSyncState((s) => ({
        ...s,
        syncing: false,
        error: e instanceof Error ? e.message : '同步失敗',
      }));
    } finally {
      pushingRef.current = false;
    }
  }, [roomId]);

  useEffect(() => {
    if (!enabled || !roomId || !pin) return;

    const unsub = subscribeLiveRoom(
      roomId,
      pin,
      (room: LiveRoom) => {
        if (pushingRef.current) return;
        setSyncState({ connected: true, syncing: false, lastSync: new Date(), error: null });
        onGameUpdate(room.game, room.players);
      },
      (msg) => setSyncState((s) => ({ ...s, error: msg, connected: false }))
    );

    return unsub;
  }, [enabled, roomId, pin, onGameUpdate]);

  useEffect(() => {
    if (!enabled || !roomId || !game?.liveRoomId) return;
    const timer = setTimeout(() => {
      if (gameRef.current) pushGame(gameRef.current, playersRef.current);
    }, 600);
    return () => clearTimeout(timer);
  }, [enabled, roomId, game, players, pushGame]);

  return { syncState, pushNow: () => gameRef.current && pushGame(gameRef.current, playersRef.current) };
}
