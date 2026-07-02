const CLIENT_BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'dev';

function versionUrl(): string {
  const base = import.meta.env.BASE_URL ?? '/';
  return `${base}version.json?t=${Date.now()}`;
}

export function getClientBuildId(): string {
  return CLIENT_BUILD_ID;
}

export async function fetchServerBuildId(): Promise<string | null> {
  try {
    const res = await fetch(versionUrl(), { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { buildId?: string };
    return data.buildId ?? null;
  } catch {
    return null;
  }
}

export async function checkForAppUpdate(): Promise<boolean> {
  if (CLIENT_BUILD_ID === 'dev') return false;
  const serverId = await fetchServerBuildId();
  if (!serverId) return false;
  return serverId !== CLIENT_BUILD_ID;
}

/** 清除快取並強制載入最新版（適用主畫面捷徑 / PWA） */
export async function reloadToLatestApp(): Promise<void> {
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
  }

  const url = new URL(window.location.href);
  url.searchParams.set('_v', String(Date.now()));
  window.location.replace(url.toString());
}
