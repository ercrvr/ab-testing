import { useParams } from 'react-router-dom';
import { useProjects } from '../hooks/useProjects';
import { useRepo } from '../hooks/useRepo';
import { ProjectCard } from '../components/cards/ProjectCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { FolderSearch, ExternalLink } from 'lucide-react';

export function ProjectList() {
  const { owner, repo } = useParams();
  const { selectedRepo } = useRepo();
  const defaultBranch = selectedRepo?.defaultBranch ?? 'main';

  const { data: projects, isLoading, error, refetch } = useProjects(owner, repo, defaultBranch);

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">
          {owner}/{repo}
        </h1>
        {projects && (
          <p className="text-base-content/60 mt-1">
            {projects.length} {projects.length === 1 ? 'project' : 'projects'} found
          </p>
        )}
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {isLoading && <LoadingSpinner size="lg" text="Discovering projects..." />}

      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project.name}
              project={project}
              repoOwner={owner!}
              repoName={repo!}
            />
          ))}
        </div>
      )}

      {projects && projects.length === 0 && !isLoading && (
        <div className="text-center py-16">
          <FolderSearch className="w-12 h-12 mx-auto text-base-content/30 mb-4" />
          <h2 className="text-lg font-heading font-semibold mb-2">
            No A/B test projects found
          </h2>
          <p className="text-base-content/60 max-w-md mx-auto">
            Make sure your repository follows the expected directory structure.
            Each project should have a <code className="font-mono bg-base-300 px-1 rounded text-sm">tests/</code> subdirectory.
          </p>
          <a
            href="https://github.com/ercrvr/ab-testing/blob/main/AB_TEST_GUIDE.md"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm mt-4"
          >
            <ExternalLink className="w-4 h-4" />
            View Structure Guide
          </a>
        </div>
      )}
    </div>
  );
}
