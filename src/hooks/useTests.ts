import { useState, useEffect, useCallback } from 'react';
import type { TestSummary, UseQueryResult } from '../types';
import { getRepoTree } from '../lib/github';
import { loadTestSummaries } from '../lib/discovery';

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
      // getRepoTree and getFileContent handle ETag caching internally
      const tree = await getRepoTree(owner, repo, defaultBranch);
      const summaries = await loadTestSummaries(tree, owner, repo, project);
      setData(summaries);
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
