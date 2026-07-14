import { initializeApp, type FirebaseApp } from 'firebase/app';
import { getDatabase, type Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
};

let app: FirebaseApp | null = null;
let db: Database | null = null;

export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig.apiKey && firebaseConfig.databaseURL);
}

/** 供錯誤訊息顯示（不含 API Key） */
export function getFirebaseDatabaseHost(): string {
  try {
    return firebaseConfig.databaseURL ? new URL(firebaseConfig.databaseURL).host : '(未設定)';
  } catch {
    return '(無效的 DATABASE_URL)';
  }
}

export function getFirebaseDb(): Database {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase 尚未設定，請聯繫管理者');
  }
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getDatabase(app);
  }
  return db!;
}
