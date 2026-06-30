import type { Game, Player } from '../types';

export interface LiveRoom {
  roomId: string;
  pin: string;
  hostName: string;
  opponent: string;
  game: Game;
  players: Player[];
  updatedAt: string;
}

export function buildRecorderJoinUrl(roomId: string, pin: string): string {
  const params = new URLSearchParams({ mode: 'recorder', room: roomId, pin: String(pin) });
  // 依目前網址產生 QR，避免 build 時 base path 與實際部署網址不一致
  const pathname = window.location.pathname.replace(/\/index\.html$/i, '');
  const basePath = pathname.replace(/\/+$/, '');
  return `${window.location.origin}${basePath}/?${params.toString()}`;
}

export function getRecorderParams(): { roomId: string; pin: string } | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') !== 'recorder') return null;
  const roomId = params.get('room')?.trim();
  const pin = params.get('pin')?.trim();
  if (!roomId || !pin) return null;
  return { roomId, pin: String(pin) };
}

export function qrCodeImageUrl(text: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}
