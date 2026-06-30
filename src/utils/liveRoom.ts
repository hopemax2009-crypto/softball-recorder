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
  const base = import.meta.env.BASE_URL || '/';
  const root = `${window.location.origin}${base}`.replace(/\/+$/, '');
  const params = new URLSearchParams({ mode: 'recorder', room: roomId, pin });
  return `${root}/?${params.toString()}`;
}

export function getRecorderParams(): { roomId: string; pin: string } | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') !== 'recorder') return null;
  const roomId = params.get('room');
  const pin = params.get('pin');
  if (!roomId || !pin) return null;
  return { roomId, pin };
}

export function qrCodeImageUrl(text: string, size = 220): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
}
