interface CacheEntry<T = unknown> {
  data: T;
  etag: string | null;
  timestamp: number;
  ttl: number;
}

const CACHE_PREFIX = 'ab-cache:';

// ── TTL Constants (milliseconds) ──

export const TTL = {
  REPO_LIST: 5 * 60 * 1000,       // 5 minutes
  REPO_TREE: 10 * 60 * 1000,      // 10 minutes
  PROJECT_LIST: 10 * 60 * 1000,   // 10 minutes
  TEST_LIST: 10 * 60 * 1000,      // 10 minutes
  META_JSON: 30 * 60 * 1000,      // 30 minutes
  FILE_CONTENT: 30 * 60 * 1000,   // 30 minutes
} as const;

function fullKey(key: string): string {
  return CACHE_PREFIX + key;
}

function isStale(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp > entry.ttl;
}

/**
 * Get cached data if fresh (within TTL). Returns null if stale or missing.
 */
export function cacheGet<T>(key: string): T | null {
  const entry = cacheGetEntry<T>(key);
  if (!entry || entry.isStale) return null;
  return entry.data;
}

/**
 * Get the full cache entry including ETag and staleness info.
 * Returns the entry even if stale — needed for conditional ETag requests.
 */
export function cacheGetEntry<T>(key: string): {
  data: T;
  etag: string | null;
  isStale: boolean;
} | null {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    return {
      data: entry.data,
      etag: entry.etag,
      isStale: isStale(entry),
    };
  } catch {
    return null;
  }
}

/**
 * Store data in cache with TTL and optional ETag.
 */
export function cacheSet<T>(
  key: string,
  data: T,
  ttl: number,
  etag: string | null = null,
): void {
  const entry: CacheEntry<T> = { data, etag, timestamp: Date.now(), ttl };
  try {
    localStorage.setItem(fullKey(key), JSON.stringify(entry));
  } catch {
    evictOldEntries();
    try {
      localStorage.setItem(fullKey(key), JSON.stringify(entry));
    } catch {
      // Still full — give up silently
    }
  }
}

/**
 * Refresh the timestamp without changing data or ETag.
 * Used when a conditional request returns 304 Not Modified.
 */
export function cacheRefresh(key: string): void {
  try {
    const raw = localStorage.getItem(fullKey(key));
    if (!raw) return;
    const entry: CacheEntry = JSON.parse(raw);
    entry.timestamp = Date.now();
    localStorage.setItem(fullKey(key), JSON.stringify(entry));
  } catch {
    // ignore
  }
}

export function cacheClear(key: string): void {
  localStorage.removeItem(fullKey(key));
}

export function cacheClearAll(): void {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
  }
  for (const k of keys) {
    localStorage.removeItem(k);
  }
}

function evictOldEntries(): void {
  const entries: { key: string; timestamp: number; size: number }[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith(CACHE_PREFIX)) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const parsed: CacheEntry = JSON.parse(raw);
      entries.push({ key, timestamp: parsed.timestamp, size: raw.length });
    } catch {
      if (key) localStorage.removeItem(key);
    }
  }
  entries.sort((a, b) => a.timestamp - b.timestamp);
  let freed = 0;
  for (const entry of entries) {
    if (freed > 1_000_000) break;
    localStorage.removeItem(entry.key);
    freed += entry.size;
  }
}
