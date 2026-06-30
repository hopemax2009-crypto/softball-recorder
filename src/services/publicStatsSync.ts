import { get, onValue, ref, set } from 'firebase/database';
import type { PublicStatsSnapshot } from '../types';
import { getFirebaseDb } from '../config/firebase';
import { stripUndefined } from '../utils/firebaseSanitize';
import { normalizeTeamCode } from '../utils/teamStorage';

function publicStatsRef(teamCode: string) {
  return ref(getFirebaseDb(), `publicStats/${normalizeTeamCode(teamCode)}`);
}

export async function publishPublicStats(snapshot: PublicStatsSnapshot): Promise<void> {
  const payload: PublicStatsSnapshot = {
    ...snapshot,
    teamCode: normalizeTeamCode(snapshot.teamCode),
    updatedAt: new Date().toISOString(),
  };
  await set(publicStatsRef(payload.teamCode), stripUndefined(payload));
}

export async function fetchPublicStats(teamCode: string): Promise<PublicStatsSnapshot | null> {
  const snap = await get(publicStatsRef(teamCode));
  const value = snap.val();
  if (!value) return null;
  return value as PublicStatsSnapshot;
}

export function subscribePublicStats(
  teamCode: string,
  onUpdate: (snapshot: PublicStatsSnapshot | null) => void
): () => void {
  const dbRef = publicStatsRef(teamCode);
  const unsub = onValue(dbRef, (snap) => {
    onUpdate((snap.val() as PublicStatsSnapshot | null) ?? null);
  });
  return unsub;
}
