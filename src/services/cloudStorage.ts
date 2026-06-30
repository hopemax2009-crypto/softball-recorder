import { get, ref, set } from 'firebase/database';
import type { UserData } from '../types';
import { getFirebaseDb } from '../config/firebase';
import { stripUndefined } from '../utils/firebaseSanitize';
import { migrateUserData } from '../utils/migrate';

function userDataRef(uid: string) {
  return ref(getFirebaseDb(), `userData/${uid}`);
}

export async function loadCloudData(uid: string): Promise<UserData | null> {
  const snap = await get(userDataRef(uid));
  const raw = snap.val() as UserData | null;
  if (!raw) return null;
  return migrateUserData(raw);
}

export async function saveCloudData(uid: string, data: UserData): Promise<void> {
  const payload: UserData = {
    ...migrateUserData(data),
    ownerId: uid,
    updatedAt: new Date().toISOString(),
  };
  await set(userDataRef(uid), stripUndefined(payload));
}
