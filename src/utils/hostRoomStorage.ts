const HOST_ROOM_KEY = 'softball-host-room';

export interface HostRoomInfo {
  gameId: string;
  roomId: string;
  pin: string;
}

export function saveHostRoom(info: HostRoomInfo): void {
  localStorage.setItem(HOST_ROOM_KEY, JSON.stringify(info));
}

export function loadHostRoom(gameId: string): HostRoomInfo | null {
  try {
    const raw = localStorage.getItem(HOST_ROOM_KEY);
    if (!raw) return null;
    const info = JSON.parse(raw) as HostRoomInfo;
    return info.gameId === gameId ? info : null;
  } catch {
    return null;
  }
}

export function clearHostRoom(): void {
  localStorage.removeItem(HOST_ROOM_KEY);
}
