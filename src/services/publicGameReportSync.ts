import { get, ref, set } from 'firebase/database';
import type { PublicGameReport } from '../types';
import { getFirebaseDb } from '../config/firebase';
import { stripUndefined } from '../utils/firebaseSanitize';
import { normalizeTeamCode } from '../utils/teamStorage';

function publicGameReportRef(teamCode: string, gameId: string) {
  return ref(getFirebaseDb(), `publicGameReports/${normalizeTeamCode(teamCode)}/${gameId}`);
}

export async function publishPublicGameReport(report: PublicGameReport): Promise<void> {
  const teamCode = normalizeTeamCode(report.teamCode);
  const payload: PublicGameReport = {
    ...report,
    teamCode,
    updatedAt: new Date().toISOString(),
  };
  await set(publicGameReportRef(teamCode, report.game.id), stripUndefined(payload));
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
