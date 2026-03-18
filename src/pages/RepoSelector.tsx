import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Lock, Globe, Loader2, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../hooks/useRepo';
import { listUserRepos, getRepo } from '../lib/github';
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

export function RepoSelector() {
  const { auth } = useAuth();
  const { selectedRepo, selectRepo } = useRepo();
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
    try {
      const data = await listUserRepos(pageNum, 30);
      const mapped: RepoItem[] = data.map((r) => ({
        owner: r.owner.login,
        name: r.name,
        fullName: r.full_name,
        description: r.description ?? null,
        isPrivate: r.private,
        defaultBranch: r.default_branch,
        updatedAt: r.updated_at ?? '',
      }));
      if (pageNum === 1) {
        setRepos(mapped);
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
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          className="input input-bordered w-full pl-10 font-mono text-sm"
          placeholder="Search repositories or type owner/repo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBanner message={error} onRetry={() => fetchRepos(1)} />}

      {/* Recently used */}
      {selectedRepo && !search && (
        <div className="mb-6">
          <h2 className="lab-label text-base-content/50 mb-2">📌 Recently Used</h2>
          <div className="border border-primary/30 rounded-box bg-primary/5">
            {renderRepoRow({
              owner: selectedRepo.owner,
              name: selectedRepo.name,
              fullName: selectedRepo.fullName,
              description: selectedRepo.description,
              isPrivate: selectedRepo.isPrivate,
              defaultBranch: selectedRepo.defaultBranch,
              updatedAt: '',
            })}
          </div>
        </div>
      )}

      {/* Direct search result */}
      {directResult && !filteredRepos.some((r) => r.fullName === directResult.fullName) && (
        <div className="mb-4">
          <h2 className="lab-label text-base-content/50 mb-2">Direct Match</h2>
          <div className="border border-base-300 rounded-box">
            {renderRepoRow(directResult)}
          </div>
        </div>
      )}

      {/* Repo list */}
      <div>
        <h2 className="lab-label text-base-content/50 mb-2">Your Repositories</h2>
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredRepos.length === 0 ? (
          <p className="text-center text-base-content/50 py-8">No repositories found.</p>
        ) : (
          <div className="border border-base-300 rounded-box divide-y divide-base-300">
            {filteredRepos.map(renderRepoRow)}
          </div>
        )}

        {/* Load more */}
        {hasMore && !search && !isLoading && (
          <div className="text-center mt-4">
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Load more'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
