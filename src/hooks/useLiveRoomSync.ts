import { useCallback, useEffect, useRef, useState } from 'react';
import type { Game, Player } from '../types';
import { mergeGames } from '../utils/gameMerge';
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
  enabled: boolean,
  getLocalGame?: () => Game | null
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
  const pushTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const getLocalGameRef = useRef(getLocalGame);
  const onGameUpdateRef = useRef(onGameUpdate);
  gameRef.current = game;
  playersRef.current = players;
  getLocalGameRef.current = getLocalGame;
  onGameUpdateRef.current = onGameUpdate;

  useEffect(() => () => clearTimeout(pushTimerRef.current), []);

  const pushGame = useCallback(async (g: Game, p: Player[]) => {
    if (!roomId || pushingRef.current) return;
    pushingRef.current = true;
    try {
      await updateLiveRoomGame(roomId, g, p);
      setSyncState((s) => ({
        ...s,
        syncing: false,
        connected: true,
        lastSync: new Date(),
        error: null,
      }));
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

  const schedulePush = useCallback(
    (g: Game) => {
      clearTimeout(pushTimerRef.current);
      pushTimerRef.current = setTimeout(() => {
        void pushGame(g, playersRef.current);
      }, 600);
    },
    [pushGame]
  );

  useEffect(() => {
    if (!enabled || !roomId || !pin) return;

    const unsub = subscribeLiveRoom(
      roomId,
      pin,
      (room: LiveRoom) => {
        setSyncState((s) => ({ ...s, connected: true, lastSync: new Date(), error: null }));
        const local = getLocalGameRef.current?.() ?? gameRef.current;
        const merged =
          local && local.liveRoomId === room.game.liveRoomId
            ? mergeGames(local, room.game, 'local')
            : room.game;
        onGameUpdateRef.current(merged, room.players);
      },
      (msg) => setSyncState((s) => ({ ...s, error: msg, connected: false }))
    );

    return unsub;
  }, [enabled, roomId, pin]);

  const pushNow = useCallback(() => {
    clearTimeout(pushTimerRef.current);
    const latest = getLocalGameRef.current?.() ?? gameRef.current;
    if (latest) void pushGame(latest, playersRef.current);
  }, [pushGame]);

  return { syncState, pushNow, schedulePush };
}
