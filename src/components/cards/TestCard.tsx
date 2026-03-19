import { Link, useLocation } from 'react-router-dom';
import { DifficultyBadge } from '../ui/DifficultyBadge';
import type { TestSummary } from '../../types';

interface TestCardProps {
  test: TestSummary;
  repoOwner: string;
  repoName: string;
  project: string;
}

export function TestCard({ test, repoOwner, repoName, project }: TestCardProps) {
  const location = useLocation();
  const currentDepth = (location.state as { repoNavDepth?: number } | null)?.repoNavDepth ?? 2;

  const testNum = test.id.replace('test', '');
  const truncatedPrompt =
    test.prompt.length > 120 ? test.prompt.slice(0, 120) + '…' : test.prompt;

  return (
    <Link
      to={`/repo/${repoOwner}/${repoName}/${project}/${test.id}`}
      state={{ repoNavDepth: currentDepth + 1 }}
      className="block border border-base-300 rounded-box p-4 hover:bg-base-200 transition-colors"
    >
      <div className="flex items-center justify-between gap-3 mb-1">
        <h3 className="font-heading font-semibold">
          Test {testNum}: {test.name}
        </h3>
        <DifficultyBadge difficulty={test.difficulty} />
      </div>
      <p className="text-sm text-base-content/60 line-clamp-2">
        &quot;{truncatedPrompt}&quot;
      </p>
      {test.variantNames.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {test.variantNames.map((v) => (
            <span key={v} className="badge badge-outline badge-xs font-mono">
              {v}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
