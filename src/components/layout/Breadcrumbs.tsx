import { Link, useParams, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

interface Crumb {
  label: string;
  to: string;
}

function toDisplayName(dirName: string): string {
  return dirName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function Breadcrumbs() {
  const { owner, repo, project, testId } = useParams();
  const location = useLocation();

  // Only show breadcrumbs on pages deeper than /repos
  if (location.pathname === '/' || location.pathname === '/repos') return null;

  const crumbs: Crumb[] = [];

  // "Repos" is always the first link — jump back to repo selector
  crumbs.push({ label: 'Repos', to: '/repos' });

  if (owner && repo) {
    crumbs.push({
      label: `${owner}/${repo}`,
      to: `/repo/${owner}/${repo}`,
    });
  }

  if (project) {
    crumbs.push({
      label: toDisplayName(project),
      to: `/repo/${owner}/${repo}/${project}`,
    });
  }

  if (testId) {
    const testNum = testId.replace('test', '');
    crumbs.push({
      label: `Test ${testNum}`,
      to: `/repo/${owner}/${repo}/${project}/${testId}`,
    });
  }

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
                <Link
                  to={crumb.to}
                  className="text-xs sm:text-sm link link-hover text-base-content/50 truncate max-w-[140px] sm:max-w-none"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
