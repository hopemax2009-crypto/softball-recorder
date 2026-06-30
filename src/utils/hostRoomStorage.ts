const HOST_ROOMS_KEY = 'softball-host-rooms';
const LEGACY_HOST_ROOM_KEY = 'softball-host-room';

export interface HostRoomInfo {
  gameId: string;
  roomId: string;
  pin: string;
}

function loadAllHostRooms(): Record<string, HostRoomInfo> {
  try {
    const raw = localStorage.getItem(HOST_ROOMS_KEY);
    if (raw) return JSON.parse(raw) as Record<string, HostRoomInfo>;

    const legacy = localStorage.getItem(LEGACY_HOST_ROOM_KEY);
    if (legacy) {
      const info = JSON.parse(legacy) as HostRoomInfo;
      const map = { [info.gameId]: info };
      localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(map));
      localStorage.removeItem(LEGACY_HOST_ROOM_KEY);
      return map;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveHostRoom(info: HostRoomInfo): void {
  const all = loadAllHostRooms();
  all[info.gameId] = info;
  localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(all));
}

export function loadHostRoom(gameId: string): HostRoomInfo | null {
  return loadAllHostRooms()[gameId] ?? null;
}

export function clearHostRoom(gameId?: string): void {
  if (gameId) {
    const all = loadAllHostRooms();
    delete all[gameId];
    localStorage.setItem(HOST_ROOMS_KEY, JSON.stringify(all));
  } else {
    localStorage.removeItem(HOST_ROOMS_KEY);
    localStorage.removeItem(LEGACY_HOST_ROOM_KEY);
  }
}
