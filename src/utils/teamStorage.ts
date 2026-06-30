const TEAM_CODE_KEY = 'softball-recorder-team-code';

export function normalizeTeamCode(code: string): string {
  return code.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

export function getTeamCode(): string {
  try {
    return localStorage.getItem(TEAM_CODE_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setTeamCode(code: string): void {
  localStorage.setItem(TEAM_CODE_KEY, normalizeTeamCode(code));
}
