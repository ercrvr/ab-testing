import { useParams } from 'react-router-dom';
import { useTests } from '../hooks/useTests';
import { useRepo } from '../hooks/useRepo';
import { TestCard } from '../components/cards/TestCard';
import { StatCard } from '../components/ui/StatCard';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { FlaskConical, BarChart3 } from 'lucide-react';

function toDisplayName(dirName: string): string {
  return dirName
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ProjectView() {
  const { owner, repo, project } = useParams();
  const { selectedRepo } = useRepo();
  const defaultBranch = selectedRepo?.defaultBranch ?? 'main';

  const { data: tests, isLoading, error, refetch } = useTests(owner, repo, project, defaultBranch);

  // Compute stats
  const totalTests = tests?.length ?? 0;
  const simpleCount = tests?.filter((t) => t.difficulty === 'Simple').length ?? 0;
  const mediumCount = tests?.filter((t) => t.difficulty === 'Medium').length ?? 0;
  const complexCount = tests?.filter((t) => t.difficulty === 'Complex').length ?? 0;

  return (
    <div className="container mx-auto max-w-4xl p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold">
          {project ? toDisplayName(project) : project}
        </h1>
      </div>

      {error && <ErrorBanner message={error} onRetry={refetch} />}

      {isLoading && <LoadingSpinner size="lg" text="Loading tests..." />}

      {tests && (
        <>
          {/* Stats */}
          <div className="stats stats-horizontal shadow mb-8 w-full">
            <StatCard value={totalTests} label="Tests" icon={<FlaskConical className="w-5 h-5" />} />
            <StatCard value={simpleCount} label="Simple" icon={<BarChart3 className="w-5 h-5 text-success" />} />
            <StatCard value={mediumCount} label="Medium" icon={<BarChart3 className="w-5 h-5 text-warning" />} />
            <StatCard value={complexCount} label="Complex" icon={<BarChart3 className="w-5 h-5 text-error" />} />
          </div>

          {/* Test list */}
          <div>
            <h2 className="lab-label text-base-content/50 mb-3">Tests</h2>
            <div className="space-y-2">
              {tests.map((test) => (
                <TestCard
                  key={test.id}
                  test={test}
                  repoOwner={owner!}
                  repoName={repo!}
                  project={project!}
                />
              ))}
            </div>
          </div>

          {tests.length === 0 && (
            <p className="text-center text-base-content/50 py-8">
              No tests found in this project.
            </p>
          )}
        </>
      )}
    </div>
  );
}
