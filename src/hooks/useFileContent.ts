import { useState, useEffect } from 'react';
import { getFileContent } from '../lib/github';

interface UseFileContentResult {
  content: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * React hook wrapper around getFileContent().
 * Fetches the decoded text content of a file from GitHub.
 */
export function useFileContent(
  owner: string | undefined,
  repo: string | undefined,
  path: string | undefined,
): UseFileContentResult {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!owner || !repo || !path) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setContent(null);

    getFileContent(owner, repo, path)
      .then((text) => {
        if (!cancelled) {
          setContent(text);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load file');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo, path]);

  return { content, isLoading, error };
}
