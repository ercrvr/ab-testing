import { useState, useEffect, useCallback } from 'react';
import type { TestDetail, UseQueryResult } from '../types';
import { getRepoTree } from '../lib/github';
import type { GitHubTreeEntry } from '../lib/github';
import { loadTestDetail } from '../lib/discovery';
import { cacheGet, cacheSet, TTL } from '../lib/cache';

export function useTestData(
  owner: string | undefined,
  repo: string | undefined,
  project: string | undefined,
  testId: string | undefined,
  defaultBranch: string,
): UseQueryResult<TestDetail> {
  const [data, setData] = useState<TestDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTestData = useCallback(async () => {
    if (!owner || !repo || !project || !testId) return;

    setIsLoading(true);
    setError(null);

    try {
      const treeCacheKey = `tree:${owner}/${repo}`;
      let tree = cacheGet<GitHubTreeEntry[]>(treeCacheKey);

      if (!tree) {
        tree = await getRepoTree(owner, repo, defaultBranch);
        cacheSet(treeCacheKey, tree, TTL.REPO_TREE);
      }

      const detail = await loadTestDetail(
        tree,
        owner,
        repo,
        defaultBranch,
        project,
        testId,
      );
      setData(detail);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load test data';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, project, testId, defaultBranch]);

  useEffect(() => {
    fetchTestData();
  }, [fetchTestData]);

  return { data, isLoading, error, refetch: fetchTestData };
}
