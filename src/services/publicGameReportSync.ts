import { get, ref, set } from 'firebase/database';
import type { Game, Player, PublicGameReport } from '../types';
import { getFirebaseDb } from '../config/firebase';
import { normalizeGame } from '../utils/gameLogic';
import { stripUndefined } from '../utils/firebaseSanitize';
import { buildPublicGameReportPath } from '../utils/publicGameReport';
import { normalizeTeamCode } from '../utils/teamStorage';

function publicGameReportRef(teamCode: string, gameId: string) {
  return ref(getFirebaseDb(), buildPublicGameReportPath(teamCode, gameId));
}

function playersForGame(game: Game, players: Player[]): Player[] {
  const ids = new Set<string>();
  for (const atBat of game.atBats) ids.add(atBat.playerId);
  for (const entry of game.lineup ?? []) ids.add(entry.playerId);
  for (const snap of game.rosterSnapshot ?? []) ids.add(snap.id);
  for (const score of game.opponentScores ?? []) {
    if (score.pitcherId) ids.add(score.pitcherId);
    for (const run of score.pitcherRuns ?? []) {
      if (run.pitcherId) ids.add(run.pitcherId);
    }
  }

  const picked = players.filter((p) => ids.has(p.id));
  const known = new Set(picked.map((p) => p.id));
  for (const snap of game.rosterSnapshot ?? []) {
    if (!known.has(snap.id)) {
      picked.push({
        id: snap.id,
        name: snap.name,
        number: snap.number,
        createdAt: '',
      });
      known.add(snap.id);
    }
  }
  return picked;
}

function buildPublishPayload(report: PublicGameReport): PublicGameReport {
  const teamCode = normalizeTeamCode(report.teamCode);
  const game = normalizeGame(report.game);
  return {
    teamCode,
    teamName: report.teamName.trim() || teamCode,
    seasonName: report.seasonName,
    game,
    players: playersForGame(game, report.players),
    updatedAt: new Date().toISOString(),
    publishedBy: report.publishedBy,
  };
}

export async function publishPublicGameReport(report: PublicGameReport): Promise<void> {
  const payload = buildPublishPayload(report);
  await set(publicGameReportRef(payload.teamCode, payload.game.id), stripUndefined(payload));
}

export async function fetchPublicGameReport(
  teamCode: string,
  gameId: string
): Promise<PublicGameReport | null> {
  const snap = await get(publicGameReportRef(teamCode, gameId));
  const value = snap.val();
  if (!value) return null;
  return value as PublicGameReport;
}

export function getPublicGameReportWritePath(teamCode: string, gameId: string): string {
  return buildPublicGameReportPath(teamCode, gameId);
}
