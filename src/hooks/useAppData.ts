import { useCallback, useEffect, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { Game, Player, Season, UserData } from '../types';
import {
  createEmptyData,
  getOwnerInfo,
  loadData,
  saveData,
  setOwnerInfo,
} from '../utils/storage';

export function useAppData() {
  const [data, setData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const owner = getOwnerInfo();
    const saved = loadData();
    if (saved) {
      setData(saved);
    } else if (owner) {
      setData(createEmptyData(owner.id, owner.name));
    }
    setLoading(false);
  }, []);

  const persist = useCallback((newData: UserData) => {
    saveData(newData);
    setData(newData);
  }, []);

  const initOwner = useCallback((id: string, name: string) => {
    setOwnerInfo(id, name);
    const existing = loadData();
    if (existing && existing.ownerId === id) {
      setData(existing);
    } else {
      persist(createEmptyData(id, name));
    }
  }, [persist]);

  const replaceData = useCallback((newData: UserData) => {
    setOwnerInfo(newData.ownerId, newData.ownerName);
    persist(newData);
  }, [persist]);

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
    (seasonId: string, date: string, opponent: string, location?: string) => {
      if (!data) return;
      const game: Game = {
        id: uuid(),
        seasonId,
        date,
        opponent,
        location,
        atBats: [],
        createdAt: new Date().toISOString(),
      };
      persist({ ...data, games: [...data.games, game] });
      return game;
    },
    [data, persist]
  );

  const updateGame = useCallback(
    (game: Game) => {
      if (!data) return;
      persist({
        ...data,
        games: data.games.map((g) => (g.id === game.id ? game : g)),
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
          atBats: g.atBats.filter((a) => a.playerId !== playerId),
        })),
      });
    },
    [data, persist]
  );

  return {
    data,
    loading,
    initOwner,
    replaceData,
    addSeason,
    addPlayer,
    addGame,
    updateGame,
    deleteGame,
    deletePlayer,
  };
}
