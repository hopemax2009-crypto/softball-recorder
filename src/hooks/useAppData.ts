import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import { getSession, clearSession } from '../services/auth';
import type { AuthSession, Game, Player, Season, UserData } from '../types';
import { createDefaultGameFields } from '../utils/gameLogic';
import { createEmptyData, loadData, saveData } from '../utils/storage';

export function useAppData() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserData = useCallback((s: AuthSession) => {
    const saved = loadData(s.userId);
    if (saved) {
      setData(saved);
    } else {
      const empty = createEmptyData(s.userId, s.displayName);
      saveData(empty);
      setData(empty);
    }
  }, []);

  useEffect(() => {
    const s = getSession();
    if (s) {
      setSession(s);
      loadUserData(s);
    }
    setLoading(false);
  }, [loadUserData]);

  const onAuth = useCallback(
    (s: AuthSession) => {
      setSession(s);
      loadUserData(s);
    },
    [loadUserData]
  );

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
    setData(null);
  }, []);

  const persist = useCallback(
    (newData: UserData) => {
      if (!session) return;
      saveData(newData);
      setData(newData);
    },
    [session]
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

  const updateGame = useCallback(
    (game: Game) => {
      if (!data) return;
      const updated: Game = game.isShared
        ? { ...game, syncUpdatedAt: new Date().toISOString() }
        : game;
      persist({
        ...data,
        games: data.games.map((g) => (g.id === updated.id ? updated : g)),
      });
    },
    [data, persist]
  );

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
    onAuth,
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
