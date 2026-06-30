import type { AuthSession } from '../types';

const USERS_KEY = 'softball-recorder-users';
const SESSION_KEY = 'softball-recorder-session';

interface StoredUser {
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

interface UsersStore {
  users: StoredUser[];
}

function loadUsers(): UsersStore {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return { users: [] };
    return JSON.parse(raw) as UsersStore;
  } catch {
    return { users: [] };
  }
}

function saveUsers(store: UsersStore): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(store));
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  return Array.from(new Uint8Array(bits))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function randomSalt(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

export async function register(
  username: string,
  password: string,
  displayName: string
): Promise<AuthSession> {
  const trimmedUser = username.trim().toLowerCase();
  if (!trimmedUser || !password || password.length < 4) {
    throw new Error('帳號不可為空，密碼至少 4 碼');
  }
  const store = loadUsers();
  if (store.users.some((u) => u.username === trimmedUser)) {
    throw new Error('此帳號已被使用');
  }
  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const userId = trimmedUser;
  const user: StoredUser = {
    userId,
    username: trimmedUser,
    displayName: displayName.trim() || trimmedUser,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  saveUsers(store);
  const session: AuthSession = {
    userId,
    username: trimmedUser,
    displayName: user.displayName,
  };
  setSession(session);
  return session;
}

export async function login(username: string, password: string): Promise<AuthSession> {
  const trimmedUser = username.trim().toLowerCase();
  const store = loadUsers();
  const user = store.users.find((u) => u.username === trimmedUser);
  if (!user) throw new Error('帳號或密碼錯誤');
  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) throw new Error('帳號或密碼錯誤');
  const session: AuthSession = {
    userId: user.userId,
    username: user.username,
    displayName: user.displayName,
  };
  setSession(session);
  return session;
}

export function hasAnyUser(): boolean {
  return loadUsers().users.length > 0;
}
