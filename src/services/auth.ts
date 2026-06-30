import type { AuthSession } from '../types';
import { loginCloudAccount, registerCloudAccount } from './cloudAccount';

const SESSION_KEY = 'softball-recorder-session';

export function getSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}

function accountToSession(account: { userId: string; username: string; displayName: string }): AuthSession {
  return {
    userId: account.userId,
    username: account.username,
    displayName: account.displayName,
  };
}

export async function register(
  username: string,
  password: string,
  displayName: string
): Promise<AuthSession> {
  const account = await registerCloudAccount(username, password, displayName);
  const session = accountToSession(account);
  setSession(session);
  return session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const account = await loginCloudAccount(username, password);
  const session = accountToSession(account);
  setSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}
