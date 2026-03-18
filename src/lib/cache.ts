interface CacheEntry<T = unknown> {
  data: T;
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

function cacheKey(key: string): string {
  return CACHE_PREFIX + key;
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(cacheKey(key));
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(cacheKey(key));
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(key: string, data: T, ttl: number): void {
  const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
  try {
    localStorage.setItem(cacheKey(key), JSON.stringify(entry));
  } catch {
    // localStorage full — evict old entries and retry
    evictOldEntries();
    try {
      localStorage.setItem(cacheKey(key), JSON.stringify(entry));
    } catch {
      // Still full — give up silently
    }
  }
}

export function cacheClear(key: string): void {
  localStorage.removeItem(cacheKey(key));
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
      // Remove corrupt entries
      if (key) localStorage.removeItem(key);
    }
  }
  // Sort oldest first, evict until we've freed ~1MB
  entries.sort((a, b) => a.timestamp - b.timestamp);
  let freed = 0;
  for (const entry of entries) {
    if (freed > 1_000_000) break;
    localStorage.removeItem(entry.key);
    freed += entry.size;
  }
}
