import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { clearSession, getSession, setSession as saveAuthSession } from '../services/auth';
import { loadCloudData, saveCloudData } from '../services/cloudStorage';
import { isFirebaseConfigured } from '../config/firebase';
import type { AuthSession, Game, Player, Season, UserData } from '../types';
import { createDefaultGameFields } from '../utils/gameLogic';
import { createEmptyData, loadData, saveData } from '../utils/storage';

export interface CloudSyncState {
  syncing: boolean;
  lastSync: Date | null;
  error: string | null;
}

function pickNewerData(cloud: UserData | null, local: UserData | null): UserData | null {
  if (cloud && local) {
    return new Date(cloud.updatedAt) >= new Date(local.updatedAt) ? cloud : local;
  }
  return cloud ?? local;
}

export function useAppData() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudSync, setCloudSync] = useState<CloudSyncState>({
    syncing: false,
    lastSync: null,
    error: null,
  });
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;

  const pushToCloud = useCallback(async (uid: string, payload: UserData) => {
    if (!isFirebaseConfigured()) return;
    setCloudSync((s) => ({ ...s, syncing: true, error: null }));
    try {
      await saveCloudData(uid, payload);
      setCloudSync({ syncing: false, lastSync: new Date(), error: null });
    } catch (e) {
      setCloudSync({
        syncing: false,
        lastSync: null,
        error: e instanceof Error ? e.message : '雲端同步失敗',
      });
    }
  }, []);

  const loadUserData = useCallback(
    async (s: AuthSession) => {
      const local = loadData(s.userId);
      let resolved: UserData;

      if (isFirebaseConfigured()) {
        setCloudSync((state) => ({ ...state, syncing: true, error: null }));
        try {
          const cloud = await loadCloudData(s.userId);
          const picked = pickNewerData(cloud, local);
          if (picked) {
            resolved = { ...picked, ownerId: s.userId, ownerName: s.displayName };
          } else {
            resolved = createEmptyData(s.userId, s.displayName);
          }
          saveData(resolved);
          setData(resolved);
          await saveCloudData(s.userId, resolved);
          setCloudSync({ syncing: false, lastSync: new Date(), error: null });
        } catch (e) {
          if (local) {
            resolved = { ...local, ownerId: s.userId, ownerName: s.displayName };
            setData(resolved);
          } else {
            resolved = createEmptyData(s.userId, s.displayName);
            saveData(resolved);
            setData(resolved);
          }
          setCloudSync({
            syncing: false,
            lastSync: null,
            error: e instanceof Error ? e.message : '無法載入雲端資料',
          });
        }
      } else if (local) {
        resolved = local;
        setData(resolved);
      } else {
        resolved = createEmptyData(s.userId, s.displayName);
        saveData(resolved);
        setData(resolved);
      }
    },
    []
  );

  useEffect(() => {
    const s = getSession();
    if (s) {
      setSession(s);
      void loadUserData(s).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    return () => clearTimeout(cloudTimerRef.current);
  }, [loadUserData]);

  const onAuth = useCallback(
    (s: AuthSession) => {
      saveAuthSession(s);
      setSession(s);
      void loadUserData(s);
    },
    [loadUserData]
  );

  const onSessionUpdate = useCallback((s: AuthSession) => {
    saveAuthSession(s);
    setSession(s);
    setData((current) => {
      if (!current) return current;
      const next = {
        ...current,
        ownerName: s.displayName,
        updatedAt: new Date().toISOString(),
      };
      saveData(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    clearTimeout(cloudTimerRef.current);
    clearSession();
    setSession(null);
    setData(null);
    setCloudSync({ syncing: false, lastSync: null, error: null });
  }, []);

  const syncToCloudNow = useCallback(async () => {
    const s = sessionRef.current;
    if (!s || !data) return;
    await pushToCloud(s.userId, data);
  }, [data, pushToCloud]);

  const persist = useCallback(
    (newData: UserData) => {
      const s = sessionRef.current;
      if (!s) return;
      const updated: UserData = {
        ...newData,
        ownerId: s.userId,
        ownerName: s.displayName,
        updatedAt: new Date().toISOString(),
      };
      saveData(updated);
      setData(updated);

      if (!isFirebaseConfigured()) return;
      clearTimeout(cloudTimerRef.current);
      cloudTimerRef.current = setTimeout(() => {
        void pushToCloud(s.userId, updated);
      }, 800);
    },
    [pushToCloud]
  );

  const replaceData = useCallback(
    (newData: UserData) => {
      if (!session) return;
      persist(newData);
    },
    [session, persist]
  );

  const addSeason = useCallback(
    (name: string, year: number) => {
      if (!data) return;
      const season: Season = {
        id: uuid(),
        name,
        year,
        createdAt: new Date().toISOString(),
      };
      persist({ ...data, seasons: [...data.seasons, season] });
      return season;
    },
    [data, persist]
  );

  const addPlayer = useCallback(
    (name: string, number?: string) => {
      if (!data) return;
      const player: Player = {
        id: uuid(),
        name,
        number,
        createdAt: new Date().toISOString(),
      };
      persist({ ...data, players: [...data.players, player] });
      return player;
    },
    [data, persist]
  );

  const addGame = useCallback(
    (seasonId: string, date: string, opponent: string, location?: string, isHomeTeam = true) => {
      if (!data) return;
      const defaults = createDefaultGameFields(isHomeTeam);
      const game: Game = {
        id: uuid(),
        seasonId,
        date,
        opponent,
        location,
        atBats: [],
        createdAt: new Date().toISOString(),
        ...defaults,
        isHomeTeam,
      };
      persist({ ...data, games: [...data.games, game] });
      return game;
    },
    [data, persist]
  );

  const updateGame = useCallback((game: Game) => {
    setData((current) => {
      if (!current) return current;
      const updated: Game =
        game.isShared || game.liveRoomId
          ? { ...game, syncUpdatedAt: new Date().toISOString() }
          : game;
      const newData: UserData = {
        ...current,
        games: current.games.map((g) => (g.id === updated.id ? updated : g)),
        updatedAt: new Date().toISOString(),
      };
      window.setTimeout(() => saveData(newData), 0);
      const s = sessionRef.current;
      if (s && isFirebaseConfigured()) {
        clearTimeout(cloudTimerRef.current);
        cloudTimerRef.current = setTimeout(() => {
          void pushToCloud(s.userId, newData);
        }, 800);
      }
      return newData;
    });
  }, [pushToCloud]);

  const deleteGame = useCallback(
    (gameId: string) => {
      if (!data) return;
      persist({ ...data, games: data.games.filter((g) => g.id !== gameId) });
    },
    [data, persist]
  );

  const deletePlayer = useCallback(
    (playerId: string) => {
      if (!data) return;
      persist({
        ...data,
        players: data.players.filter((p) => p.id !== playerId),
        games: data.games.map((g) => ({
          ...g,
          lineup: g.lineup.filter((l) => l.playerId !== playerId),
          atBats: g.atBats.filter((a) => a.playerId !== playerId),
        })),
      });
    },
    [data, persist]
  );

  const upsertGame = useCallback(
    (game: Game) => {
      if (!data) return;
      const exists = data.games.some((g) => g.id === game.id);
      persist({
        ...data,
        games: exists
          ? data.games.map((g) => (g.id === game.id ? game : g))
          : [...data.games, game],
      });
      return game;
    },
    [data, persist]
  );

  const importSharedGame = useCallback(
    (game: Game, seasonId?: string) => {
      if (!data) return;
      const targetSeasonId = seasonId ?? data.seasons[0]?.id;
      if (!targetSeasonId) throw new Error('請先建立賽季');

      let players = [...data.players];
      if (game.rosterSnapshot) {
        for (const snap of game.rosterSnapshot) {
          if (!players.some((p) => p.id === snap.id)) {
            players.push({
              id: snap.id,
              name: snap.name,
              number: snap.number,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }

      const imported: Game = {
        ...game,
        seasonId: game.seasonId || targetSeasonId,
        isShared: true,
      };
      persist({
        ...data,
        players,
        games: data.games.some((g) => g.id === imported.id)
          ? data.games.map((g) => (g.id === imported.id ? imported : g))
          : [...data.games, imported],
      });
      return imported;
    },
    [data, persist]
  );

  const mergePlayersFromGame = useCallback(
    (game: Game) => {
      if (!data || !game.rosterSnapshot?.length) return;
      let changed = false;
      const players = [...data.players];
      for (const snap of game.rosterSnapshot) {
        if (!players.some((p) => p.id === snap.id)) {
          players.push({
            id: snap.id,
            name: snap.name,
            number: snap.number,
            createdAt: new Date().toISOString(),
          });
          changed = true;
        }
      }
      if (changed) persist({ ...data, players });
    },
    [data, persist]
  );

  return {
    session,
    data,
    loading,
    cloudSync,
    syncToCloudNow,
    onAuth,
    onSessionUpdate,
    logout,
    replaceData,
    addSeason,
    addPlayer,
    addGame,
    updateGame,
    deleteGame,
    deletePlayer,
    upsertGame,
    importSharedGame,
    mergePlayersFromGame,
  };
}
