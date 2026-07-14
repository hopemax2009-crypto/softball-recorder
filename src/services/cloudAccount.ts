import { get, ref, remove, runTransaction, set } from 'firebase/database';
import { getFirebaseDatabaseHost, getFirebaseDb, isFirebaseConfigured } from '../config/firebase';
import { stripUndefined } from '../utils/firebaseSanitize';

export const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const KNOWN_USERNAMES_KEY = 'softball-recorder-known-usernames';

export interface CloudAccount {
  userId: string;
  username: string;
  displayName: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface AdminAccountView {
  userId: string;
  username: string;
  displayName: string;
  createdAt: string;
  passwordHash: string;
}

/** 帳號目錄（不含密碼雜湊；用於列出帳號，避免必讀整個 /accounts） */
interface AccountDirectoryEntry {
  username: string;
  displayName: string;
  userId: string;
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

function accountsRef() {
  return ref(getFirebaseDb(), 'accounts');
}

function accountDirectoryRef() {
  return ref(getFirebaseDb(), 'accountDirectory');
}

function accountDirectoryEntryRef(username: string) {
  return ref(getFirebaseDb(), `accountDirectory/${username}`);
}

function toDirectoryEntry(account: CloudAccount): AccountDirectoryEntry {
  return {
    username: account.username,
    displayName: account.displayName,
    userId: account.userId,
    createdAt: account.createdAt,
  };
}

/** 同步帳號目錄；失敗不阻擋主流程（舊規則可能尚未開此路徑） */
async function upsertAccountDirectory(account: CloudAccount, previousUsername?: string): Promise<void> {
  try {
    await set(accountDirectoryEntryRef(account.username), stripUndefined(toDirectoryEntry(account)));
    if (previousUsername && previousUsername !== account.username) {
      await remove(accountDirectoryEntryRef(previousUsername));
    }
  } catch {
    // ignore — 清單會用 /accounts 或提示規則
  }
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

function isPermissionDenied(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('PERMISSION_DENIED') || msg.includes('Permission denied');
}

function rememberKnownUsername(username: string): void {
  try {
    const name = username.trim().toLowerCase();
    if (!name) return;
    const raw = localStorage.getItem(KNOWN_USERNAMES_KEY);
    const list: string[] = raw ? (JSON.parse(raw) as string[]) : [];
    if (!list.includes(name)) {
      list.push(name);
      localStorage.setItem(KNOWN_USERNAMES_KEY, JSON.stringify(list));
    }
  } catch {
    // ignore
  }
}

function loadKnownUsernamesLocal(): string[] {
  try {
    const raw = localStorage.getItem(KNOWN_USERNAMES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as string[];
    return Array.isArray(list) ? list.map((u) => String(u).toLowerCase()).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function envKnownUsernames(): string[] {
  const parse = (raw?: string) =>
    (raw ?? '')
      .split(',')
      .map((v) => v.trim().toLowerCase())
      .filter(Boolean);
  return [
    ...parse(import.meta.env.VITE_ADMIN_USERNAMES),
    ...parse(import.meta.env.VITE_REGISTER_ALLOWED_USERNAMES),
  ];
}

function permissionHint(): string {
  const host = getFirebaseDatabaseHost();
  return [
    `雲端權限不足（連線資料庫：${host}）。`,
    '請確認 asia-southeast1 規則允許讀取 accounts（父節點 ".read": true）。',
  ].join('');
}

function mapDbError(err: unknown, context?: 'list' | 'write'): string {
  if (isPermissionDenied(err)) {
    if (context === 'list' || context === 'write') return permissionHint();
    return permissionHint();
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg || '連線失敗';
}

function toAdminView(account: CloudAccount): AdminAccountView {
  return {
    userId: account.userId,
    username: account.username,
    displayName: account.displayName,
    createdAt: account.createdAt,
    passwordHash: account.passwordHash,
  };
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
    await upsertAccountDirectory(account);
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
    rememberKnownUsername(account.username);
    // 順便補齊目錄（不阻塞登入；規則未開時會靜默失敗）
    void upsertAccountDirectory(account);
    return account;
  } catch (err) {
    if (err instanceof Error && err.message === '帳號或密碼錯誤') throw err;
    throw new Error(mapDbError(err));
  }
}

export async function updateCloudAccountCredentials(
  currentUsername: string,
  currentPassword: string,
  nextUsername: string,
  nextPassword: string | undefined,
  nextDisplayName: string | undefined
): Promise<CloudAccount> {
  if (!isFirebaseConfigured()) throw new Error('雲端尚未設定，無法更新帳號');
  const current = await loginCloudAccount(currentUsername, currentPassword);
  const targetUsername = normalizeUsername(nextUsername || current.username);
  const targetDisplayName = nextDisplayName?.trim() || current.displayName;
  const targetPassword = nextPassword?.trim() || '';
  if (targetPassword && targetPassword.length < 4) {
    throw new Error('新密碼至少 4 碼');
  }

  const nextSalt = targetPassword ? randomSalt() : current.salt;
  const nextHash = targetPassword ? await hashPassword(targetPassword, nextSalt) : current.passwordHash;

  const updated: CloudAccount = {
    ...current,
    username: targetUsername,
    displayName: targetDisplayName,
    passwordHash: nextHash,
    salt: nextSalt,
  };

  try {
    if (targetUsername === current.username) {
      await set(accountRef(current.username), stripUndefined(updated));
      await upsertAccountDirectory(updated);
      return updated;
    }

    const result = await runTransaction(accountRef(targetUsername), (existing) => {
      if (existing !== null) return;
      return stripUndefined(updated);
    });
    if (!result.committed) {
      throw new Error('此帳號已被使用');
    }
    await set(accountRef(current.username), null);
    await upsertAccountDirectory(updated, current.username);
    return updated;
  } catch (err) {
    if (err instanceof Error && err.message === '此帳號已被使用') throw err;
    throw new Error(mapDbError(err, 'write'));
  }
}

async function listFromAccountsRoot(): Promise<AdminAccountView[] | null> {
  try {
    const snap = await get(accountsRef());
    if (!snap.exists()) return [];
    const raw = (snap.val() ?? {}) as Record<string, CloudAccount>;
    const views = Object.values(raw)
      .filter((a) => a && a.username)
      .map(toAdminView)
      .sort((a, b) => a.username.localeCompare(b.username, 'zh-TW'));
    // 將結果回填目錄，之後可用目錄方式列出
    for (const account of Object.values(raw)) {
      if (account?.username) void upsertAccountDirectory(account);
    }
    return views;
  } catch (err) {
    if (isPermissionDenied(err)) return null;
    throw err;
  }
}

async function listFromDirectory(): Promise<AdminAccountView[] | null> {
  try {
    const snap = await get(accountDirectoryRef());
    if (!snap.exists()) return [];
    const raw = (snap.val() ?? {}) as Record<string, AccountDirectoryEntry>;
    const usernames = Object.keys(raw).sort((a, b) => a.localeCompare(b, 'zh-TW'));
    const views: AdminAccountView[] = [];
    for (const name of usernames) {
      try {
        const accSnap = await get(accountRef(name));
        if (!accSnap.exists()) continue;
        views.push(toAdminView(accSnap.val() as CloudAccount));
      } catch (err) {
        if (isPermissionDenied(err)) throw err;
      }
    }
    return views;
  } catch (err) {
    if (isPermissionDenied(err)) return null;
    throw err;
  }
}

async function fetchAccountViewsByUsernames(usernames: string[]): Promise<AdminAccountView[]> {
  const unique = [...new Set(usernames.map((u) => u.trim().toLowerCase()).filter(Boolean))];
  const views: AdminAccountView[] = [];
  for (const name of unique) {
    try {
      const snap = await get(accountRef(name));
      if (!snap.exists()) continue;
      const account = snap.val() as CloudAccount;
      views.push(toAdminView(account));
      rememberKnownUsername(name);
      void upsertAccountDirectory(account);
    } catch (err) {
      if (isPermissionDenied(err)) {
        // 單筆也被拒才算真的權限全面失敗
        throw err;
      }
    }
  }
  return views.sort((a, b) => a.username.localeCompare(b.username, 'zh-TW'));
}

export async function listCloudAccountsForAdmin(
  extraUsernames: string[] = []
): Promise<AdminAccountView[]> {
  if (!isFirebaseConfigured()) throw new Error('雲端尚未設定，無法查詢帳號');
  try {
    // 優先讀整個 /accounts（規則已開父節點 .read 時可一次拿到全部）
    const fromRoot = await listFromAccountsRoot();
    if (fromRoot && fromRoot.length > 0) return fromRoot;

    const fromDir = await listFromDirectory();
    if (fromDir && fromDir.length > 0) return fromDir;

    // 備援：逐筆讀 accounts/{username}
    const candidates = [
      ...extraUsernames,
      ...envKnownUsernames(),
      ...loadKnownUsernamesLocal(),
    ];
    const fromKnown = await fetchAccountViewsByUsernames(candidates);
    if (fromKnown.length > 0) return fromKnown;

    throw new Error(
      [
        permissionHint(),
        '目前查無帳號。可在下方輸入帳號名稱查詢，或確認 Firebase accounts 節點有資料。',
      ].join('')
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes('連線資料庫')) throw err;
    throw new Error(mapDbError(err, 'list'));
  }
}

/** 管理者依帳號名稱逐筆查詢（不需讀 /accounts 父節點） */
export async function lookupCloudAccountForAdmin(username: string): Promise<AdminAccountView> {
  if (!isFirebaseConfigured()) throw new Error('雲端尚未設定，無法查詢帳號');
  const name = normalizeUsername(username);
  try {
    const snap = await get(accountRef(name));
    if (!snap.exists()) throw new Error(`找不到帳號：${name}`);
    const account = snap.val() as CloudAccount;
    rememberKnownUsername(name);
    void upsertAccountDirectory(account);
    return toAdminView(account);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('找不到帳號')) throw err;
    throw new Error(mapDbError(err, 'list'));
  }
}

export async function adminResetCloudAccountPassword(
  username: string,
  newPassword: string
): Promise<void> {
  if (!isFirebaseConfigured()) throw new Error('雲端尚未設定，無法重設密碼');
  const name = normalizeUsername(username);
  if (!newPassword || newPassword.length < 4) {
    throw new Error('新密碼至少 4 碼');
  }

  try {
    const snap = await get(accountRef(name));
    if (!snap.exists()) throw new Error('找不到此帳號');
    const account = snap.val() as CloudAccount;
    const salt = randomSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    const updated: CloudAccount = {
      ...account,
      salt,
      passwordHash,
    };
    await set(accountRef(name), stripUndefined(updated));
    await upsertAccountDirectory(updated);
  } catch (err) {
    if (err instanceof Error && err.message === '找不到此帳號') throw err;
    throw new Error(mapDbError(err, 'write'));
  }
}
