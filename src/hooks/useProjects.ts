import { useState, useEffect, useCallback } from 'react';
import type { Project, UseQueryResult } from '../types';
import { getRepoTree } from '../lib/github';
import { discoverProjects } from '../lib/discovery';

export function useProjects(
  owner: string | undefined,
  repo: string | undefined,
  defaultBranch: string,
): UseQueryResult<Project[]> {
  const [data, setData] = useState<Project[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    if (!owner || !repo) return;

    setIsLoading(true);
    setError(null);

    try {
      // getRepoTree handles ETag caching internally
      const tree = await getRepoTree(owner, repo, defaultBranch);
      const projects = discoverProjects(tree);
      setData(projects);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo, defaultBranch]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { data, isLoading, error, refetch: fetchProjects };
}
