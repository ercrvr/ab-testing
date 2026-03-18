import { useState, useCallback } from 'react';
import type { RepoInfo } from '../types';

const STORAGE_KEY = 'ab-dashboard-selected-repo';

function loadFromStorage(): RepoInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RepoInfo) : null;
  } catch {
    return null;
  }
}

export function useRepo() {
  const [selectedRepo, setSelectedRepo] = useState<RepoInfo | null>(loadFromStorage);

  const selectRepo = useCallback((repo: RepoInfo) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(repo));
    setSelectedRepo(repo);
  }, []);

  const clearRepo = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSelectedRepo(null);
  }, []);

  return { selectedRepo, selectRepo, clearRepo };
}
