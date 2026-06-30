import { get, ref, runTransaction } from 'firebase/database';
import { getFirebaseDb, isFirebaseConfigured } from '../config/firebase';
import { stripUndefined } from '../utils/firebaseSanitize';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

export interface CloudAccount {
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export function normalizeUsername(username: string): string {
  const trimmed = username.trim().toLowerCase();
  if (!USERNAME_RE.test(trimmed)) {
    throw new Error('帳號限英數字與底線，3–20 字');
  }
  return trimmed;
}

function accountRef(username: string) {
  return ref(getFirebaseDb(), `accounts/${username}`);
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

function mapDbError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PERMISSION_DENIED')) return '雲端權限不足，請管理者設定 Firebase 規則';
  return msg || '連線失敗';
}

export async function registerCloudAccount(
  username: string,
  password: string,
  displayName: string
): Promise<CloudAccount> {
  if (!isFirebaseConfigured()) throw new Error('雲端尚未設定，無法註冊');
  const name = normalizeUsername(username);
  if (!password || password.length < 4) throw new Error('密碼至少 4 碼');

  const salt = randomSalt();
  const passwordHash = await hashPassword(password, salt);
  const account: CloudAccount = {
    userId: name,
    username: name,
    displayName: displayName.trim() || name,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await runTransaction(accountRef(name), (current) => {
      if (current !== null) return;
      return stripUndefined(account);
    });
    if (!result.committed) {
      throw new Error('此帳號已被使用');
    }
    return account;
  } catch (err) {
    if (err instanceof Error && err.message === '此帳號已被使用') throw err;
    throw new Error(mapDbError(err));
  }
}

export async function loginCloudAccount(
  username: string,
  password: string
): Promise<CloudAccount> {
  if (!isFirebaseConfigured()) throw new Error('雲端尚未設定，無法登入');
  const name = normalizeUsername(username);
  if (!password) throw new Error('請輸入密碼');

  try {
    const snap = await get(accountRef(name));
    if (!snap.exists()) throw new Error('帳號或密碼錯誤');
    const account = snap.val() as CloudAccount;
    const hash = await hashPassword(password, account.salt);
    if (hash !== account.passwordHash) throw new Error('帳號或密碼錯誤');
    return account;
  } catch (err) {
    if (err instanceof Error && err.message === '帳號或密碼錯誤') throw err;
    throw new Error(mapDbError(err));
  }
}
