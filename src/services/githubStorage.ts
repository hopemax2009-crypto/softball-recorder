import type { GitHubConfig } from '../types';

export async function githubFetch(
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

export async function readJsonFile<T>(
  config: GitHubConfig,
  path: string
): Promise<{ data: T; sha: string } | null> {
  const res = await githubFetch(config, path);
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `讀取失敗 (${res.status})`);
  }
  const file = await res.json();
  const content = decodeURIComponent(
    escape(atob((file.content as string).replace(/\n/g, '')))
  );
  return { data: JSON.parse(content) as T, sha: file.sha as string };
}

export async function writeJsonFile<T>(
  config: GitHubConfig,
  path: string,
  data: T,
  message: string,
  sha?: string
): Promise<void> {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));
  const body = {
    message,
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
    throw new Error((err as { message?: string }).message || `寫入失敗 (${res.status})`);
  }
}
