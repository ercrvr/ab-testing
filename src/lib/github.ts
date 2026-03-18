import { Octokit } from '@octokit/rest';
import { cacheGetEntry, cacheSet, cacheRefresh, TTL } from './cache';

let octokitInstance: Octokit | null = null;

// ── Rate Limit Tracking ──

export interface RateLimitInfo {
  remaining: number;
  limit: number;
  reset: number;
  lastChecked: number;
}

const RATE_LIMIT_STORAGE_KEY = 'ab-rate-limit';

function loadRateLimitFromStorage(): RateLimitInfo {
  try {
    const stored = sessionStorage.getItem(RATE_LIMIT_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // ignore
  }
  return { remaining: 0, limit: 0, reset: 0, lastChecked: 0 };
}

function saveRateLimitToStorage(): void {
  try {
    sessionStorage.setItem(RATE_LIMIT_STORAGE_KEY, JSON.stringify(rateLimitInfo));
  } catch {
    // ignore
  }
}

let rateLimitInfo: RateLimitInfo = loadRateLimitFromStorage();

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

/**
 * Update rate limit info from response headers.
 *
 * GitHub's load balancers can return headers from different rate-limit windows
 * across concurrent requests (different backend servers). To prevent the
 * displayed value from "jumping" we enforce two rules:
 *   1. Ignore responses from an older window (lower reset timestamp).
 *   2. Within the same window, remaining can only decrease — never increase.
 */
function updateRateLimit(headers: Record<string, string | undefined>): void {
  const remaining = headers['x-ratelimit-remaining'];
  const limit = headers['x-ratelimit-limit'];
  const reset = headers['x-ratelimit-reset'];

  if (remaining == null) return;

  const incomingRemaining = parseInt(remaining, 10);
  const incomingLimit = limit != null ? parseInt(limit, 10) : rateLimitInfo.limit;
  const incomingReset = reset != null ? parseInt(reset, 10) : 0;

  // Ignore stale responses from an older rate-limit window
  if (rateLimitInfo.reset > 0 && incomingReset > 0 && incomingReset < rateLimitInfo.reset) {
    return;
  }

  if (incomingReset > rateLimitInfo.reset) {
    // New rate-limit window started — accept all values
    rateLimitInfo.remaining = incomingRemaining;
    rateLimitInfo.limit = incomingLimit;
    rateLimitInfo.reset = incomingReset;
  } else {
    // Same window — remaining can only go down (more conservative = more accurate)
    rateLimitInfo.remaining = Math.min(rateLimitInfo.remaining, incomingRemaining);
    rateLimitInfo.limit = incomingLimit;
  }

  rateLimitInfo.lastChecked = Date.now();
  saveRateLimitToStorage();
  rateLimitListeners.forEach((fn) => fn());
}

/**
 * Custom fetch wrapper that captures rate limit headers from EVERY response,
 * including 304 Not Modified. Octokit throws an error for 304 responses before
 * we can read headers, so intercepting at the fetch level ensures accurate
 * rate limit tracking regardless of HTTP status.
 */
function createRateLimitAwareFetch(): typeof globalThis.fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await globalThis.fetch(input, init);

    const remaining = response.headers.get('x-ratelimit-remaining') ?? undefined;
    const limit = response.headers.get('x-ratelimit-limit') ?? undefined;
    const reset = response.headers.get('x-ratelimit-reset') ?? undefined;

    if (remaining != null) {
      updateRateLimit({
        'x-ratelimit-remaining': remaining,
        'x-ratelimit-limit': limit,
        'x-ratelimit-reset': reset,
      });
    }

    return response;
  };
}

export function initOctokit(token: string): void {
  octokitInstance = new Octokit({
    auth: token,
    request: { fetch: createRateLimitAwareFetch() },
  });
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
    const etag = (resp.headers as Record<string, string | undefined>).etag ?? null;
    cacheSet(key, resp.data, TTL.REPO_LIST, etag);
    reportDataSource('api');
    return resp.data;
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 304 && entry?.data != null) {
      cacheRefresh(key);
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
    const etag = (resp.headers as Record<string, string | undefined>).etag ?? null;
    const tree = resp.data.tree as GitHubTreeEntry[];
    cacheSet(key, tree, TTL.REPO_TREE, etag);
    reportDataSource('api');
    return tree;
  } catch (err: unknown) {
    const e = err as { status?: number };
    if (e.status === 304 && entry?.data != null) {
      cacheRefresh(key);
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
    const e = err as { status?: number };
    if (e.status === 304 && entry?.data != null) {
      cacheRefresh(key);
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
  const { data } = await octokit.rest.rateLimit.get();
  rateLimitInfo = {
    remaining: data.rate.remaining,
    limit: data.rate.limit,
    reset: data.rate.reset,
    lastChecked: Date.now(),
  };
  saveRateLimitToStorage();
  rateLimitListeners.forEach((fn) => fn());
  return { ...rateLimitInfo };
}
