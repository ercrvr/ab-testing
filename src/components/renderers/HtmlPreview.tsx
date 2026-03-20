import { useState } from 'react';
import { Eye, Code, Expand } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { useFileContent } from '../../hooks/useFileContent';
import { CodeRenderer } from './CodeRenderer';
import { FullscreenModal } from './FullscreenModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBanner } from '../ui/ErrorBanner';

interface HtmlPreviewProps {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
}

/** Renders a single variant's HTML preview in a sandboxed iframe */
function VariantPreviewPanel({
  variantName,
  file,
  owner,
  repo,
  onExpand,
}: {
  variantName: string;
  file: DiscoveredFile;
  owner: string;
  repo: string;
  onExpand: () => void;
}) {
  const { content, isLoading, error } = useFileContent(owner, repo, file.repoPath);

  return (
    <div className="border border-base-300 rounded-box overflow-hidden">
      {/* Variant header */}
      <div className="px-3 py-2 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{variantName}</span>
          <span className="text-xs text-base-content/50">
            {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
          </span>
        </div>
        <button
          className="btn btn-ghost btn-xs"
          onClick={onExpand}
          title="Expand to fullscreen"
        >
          <Expand className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Preview area */}
      <div className="h-96">
        {isLoading && (
          <div className="p-4">
            <LoadingSpinner size="sm" text="Loading..." />
          </div>
        )}
        {error && (
          <div className="p-4">
            <ErrorBanner message={error} />
          </div>
        )}
        {content && (
          <iframe
            sandbox="allow-scripts"
            srcDoc={content}
            className="w-full h-full border-0 bg-white"
            title={`${variantName} preview`}
          />
        )}
      </div>
    </div>
  );
}

/** Fullscreen view of a single variant's HTML preview */
function FullscreenPreview({
  files,
  owner,
  repo,
  selectedVariant,
  onClose,
}: {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
  selectedVariant: string | null;
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
      {content && (
        <iframe
          sandbox="allow-scripts"
          srcDoc={content}
          className="w-full border-0 bg-white"
          style={{ height: '85vh' }}
          title={`${selectedVariant} fullscreen preview`}
        />
      )}
    </FullscreenModal>
  );
}

export function HtmlPreview({ files, owner, repo }: HtmlPreviewProps) {
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
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
      {/* Toolbar */}
      <div className="flex items-center gap-2 mb-3">
        <button
          className={`btn btn-sm gap-1.5 ${mode === 'preview' ? 'btn-active' : ''}`}
          onClick={() => setMode('preview')}
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>
        <button
          className={`btn btn-sm gap-1.5 ${mode === 'source' ? 'btn-active' : ''}`}
          onClick={() => setMode('source')}
        >
          <Code className="w-4 h-4" />
          Source
        </button>
      </div>

      {/* Body */}
      {mode === 'source' ? (
        <CodeRenderer files={files} owner={owner} repo={repo} />
      ) : (
        <>
          <div className={`grid ${colsClass} gap-4`}>
            {entries.map(([variantName, file]) => (
              <VariantPreviewPanel
                key={variantName}
                variantName={variantName}
                file={file}
                owner={owner}
                repo={repo}
                onExpand={() => setSelectedVariant(variantName)}
              />
            ))}
          </div>

          <FullscreenPreview
            files={files}
            owner={owner}
            repo={repo}
            selectedVariant={selectedVariant}
            onClose={() => setSelectedVariant(null)}
          />
        </>
      )}
    </>
  );
}
