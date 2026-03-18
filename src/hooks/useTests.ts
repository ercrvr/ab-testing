import { useState, useEffect, useCallback } from 'react';
import type { TestSummary, UseQueryResult } from '../types';
import { getRepoTree } from '../lib/github';
import type { GitHubTreeEntry } from '../lib/github';
import { loadTestSummaries } from '../lib/discovery';
import { cacheGet, cacheSet, TTL } from '../lib/cache';

export function useTests(
  owner: string | undefined,
  repo: string | undefined,
  project: string | undefined,
  defaultBranch: string,
): UseQueryResult<TestSummary[]> {
  const [data, setData] = useState<TestSummary[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTests = useCallback(async () => {
    if (!owner || !repo || !project) return;

    setIsLoading(true);
    setError(null);

    try {
      // Reuse cached tree
      const treeCacheKey = `tree:${owner}/${repo}`;
      let tree = cacheGet<GitHubTreeEntry[]>(treeCacheKey);

      if (!tree) {
        tree = await getRepoTree(owner, repo, defaultBranch);
        cacheSet(treeCacheKey, tree, TTL.REPO_TREE);
      }

      // Check test summary cache
      const testsCacheKey = `tests:${owner}/${repo}/${project}`;
      const cached = cacheGet<TestSummary[]>(testsCacheKey);

      if (cached) {
        setData(cached);
      } else {
        const summaries = await loadTestSummaries(tree, owner, repo, project);
        cacheSet(testsCacheKey, summaries, TTL.TEST_LIST);
        setData(summaries);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load tests';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, project, defaultBranch]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  return { data, isLoading, error, refetch: fetchTests };
}
