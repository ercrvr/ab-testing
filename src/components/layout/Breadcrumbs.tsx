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

  const crumbs: Crumb[] = [];

  // Always show Repos link if we're past the landing page
  if (location.pathname !== '/') {
    crumbs.push({ label: 'Repositories', to: '/repos' });
  }

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

  if (crumbs.length === 0) return null;

  return (
    <nav className="text-sm breadcrumbs hidden sm:flex">
      <ul className="flex items-center gap-1 flex-wrap">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.to} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="w-3 h-3 text-base-content/40" />}
              {isLast ? (
                <span className="text-base-content/70 font-medium">{crumb.label}</span>
              ) : (
                <Link to={crumb.to} className="link link-hover text-base-content/50">
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
