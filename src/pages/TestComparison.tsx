import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useTestData } from '../hooks/useTestData';
import { useRepo } from '../hooks/useRepo';
import { DifficultyBadge } from '../components/ui/DifficultyBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ErrorBanner } from '../components/ui/ErrorBanner';
import { ChevronDown, ChevronRight, FileText, Files } from 'lucide-react';
import { FileGroupRenderer } from '../components/renderers/FileGroupRenderer';

export function TestComparison() {
  const { owner, repo, project, testId } = useParams();
  const { selectedRepo } = useRepo();
  const defaultBranch = selectedRepo?.defaultBranch ?? 'main';

  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const toggleGroup = (relativePath: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(relativePath)) {
        next.delete(relativePath);
      } else {
        next.add(relativePath);
      }
      return next;
    });
  };

  const { data: testDetail, isLoading, error, refetch } = useTestData(
    owner,
    repo,
    project,
    testId,
    defaultBranch,
  );

  return (
    <div className="container mx-auto max-w-5xl p-6">
      {error && <ErrorBanner message={error} onRetry={refetch} />}
      {isLoading && <LoadingSpinner size="lg" text="Loading test data..." />}

      {testDetail && (
        <>
          {/* Test Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-heading font-bold">{testDetail.name}</h1>
              <DifficultyBadge difficulty={testDetail.meta.difficulty} />
            </div>
            <p className="text-base-content/70 bg-base-200 rounded-box p-4 font-mono text-sm">
              &quot;{testDetail.meta.prompt}&quot;
            </p>
          </div>

          {/* Variants summary */}
          <div className="mb-8">
            <h2 className="lab-label text-base-content/50 mb-3">
              <span className="flex items-center gap-1.5">
                <Files className="w-3.5 h-3.5" />
                {testDetail.variants.length} Variants
              </span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {testDetail.variants.map((v) => (
                <div key={v.name} className="badge badge-lg badge-outline font-mono gap-1.5">
                  {v.name}
                  <span className="text-xs text-base-content/50">
                    ({v.files.length} files)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Matched files preview */}
          {testDetail.matchedFiles.length > 0 && (
            <div className="mb-8">
              <h2 className="lab-label text-base-content/50 mb-3">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {testDetail.matchedFiles.length} Matched File Groups
                </span>
              </h2>
              <div className="space-y-2">
                {testDetail.matchedFiles.map((group) => {
                  const isExpanded = expandedGroups.has(group.relativePath);
                  return (
                    <div
                      key={group.relativePath}
                      className="border border-base-300 rounded-box overflow-hidden"
                    >
                      <button
                        type="button"
                        className="w-full p-3 flex items-center justify-between hover:bg-base-200/50 transition-colors cursor-pointer"
                        onClick={() => toggleGroup(group.relativePath)}
                      >
                        <span className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-base-content/50" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-base-content/50" />
                          )}
                          <span className="font-mono text-sm">{group.relativePath}</span>
                        </span>
                        <span className="badge badge-sm badge-ghost">{group.contentType}</span>
                      </button>
                      {isExpanded && (
                        <div className="p-4 border-t border-base-300">
                          <FileGroupRenderer group={group} owner={owner!} repo={repo!} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Unmatched files */}
          {Object.keys(testDetail.unmatchedFiles).length > 0 && (
            <div>
              <h2 className="lab-label text-base-content/50 mb-3">Unique Files</h2>
              {Object.entries(testDetail.unmatchedFiles).map(([variant, files]) => (
                <div key={variant} className="mb-4">
                  <h3 className="text-sm font-semibold mb-2">
                    Only in <span className="font-mono">{variant}</span> ({files.length})
                  </h3>
                  <div className="space-y-1">
                    {files.map((f) => (
                      <div
                        key={f.path}
                        className="border border-base-300 rounded-lg p-2 text-sm font-mono flex justify-between"
                      >
                        <span>{f.path}</span>
                        <span className="text-base-content/50">
                          {f.size < 1024
                            ? `${f.size} B`
                            : `${(f.size / 1024).toFixed(1)} KB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Phase 4/5 notice */}
          <div className="mt-10 text-center text-base-content/40 text-xs font-mono uppercase tracking-widest">
            Content renderers &amp; side-by-side comparison coming in Phase 4–5
          </div>
        </>
      )}
    </div>
  );
}
