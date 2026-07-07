import type { Game, LineupEntry, LineupTemplateEntry, Player } from '../types';
import { hasActiveLineup, touchLineup } from './gameLogic';

export function extractLineupTemplateEntries(game: Game): LineupTemplateEntry[] {
  return (game.lineup ?? [])
    .filter((l) => l.isActive)
    .map(({ playerId, battingOrder, position }) => ({ playerId, battingOrder, position }))
    .sort((a, b) => a.battingOrder - b.battingOrder);
}

export function findLineupSourceGames(games: Game[], currentGameId: string): Game[] {
  return games
    .filter((g) => g.id !== currentGameId && hasActiveLineup(g))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterEntriesByPlayers(
  entries: LineupTemplateEntry[],
  players: Player[]
): { entries: LineupTemplateEntry[]; skipped: string[] } {
  const validIds = new Set(players.map((p) => p.id));
  const skipped: string[] = [];
  const entriesByPlayer = new Map(players.map((p) => [p.id, p.name]));

  const filtered = entries.filter((entry) => {
    if (validIds.has(entry.playerId)) return true;
    skipped.push(entriesByPlayer.get(entry.playerId) ?? entry.playerId);
    return false;
  });

  return { entries: filtered, skipped };
}

export function applyLineupEntries(game: Game, entries: LineupTemplateEntry[]): Game {
  const lineup: LineupEntry[] = entries.map((entry) => ({
    playerId: entry.playerId,
    battingOrder: entry.battingOrder,
    position: entry.position,
    isActive: true,
  }));
  return touchLineup(game, lineup);
}

export function formatLineupSourceLabel(game: Game): string {
  return `${game.date} vs ${game.opponent}`;
}

export function countActiveLineup(game: Game): number {
  return (game.lineup ?? []).filter((l) => l.isActive).length;
}
