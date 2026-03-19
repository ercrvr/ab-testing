import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useRepo } from '../../hooks/useRepo';

interface Crumb {
  label: string;
  to: string;
  depth: number;
}

function toDisplayName(dirName: string): string {
  return dirName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const location = useLocation();
  const navigate = useNavigate();
  const { clearRepo } = useRepo();

  // Only show breadcrumbs on pages deeper than /repos
  if (location.pathname === '/' || location.pathname === '/repos') return null;

  // Parse route params from pathname (component is outside <Routes> so useParams won't work)
  const segments = location.pathname.split('/').filter(Boolean);
  let owner: string | undefined;
  let repo: string | undefined;
  let project: string | undefined;
  let testId: string | undefined;

  if (segments[0] === 'repo' && segments.length >= 3) {
    owner = segments[1];
    repo = segments[2];
    project = segments.length >= 4 ? segments[3] : undefined;
    testId = segments.length >= 5 ? segments[4] : undefined;
  }

  // Get current navigation depth from location state.
  // Falls back to calculating from path segments when state is unavailable
  // (e.g. deep links, page refresh without preserved state).
  const stateDepth = (location.state as { repoNavDepth?: number } | null)?.repoNavDepth;
  const currentDepth = stateDepth ?? (segments.length >= 3 ? segments.length - 2 : 0);

  const crumbs: Crumb[] = [];

  // "Repos" — depth 0 (the hub)
  crumbs.push({ label: 'Repos', to: '/repos', depth: 0 });

  if (owner && repo) {
    crumbs.push({
      label: `${owner}/${repo}`,
      to: `/repo/${owner}/${repo}`,
      depth: 1,
    });
  }

  if (project) {
    crumbs.push({
      label: toDisplayName(project),
      to: `/repo/${owner}/${repo}/${project}`,
      depth: 2,
    });
  }

  if (testId) {
    const testNum = testId.replace('test', '');
    crumbs.push({
      label: `Test ${testNum}`,
      to: `/repo/${owner}/${repo}/${project}/${testId}`,
      depth: 3,
    });
  }

  /**
   * Navigate "up" in the breadcrumb trail by popping history entries.
   *
   * Each level of repo navigation pushes one history entry with a repoNavDepth
   * in location.state. Clicking a breadcrumb pops back exactly
   * (currentDepth – targetDepth) entries so the browser back/forward buttons
   * remain consistent.
   */
  const handleCrumbClick = (e: React.MouseEvent, crumb: Crumb) => {
    e.preventDefault();
    if (crumb.depth === 0) clearRepo();

    const stepsBack = currentDepth - crumb.depth;
    if (stepsBack > 0) {
      window.history.go(-stepsBack);
    } else {
      // Fallback (deep link / unknown depth) — replace to avoid stacking
      navigate(crumb.to, { replace: true });
    }
  };

  return (
    <nav className="bg-base-200/40 border-b border-base-300/30 px-4 py-1.5">
      <ul className="flex items-center gap-1 flex-wrap">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.to} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-base-content/30 shrink-0" />}
              {isLast ? (
                <span className="text-xs sm:text-sm text-base-content/70 font-medium truncate max-w-[160px] sm:max-w-none">
                  {crumb.label}
                </span>
              ) : (
                <a
                  href={`#${crumb.to}`}
                  onClick={(e) => handleCrumbClick(e, crumb)}
                  className="text-xs sm:text-sm link link-hover text-base-content/50 truncate max-w-[140px] sm:max-w-none"
                >
                  {crumb.label}
                </a>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
