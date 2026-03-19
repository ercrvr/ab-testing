import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useRepo } from '../hooks/useRepo';
import { listUserRepos } from '../lib/github';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { Globe, ChevronRight, Search } from 'lucide-react';

interface RepoItem {
  owner: string;
  name: string;
  description: string | null;
  defaultBranch: string;
  pushedAt: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function RepoSelector() {
  const { auth } = useAuth();
  const { selectRepo } = useRepo();
  const navigate = useNavigate();

  const [repos, setRepos] = useState<RepoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!auth.token) return;
    let cancelled = false;

    (async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await listUserRepos(1, 30);
        if (!cancelled) {
          setRepos(
            data.map((r) => ({
              owner: r.owner.login,
              name: r.name,
              description: r.description,
              defaultBranch: r.default_branch,
              pushedAt: r.pushed_at ?? r.updated_at ?? '',
            })),
          );
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [auth.token]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return repos;
    return repos.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.owner.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)),
    );
  }, [repos, search]);

  const handleSelect = (item: RepoItem) => {
    selectRepo(item.owner, item.name, item.defaultBranch);
    navigate(`/repo/${item.owner}/${item.name}`, {
      state: { repoNavDepth: 1 },
    });
  };

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-heading font-bold mb-6">Select Repository</h1>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/40" />
        <input
          type="text"
          placeholder="Search repos or enter owner/repo..."
          className="input input-bordered w-full pl-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <ErrorBanner message={error} />}
      {isLoading && <LoadingSpinner size="lg" text="Loading repositories..." />}

      {!isLoading && (
        <ul className="space-y-1">
          {filtered.map((item) => (
            <li key={`${item.owner}/${item.name}`}>
              <button
                onClick={() => handleSelect(item)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-btn hover:bg-base-200 transition-colors text-left"
              >
                <Globe className="w-5 h-5 text-success shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="font-medium">
                    {item.owner}/{item.name}
                  </span>
                  {item.description && (
                    <p className="text-xs text-base-content/50 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
                <span className="text-xs text-base-content/40 shrink-0">
                  {item.pushedAt ? timeAgo(item.pushedAt) : ''}
                </span>
                <ChevronRight className="w-4 h-4 text-base-content/30 shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
