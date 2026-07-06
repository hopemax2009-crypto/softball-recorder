import { normalizeTeamCode } from './teamStorage';

/** Firebase 儲存鍵（與 publicStats 同為兩層路徑，規則較易設定） */
export function buildPublicGameReportKey(teamCode: string, gameId: string): string {
  return `${normalizeTeamCode(teamCode)}__${gameId}`;
}

export function buildPublicGameReportPath(teamCode: string, gameId: string): string {
  return `publicGameReports/${buildPublicGameReportKey(teamCode, gameId)}`;
}

export function getPublicGameReportParams(): { team: string; game: string } | null {
  const params = new URLSearchParams(window.location.search);
  if (params.get('view') !== 'report') return null;
  const team = params.get('team')?.trim();
  const game = params.get('game')?.trim();
  if (!team || !game) return null;
  const normalizedTeam = normalizeTeamCode(team);
  if (!normalizedTeam) return null;
  return { team: normalizedTeam, game };
}

export function buildPublicGameReportUrl(teamCode: string, gameId: string): string {
  const params = new URLSearchParams({
    view: 'report',
    team: normalizeTeamCode(teamCode),
    game: gameId,
  });
  const pathname = window.location.pathname.replace(/\/index\.html$/i, '');
  const basePath = pathname.replace(/\/+$/, '');
  return `${window.location.origin}${basePath}/?${params.toString()}`;
}
