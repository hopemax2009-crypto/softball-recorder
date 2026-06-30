import type { GitHubConfig, UserData } from '../types';

const GITHUB_CONFIG_KEY = 'softball-recorder-github';

export function loadGitHubConfig(): GitHubConfig | null {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
}

function getDataPath(ownerId: string): string {
  return `data/${ownerId}/records.json`;
}

async function githubFetch(
  config: GitHubConfig,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${path}?ref=${config.branch}`;
  return fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${config.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...options.headers,
    },
  });
}

export async function verifyGitHubToken(config: GitHubConfig): Promise<{ login: string; name: string }> {
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${config.token}`,
      Accept: 'application/vnd.github+json',
    },
  });
  if (!res.ok) {
    throw new Error('GitHub Token 無效或已過期');
  }
  const user = await res.json();
  return { login: user.login, name: user.name || user.login };
}

export async function pullFromGitHub(
  config: GitHubConfig,
  ownerId: string
): Promise<UserData | null> {
  const path = getDataPath(ownerId);
  const res = await githubFetch(config, path);

  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `下載失敗 (${res.status})`);
  }

  const file = await res.json();
  const content = atob(file.content.replace(/\n/g, ''));
  return JSON.parse(content) as UserData;
}

export async function pushToGitHub(
  config: GitHubConfig,
  data: UserData
): Promise<void> {
  const path = getDataPath(data.ownerId);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  const existingRes = await githubFetch(config, path);
  let sha: string | undefined;

  if (existingRes.ok) {
    const existing = await existingRes.json();
    sha = existing.sha;
  }

  const body = {
    message: `更新壘球紀錄 - ${data.ownerName} - ${new Date().toLocaleString('zh-TW')}`,
    content,
    branch: config.branch,
    ...(sha ? { sha } : {}),
  };

  const res = await githubFetch(config, path, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `上傳失敗 (${res.status})`);
  }
}

export async function syncWithGitHub(
  config: GitHubConfig,
  localData: UserData
): Promise<{ data: UserData; action: 'pushed' | 'pulled' | 'merged' }> {
  const remote = await pullFromGitHub(config, localData.ownerId);

  if (!remote) {
    await pushToGitHub(config, localData);
    return { data: localData, action: 'pushed' };
  }

  const localTime = new Date(localData.updatedAt).getTime();
  const remoteTime = new Date(remote.updatedAt).getTime();

  if (remoteTime > localTime) {
    return { data: remote, action: 'pulled' };
  }

  if (localTime > remoteTime) {
    await pushToGitHub(config, localData);
    return { data: localData, action: 'pushed' };
  }

  return { data: localData, action: 'merged' };
}
