import type { AuthSession } from '../types';
import {
  adminResetCloudAccountPassword,
  listCloudAccountsForAdmin,
  loginCloudAccount,
  lookupCloudAccountForAdmin,
  registerCloudAccount,
  type AdminAccountView,
  updateCloudAccountCredentials,
} from './cloudAccount';

const SESSION_KEY = 'softball-recorder-session';
const LAST_USERNAME_KEY = 'softball-recorder-last-username';

export function getLastUsername(): string {
  try {
    return localStorage.getItem(LAST_USERNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveLastUsername(username: string): void {
  try {
    localStorage.setItem(LAST_USERNAME_KEY, username.trim().toLowerCase());
  } catch {
    // ignore quota / private mode
  }
}

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

function parseUsernameList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

const ALLOW_REGISTER = import.meta.env.VITE_ALLOW_REGISTER === 'true';
const REGISTER_USERNAMES = parseUsernameList(import.meta.env.VITE_REGISTER_ALLOWED_USERNAMES);
const ADMIN_USERNAMES = parseUsernameList(import.meta.env.VITE_ADMIN_USERNAMES);

export function canUseRegisterForUsername(username: string): boolean {
  if (!ALLOW_REGISTER) return false;
  if (REGISTER_USERNAMES.length === 0) return true;
  return REGISTER_USERNAMES.includes(username.trim().toLowerCase());
}

export function isAdminUser(username: string): boolean {
  return ADMIN_USERNAMES.includes(username.trim().toLowerCase());
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

export async function createAccount(
  operatorUsername: string,
  username: string,
  password: string,
  displayName: string
): Promise<void> {
  if (!canUseRegisterForUsername(operatorUsername)) {
    throw new Error('目前帳號沒有註冊權限');
  }
  await registerCloudAccount(username, password, displayName);
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const account = await loginCloudAccount(username, password);
  const session = accountToSession(account);
  saveLastUsername(session.username);
  setSession(session);
  return session;
}

export function logout(): void {
  clearSession();
}

export async function changeCredentials(
  session: AuthSession,
  currentPassword: string,
  nextUsername: string,
  nextPassword?: string,
  nextDisplayName?: string
): Promise<AuthSession> {
  const account = await updateCloudAccountCredentials(
    session.username,
    currentPassword,
    nextUsername,
    nextPassword,
    nextDisplayName
  );
  const nextSession = accountToSession(account);
  saveLastUsername(nextSession.username);
  setSession(nextSession);
  return nextSession;
}

export async function listAdminAccounts(
  currentUsername: string,
  extraUsernames: string[] = []
): Promise<AdminAccountView[]> {
  if (!isAdminUser(currentUsername)) {
    throw new Error('僅管理者可查看帳號清單');
  }
  return listCloudAccountsForAdmin(extraUsernames);
}

export async function lookupAdminAccount(
  currentUsername: string,
  targetUsername: string
): Promise<AdminAccountView> {
  if (!isAdminUser(currentUsername)) {
    throw new Error('僅管理者可查看帳號');
  }
  return lookupCloudAccountForAdmin(targetUsername);
}

export async function adminResetAccountPassword(
  currentUsername: string,
  targetUsername: string,
  newPassword: string
): Promise<void> {
  if (!isAdminUser(currentUsername)) {
    throw new Error('僅管理者可重設密碼');
  }
  await adminResetCloudAccountPassword(targetUsername, newPassword);
}
