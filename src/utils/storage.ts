import type { UserData } from '../types';
import { migrateUserData } from './migrate';

const LEGACY_DATA_KEY = 'softball-recorder-data';
const LEGACY_OWNER_KEY = 'softball-recorder-owner';

function dataKey(userId: string): string {
  return `softball-recorder-data-${userId}`;
}

export function createEmptyData(ownerId: string, ownerName: string): UserData {
  const now = new Date().toISOString();
  return {
    version: 2,
    ownerId,
    ownerName,
    players: [],
    seasons: [],
    games: [],
    updatedAt: now,
  };
}

export function loadData(userId: string): UserData | null {
  try {
    const raw = localStorage.getItem(dataKey(userId));
    if (!raw) return tryLegacyMigration(userId);
    const data = JSON.parse(raw) as UserData;
    return migrateUserData(data);
  } catch {
    return null;
  }
}

function tryLegacyMigration(userId: string): UserData | null {
  try {
    const raw = localStorage.getItem(LEGACY_DATA_KEY);
    const ownerRaw = localStorage.getItem(LEGACY_OWNER_KEY);
    if (!raw || !ownerRaw) return null;
    const owner = JSON.parse(ownerRaw) as { id: string; name: string };
    if (owner.id !== userId) return null;
    const data = migrateUserData(JSON.parse(raw) as UserData);
    saveData(data);
    localStorage.removeItem(LEGACY_DATA_KEY);
    return data;
  } catch {
    return null;
  }
}

export function saveData(data: UserData): void {
  const updated = { ...migrateUserData(data), updatedAt: new Date().toISOString() };
  localStorage.setItem(dataKey(updated.ownerId), JSON.stringify(updated));
}

export function exportData(data: UserData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): UserData {
  const parsed = JSON.parse(json) as UserData;
  if (!parsed.version || !Array.isArray(parsed.games)) {
    throw new Error('無效的資料格式');
  }
  return migrateUserData(parsed);
}

export function downloadJson(data: UserData, filename?: string): void {
  const blob = new Blob([exportData(data)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename ?? `壘球紀錄_${data.ownerName}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
