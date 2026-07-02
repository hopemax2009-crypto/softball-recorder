/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_DATABASE_URL?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_BUILD_ID?: string;
  readonly VITE_ALLOW_REGISTER?: string;
  readonly VITE_REGISTER_ALLOWED_USERNAMES?: string;
  readonly VITE_ADMIN_USERNAMES?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
