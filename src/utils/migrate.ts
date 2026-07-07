import type { AtBat, Game, UserData } from '../types';
import { OUT_RESULTS } from '../types';
import { createDefaultGameFields } from './gameLogic';

function migrateAtBat(atBat: AtBat, defaultHalf: 'top' | 'bottom'): AtBat {
  return {
    ...atBat,
    inning: atBat.inning ?? 1,
    half: atBat.half ?? defaultHalf,
    outs: atBat.outs ?? (OUT_RESULTS.includes(atBat.result) ? 1 : 0),
  };
}

export function migrateGame(game: Game): Game {
  const defaults = createDefaultGameFields(game.isHomeTeam ?? true);
  const isHome = game.isHomeTeam ?? true;
  const ourHalf = isHome ? 'bottom' : 'top';

  return {
    ...game,
    ...defaults,
    isHomeTeam: isHome,
    totalInnings: game.totalInnings ?? 7,
    lineup: game.lineup ?? [],
    opponentScores: game.opponentScores ?? [],
    currentInning: game.currentInning ?? 1,
    currentHalf: game.currentHalf ?? (isHome ? 'top' : 'bottom'),
    atBats: (game.atBats ?? []).map((a) => migrateAtBat(a, ourHalf as 'top' | 'bottom')),
  };
}

export function migrateUserData(data: UserData): UserData {
  return {
    ...data,
    version: 2,
    games: data.games.map(migrateGame),
    lineupTemplates: data.lineupTemplates ?? [],
  };
}
