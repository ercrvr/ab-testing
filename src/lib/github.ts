import { Octokit } from '@octokit/rest';
import { cacheGetEntry, cacheSet, cacheRefresh, TTL } from './cache';

let octokitInstance: Octokit | null = null;

export function initOctokit(token: string): void {
  octokitInstance = new Octokit({ auth: token });
}

export function clearOctokit(): void {
  octokitInstance = null;
}

export function getOctokit(): Octokit {
  if (!octokitInstance) throw new Error('Octokit not initialized. Please log in.');
  return octokitInstance;
}

// ── Types ──

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: string;
  sha: string;
  size?: number;
  url: string;
}

// ── Rate Limit Tracking ──

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number;
  lastChecked: number;
}

let rateLimitInfo: RateLimitInfo = {
  remaining: 5000,
  limit: 5000,
  reset: 0,
  lastChecked: 0,
};

const rateLimitListeners = new Set<() => void>();

export function getRateLimitInfo(): RateLimitInfo {
  return { ...rateLimitInfo };
}

export function subscribeRateLimit(listener: () => void): () => void {
  rateLimitListeners.add(listener);
  return () => {
    rateLimitListeners.delete(listener);
  };
}

function updateRateLimit(headers: Record<string, string | undefined>): void {
  const remaining = headers['x-ratelimit-remaining'];
  const limit = headers['x-ratelimit-limit'];
  const reset = headers['x-ratelimit-reset'];

  let changed = false;
  if (remaining != null) {
    rateLimitInfo.remaining = parseInt(remaining, 10);
    changed = true;
  }
  if (limit != null) {
    rateLimitInfo.limit = parseInt(limit, 10);
    changed = true;
  }
  if (reset != null) {
    rateLimitInfo.reset = parseInt(reset, 10);
    changed = true;
  }
  if (changed) {
    rateLimitInfo.lastChecked = Date.now();
    rateLimitListeners.forEach((fn) => fn());
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function headersRecord(h: any): Record<string, string | undefined> {
  return h as Record<string, string | undefined>;
}

// ── Data Source Tracking ──

export type DataSource = 'cache' | 'api' | 'etag-revalidated' | 'stale-fallback';

export interface DataSourceEvent {
  source: DataSource;
  timestamp: number;
}

let lastDataSource: DataSourceEvent | null = null;
const dataSourceListeners = new Set<() => void>();

export function getLastDataSource(): DataSourceEvent | null {
  return lastDataSource ? { ...lastDataSource } : null;
}

export function subscribeDataSource(listener: () => void): () => void {
  dataSourceListeners.add(listener);
  return () => {
    dataSourceListeners.delete(listener);
  };
}

function reportDataSource(source: DataSource): void {
  lastDataSource = { source, timestamp: Date.now() };
  dataSourceListeners.forEach((fn) => fn());
}

// ── API Wrappers with ETag Caching ──

/**
 * List repos for the authenticated user (paginated — no ETag caching).
 */
export async function listUserRepos(page = 1, perPage = 30) {
  const octokit = getOctokit();
  const resp = await octokit.rest.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: perPage,
    page,
  });
  updateRateLimit(headersRecord(resp.headers));
  reportDataSource('api');
  return resp.data;
}

/**
 * Get a single repo. Cached with ETag.
 */
export async function getRepo(owner: string, repo: string) {
  const key = `repo:${owner}/${repo}`;
  const entry = cacheGetEntry<ReturnType<Octokit['rest']['repos']['get']> extends Promise<infer R> ? R extends { data: infer D } ? D : never : never>(key);

  if (entry && !entry.isStale) {
    reportDataSource('cache');
    return entry.data;
  }

  const headers: Record<string, string> = {};
  if (entry?.etag) headers['if-none-match'] = entry.etag;

  try {
    const octokit = getOctokit();
    const resp = await octokit.rest.repos.get({ owner, repo, headers });
    updateRateLimit(headersRecord(resp.headers));
    const etag = (resp.headers as Record<string, string | undefined>).etag ?? null;
    cacheSet(key, resp.data, TTL.REPO_LIST, etag);
    reportDataSource('api');
    return resp.data;
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { headers?: Record<string, string> } };
    if (e.status === 304 && entry?.data != null) {
      cacheRefresh(key);
      if (e.response?.headers) updateRateLimit(headersRecord(e.response.headers));
      reportDataSource('etag-revalidated');
      return entry.data;
    }
    if (entry?.data != null) {
      console.warn('API failed, using stale cache for repo:', (err as Error).message);
      reportDataSource('stale-fallback');
      return entry.data;
    }
    throw err;
  }
}

/**
 * Get the full recursive tree for a repo. Cached with ETag.
 * This is the key optimization — one API call replaces ~40 discovery calls.
 */
export async function getRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<GitHubTreeEntry[]> {
  const key = `tree:${owner}/${repo}`;
  const entry = cacheGetEntry<GitHubTreeEntry[]>(key);

  if (entry && !entry.isStale) {
    reportDataSource('cache');
    return entry.data;
  }

  const headers: Record<string, string> = {};
  if (entry?.etag) headers['if-none-match'] = entry.etag;

  try {
    const octokit = getOctokit();
    const resp = await octokit.rest.git.getTree({
      owner,
      repo,
      tree_sha: branch,
      recursive: '1',
      headers,
    });
    updateRateLimit(headersRecord(resp.headers));
    const etag = (resp.headers as Record<string, string | undefined>).etag ?? null;
    const tree = resp.data.tree as GitHubTreeEntry[];
    cacheSet(key, tree, TTL.REPO_TREE, etag);
    reportDataSource('api');
    return tree;
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { headers?: Record<string, string> } };
    if (e.status === 304 && entry?.data != null) {
      cacheRefresh(key);
      if (e.response?.headers) updateRateLimit(headersRecord(e.response.headers));
      reportDataSource('etag-revalidated');
      return entry.data;
    }
    if (entry?.data != null) {
      console.warn('API failed, using stale cache for tree:', (err as Error).message);
      reportDataSource('stale-fallback');
      return entry.data;
    }
    throw err;
  }
}

/**
 * Get the decoded text content of a file. Cached with ETag.
 */
export async function getFileContent(
  owner: string,
  repo: string,
  path: string,
): Promise<string> {
  const key = `file:${owner}/${repo}/${path}`;
  const entry = cacheGetEntry<string>(key);

  if (entry && !entry.isStale) {
    reportDataSource('cache');
    return entry.data;
  }

  const reqHeaders: Record<string, string> = {};
  if (entry?.etag) reqHeaders['if-none-match'] = entry.etag;

  try {
    const octokit = getOctokit();
    const resp = await octokit.rest.repos.getContent({
      owner,
      repo,
      path,
      headers: reqHeaders,
    });
    updateRateLimit(headersRecord(resp.headers));

    const data = resp.data;
    if (!Array.isArray(data) && 'content' in data && typeof data.content === 'string') {
      const cleaned = data.content.replace(/\n/g, '');
      const bytes = Uint8Array.from(atob(cleaned), (c) => c.charCodeAt(0));
      const content = new TextDecoder().decode(bytes);
      const etag = (resp.headers as Record<string, string | undefined>).etag ?? null;
      cacheSet(key, content, TTL.FILE_CONTENT, etag);
      reportDataSource('api');
      return content;
    }
    throw new Error(`Could not read file: ${path}`);
  } catch (err: unknown) {
    const e = err as { status?: number; response?: { headers?: Record<string, string> } };
    if (e.status === 304 && entry?.data != null) {
      cacheRefresh(key);
      if (e.response?.headers) updateRateLimit(headersRecord(e.response.headers));
      reportDataSource('etag-revalidated');
      return entry.data;
    }
    if (entry?.data != null) {
      console.warn('API failed, using stale cache for file:', (err as Error).message);
      reportDataSource('stale-fallback');
      return entry.data;
    }
    throw err;
  }
}

/**
 * Explicitly fetch the current rate limit from GitHub.
 */
export async function fetchRateLimit(): Promise<RateLimitInfo> {
  const octokit = getOctokit();
  const { data, headers } = await octokit.rest.rateLimit.get();
  updateRateLimit(headersRecord(headers));
  rateLimitInfo = {
    remaining: data.rate.remaining,
    limit: data.rate.limit,
    reset: data.rate.reset,
    lastChecked: Date.now(),
  };
  rateLimitListeners.forEach((fn) => fn());
  return { ...rateLimitInfo };
}
