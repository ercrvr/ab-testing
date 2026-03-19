import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Eye, Code2 } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { useFileContent } from '../../hooks/useFileContent';
import { FullscreenModal } from './FullscreenModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBanner } from '../ui/ErrorBanner';

interface MarkdownRendererProps {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
}

type ViewMode = 'rendered' | 'source';

/** Renders a single variant's markdown content */
function VariantPanel({
  variantName,
  file,
  owner,
  repo,
  viewMode,
  onClick,
}: {
  variantName: string;
  file: DiscoveredFile;
  owner: string;
  repo: string;
  viewMode: ViewMode;
  onClick: () => void;
}) {
  const { content, isLoading, error } = useFileContent(owner, repo, file.repoPath);

  return (
    <div
      className="border border-base-300 rounded-box overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      {/* Variant header */}
      <div className="px-3 py-2 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold">{variantName}</span>
        <span className="text-xs text-base-content/50">
          {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
        </span>
      </div>

      {/* Content area */}
      <div className="p-4 max-h-96 overflow-auto">
        {isLoading && <LoadingSpinner size="sm" text="Loading..." />}
        {error && <ErrorBanner message={error} />}
        {content !== null && viewMode === 'rendered' && (
          <div className="prose prose-sm max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
        {content !== null && viewMode === 'source' && (
          <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-base-200 rounded-lg p-3 overflow-auto">
            {content}
          </pre>
        )}
      </div>
    </div>
  );
}

export function MarkdownRenderer({ files, owner, repo }: MarkdownRendererProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('rendered');
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const entries = Object.entries(files);

  const colsClass =
    entries.length === 1
      ? 'grid-cols-1'
      : entries.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  return (
    <>
      {/* Toggle bar */}
      <div className="flex items-center gap-2 mb-3">
        <div className="join">
          <button
            className={`join-item btn btn-sm ${viewMode === 'rendered' ? 'btn-active' : ''}`}
            onClick={() => setViewMode('rendered')}
          >
            <Eye className="w-4 h-4" />
            Rendered
          </button>
          <button
            className={`join-item btn btn-sm ${viewMode === 'source' ? 'btn-active' : ''}`}
            onClick={() => setViewMode('source')}
          >
            <Code2 className="w-4 h-4" />
            Source
          </button>
        </div>
      </div>

      {/* Grid of variant panels */}
      <div className={`grid ${colsClass} gap-4`}>
        {entries.map(([variantName, file]) => (
          <VariantPanel
            key={variantName}
            variantName={variantName}
            file={file}
            owner={owner}
            repo={repo}
            viewMode={viewMode}
            onClick={() => setSelectedVariant(variantName)}
          />
        ))}
      </div>

      {/* Fullscreen modal */}
      <FullscreenMarkdown
        files={files}
        owner={owner}
        repo={repo}
        selectedVariant={selectedVariant}
        viewMode={viewMode}
        onClose={() => setSelectedVariant(null)}
      />
    </>
  );
}

/** Fullscreen view of a single variant's markdown */
function FullscreenMarkdown({
  files,
  owner,
  repo,
  selectedVariant,
  viewMode,
  onClose,
}: {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
  selectedVariant: string | null;
  viewMode: ViewMode;
  onClose: () => void;
}) {
  const file = selectedVariant ? files[selectedVariant] : undefined;
  const { content } = useFileContent(
    selectedVariant ? owner : undefined,
    selectedVariant ? repo : undefined,
    file?.repoPath,
  );

  return (
    <FullscreenModal
      isOpen={selectedVariant !== null}
      onClose={onClose}
      title={file ? `${selectedVariant} — ${file.name}` : undefined}
    >
      {content !== null && viewMode === 'rendered' && (
        <div className="prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
      )}
      {content !== null && viewMode === 'source' && (
        <pre className="text-sm font-mono whitespace-pre-wrap break-words bg-base-200 rounded-lg p-4 overflow-auto">
          {content}
        </pre>
      )}
    </FullscreenModal>
  );
}
