import type { Game, OpponentHeadToHead, Season, SeasonTeamRecord, TeamRecordSummary } from '../types';
import { getGameOutcome } from './gameLogic';

function emptyRecord(): TeamRecordSummary {
  return { wins: 0, losses: 0, ties: 0, games: 0, winRate: null };
}

function applyOutcome(record: TeamRecordSummary, outcome: 'win' | 'loss' | 'tie'): TeamRecordSummary {
  const next = { ...record };
  if (outcome === 'win') next.wins++;
  else if (outcome === 'loss') next.losses++;
  else next.ties++;
  next.games = next.wins + next.losses + next.ties;
  const decided = next.wins + next.losses;
  next.winRate = decided > 0 ? next.wins / decided : null;
  return next;
}

function filterGames(games: Game[], seasonId?: string): Game[] {
  return seasonId ? games.filter((g) => g.seasonId === seasonId) : games;
}

export function calculateTeamRecord(games: Game[], seasonId?: string): TeamRecordSummary {
  let record = emptyRecord();
  for (const game of filterGames(games, seasonId)) {
    const outcome = getGameOutcome(game);
    if (!outcome) continue;
    record = applyOutcome(record, outcome);
  }
  return record;
}

export function calculateSeasonTeamRecords(games: Game[], seasons: Season[]): SeasonTeamRecord[] {
  return seasons
    .map((season) => {
      const record = calculateTeamRecord(games, season.id);
      return {
        ...record,
        seasonId: season.id,
        seasonLabel: `${season.year} ${season.name}`,
        seasonYear: season.year,
      };
    })
    .filter((row) => row.games > 0)
    .sort((a, b) => b.seasonYear - a.seasonYear || b.seasonLabel.localeCompare(a.seasonLabel, 'zh-TW'));
}

export function calculateHeadToHead(games: Game[], seasonId?: string): OpponentHeadToHead[] {
  const map = new Map<string, TeamRecordSummary>();

  for (const game of filterGames(games, seasonId)) {
    const outcome = getGameOutcome(game);
    if (!outcome) continue;
    const opponent = game.opponent.trim() || '未知對手';
    const current = map.get(opponent) ?? emptyRecord();
    map.set(opponent, applyOutcome(current, outcome));
  }

  return [...map.entries()]
    .map(([opponent, record]) => ({ opponent, ...record }))
    .sort((a, b) => b.games - a.games || a.opponent.localeCompare(b.opponent, 'zh-TW'));
}

export function formatWinRate(rate: number | null): string {
  if (rate === null) return '—';
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatRecord(record: TeamRecordSummary): string {
  const parts = [`${record.wins}勝`, `${record.losses}敗`];
  if (record.ties > 0) parts.push(`${record.ties}和`);
  return parts.join('');
}
