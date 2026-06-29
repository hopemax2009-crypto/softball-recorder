import type { UserData } from '../types';

const STORAGE_KEY = 'softball-recorder-data';
const OWNER_KEY = 'softball-recorder-owner';

export function createEmptyData(ownerId: string, ownerName: string): UserData {
  const now = new Date().toISOString();
  return {
    version: 1,
    ownerId,
    ownerName,
    players: [],
    seasons: [],
    games: [],
    updatedAt: now,
  };
}

export function loadData(): UserData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserData;
  } catch {
    return null;
  }
}

export function saveData(data: UserData): void {
  const updated = { ...data, updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function getOwnerInfo(): { id: string; name: string } | null {
  try {
    const raw = localStorage.getItem(OWNER_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setOwnerInfo(id: string, name: string): void {
  localStorage.setItem(OWNER_KEY, JSON.stringify({ id, name }));
}

export function exportData(data: UserData): string {
  return JSON.stringify(data, null, 2);
}

export function importData(json: string): UserData {
  const parsed = JSON.parse(json) as UserData;
  if (!parsed.version || !Array.isArray(parsed.games)) {
    throw new Error('無效的資料格式');
  }
  return parsed;
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
