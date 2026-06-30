import { normalizeTeamCode } from './teamStorage';

export function getPublicStatsParams(): { team: string } | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') !== 'stats') return null;
  const team = params.get('team')?.trim();
  if (!team) return null;
  const normalized = normalizeTeamCode(team);
  if (!normalized) return null;
  return { team: normalized };
}

export function buildPublicStatsUrl(teamCode: string): string {
  const params = new URLSearchParams({
    view: 'stats',
    team: normalizeTeamCode(teamCode),
  });
  const pathname = window.location.pathname.replace(/\/index\.html$/i, '');
  const basePath = pathname.replace(/\/+$/, '');
  return `${window.location.origin}${basePath}/?${params.toString()}`;
}
