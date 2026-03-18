import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, Globe, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../hooks/useRepo';
import { listUserRepos, getRepo } from '../lib/github';
import { cacheGet, cacheSet, TTL } from '../lib/cache';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import type { RepoInfo } from '../types';

interface RepoItem {
  owner: string;
  name: string;
  fullName: string;
  description: string | null;
  isPrivate: boolean;
  defaultBranch: string;
  updatedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function mapRepos(data: ReturnType<typeof listUserRepos> extends Promise<infer R> ? R : never): RepoItem[] {
  return data.map((r) => ({
    owner: r.owner.login,
    name: r.name,
    fullName: r.full_name,
    description: r.description ?? null,
    isPrivate: r.private,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at ?? '',
  }));
}

export function RepoSelector() {
  const { auth } = useAuth();
  const { selectRepo } = useRepo();
  const navigate = useNavigate();

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<RepoItem[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [directResult, setDirectResult] = useState<RepoItem | null>(null);

  const fetchRepos = useCallback(async (pageNum: number) => {
    if (!auth.token) return;

    // Check cache for page 1
    if (pageNum === 1) {
      const cached = cacheGet<RepoItem[]>('repos:page1');
      if (cached) {
        setRepos(cached);
        setHasMore(cached.length === 30);
        return;
      }
    }

    try {
      const data = await listUserRepos(pageNum, 30);
      const mapped = mapRepos(data);

      if (pageNum === 1) {
        setRepos(mapped);
        cacheSet('repos:page1', mapped, TTL.REPO_LIST);
      } else {
        setRepos((prev) => [...prev, ...mapped]);
      }
      setHasMore(mapped.length === 30);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load repositories');
    }
  }, [auth.token]);

  useEffect(() => {
    setIsLoading(true);
    fetchRepos(1).finally(() => setIsLoading(false));
  }, [fetchRepos]);

  // Client-side filter
  useEffect(() => {
    if (!search.trim()) {
      setFilteredRepos(repos);
      setDirectResult(null);
      return;
    }
    const q = search.toLowerCase();
    setFilteredRepos(repos.filter((r) => r.fullName.toLowerCase().includes(q)));

    // If search looks like owner/repo, try direct lookup
    if (search.includes('/')) {
      const [owner, repo] = search.split('/', 2);
      if (owner && repo && repo.length > 0) {
        getRepo(owner, repo)
          .then((data) => {
            setDirectResult({
              owner: data.owner.login,
              name: data.name,
              fullName: data.full_name,
              description: data.description ?? null,
              isPrivate: data.private,
              defaultBranch: data.default_branch,
              updatedAt: data.updated_at ?? '',
            });
          })
          .catch(() => setDirectResult(null));
      }
    } else {
      setDirectResult(null);
    }
  }, [search, repos]);

  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    const nextPage = page + 1;
    await fetchRepos(nextPage);
    setPage(nextPage);
    setIsLoadingMore(false);
  };

  const handleSelect = (item: RepoItem) => {
    const info: RepoInfo = {
      owner: item.owner,
      name: item.name,
      fullName: item.fullName,
      description: item.description,
      isPrivate: item.isPrivate,
      defaultBranch: item.defaultBranch,
    };
    selectRepo(info);
    navigate(`/repo/${item.owner}/${item.name}`);
  };

  const renderRepoRow = (item: RepoItem) => (
    <button
      key={item.fullName}
      className="flex items-center gap-3 w-full text-left p-3 rounded-lg hover:bg-base-200 transition-colors"
      onClick={() => handleSelect(item)}
    >
      {item.isPrivate ? (
        <Lock className="w-4 h-4 text-warning shrink-0" />
      ) : (
        <Globe className="w-4 h-4 text-success shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-mono text-sm font-medium truncate">{item.fullName}</p>
        {item.description && (
          <p className="text-xs text-base-content/50 truncate">{item.description}</p>
        )}
      </div>
      {item.updatedAt && (
        <span className="text-xs text-base-content/40 shrink-0">{timeAgo(item.updatedAt)}</span>
      )}
      <ChevronRight className="w-4 h-4 text-base-content/30 shrink-0" />
    </button>
  );

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-heading font-bold mb-6">Select Repository</h1>

      {/* Search */}
      <label className="input input-bordered flex items-center gap-2 mb-4">
        <Search className="w-4 h-4 text-base-content/40" />
        <input
          type="text"
          placeholder="Search repos or enter owner/repo..."
          className="grow"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>

      {error && <ErrorBanner message={error} onRetry={() => fetchRepos(1)} />}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-base-content/60">Loading repositories...</span>
        </div>
      )}

      {/* Direct search result */}
      {directResult && !filteredRepos.some((r) => r.fullName === directResult.fullName) && (
        <div className="mb-4">
          <p className="text-xs text-base-content/50 mb-1 font-mono uppercase tracking-wider">
            Direct match
          </p>
          <div className="border border-primary/30 rounded-lg bg-primary/5">
            {renderRepoRow(directResult)}
          </div>
        </div>
      )}

      {/* Repo list */}
      {!isLoading && (
        <div className="space-y-0.5">
          {filteredRepos.map(renderRepoRow)}
        </div>
      )}

      {/* Load more */}
      {!isLoading && hasMore && !search && (
        <div className="text-center mt-6">
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load more'
            )}
          </button>
        </div>
      )}

      {!isLoading && filteredRepos.length === 0 && !directResult && (
        <p className="text-center text-base-content/50 py-8">
          {search ? 'No matching repositories found.' : 'No repositories found.'}
        </p>
      )}
    </div>
  );
}
