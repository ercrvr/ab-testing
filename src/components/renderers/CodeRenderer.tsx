import { useState, useEffect } from 'react';
import { Hash } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { useFileContent } from '../../hooks/useFileContent';
import { getShikiLanguage } from '../../lib/content-type';
import { highlightCode } from '../../lib/shiki';
import { FullscreenModal } from './FullscreenModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBanner } from '../ui/ErrorBanner';

interface CodeRendererProps {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
}

/**
 * Hook that takes raw code content + file extension and returns
 * Shiki-highlighted HTML. Returns null while loading.
 */
function useHighlightedCode(content: string | null, extension: string) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (content === null) {
      setHtml(null);
      return;
    }

    let cancelled = false;
    const lang = getShikiLanguage(extension);

    highlightCode(content, lang).then((result) => {
      if (!cancelled) setHtml(result);
    });

    return () => {
      cancelled = true;
    };
  }, [content, extension]);

  return html;
}

/** Renders a single variant's syntax-highlighted code */
function VariantCodePanel({
  variantName,
  file,
  owner,
  repo,
  showLineNumbers,
  onClick,
}: {
  variantName: string;
  file: DiscoveredFile;
  owner: string;
  repo: string;
  showLineNumbers: boolean;
  onClick: () => void;
}) {
  const { content, isLoading, error } = useFileContent(owner, repo, file.repoPath);
  const highlightedHtml = useHighlightedCode(content, file.extension);

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

      {/* Code area */}
      <div className="max-h-96 overflow-auto">
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
        {highlightedHtml && (
          <div
            className={`shiki-wrapper text-sm${showLineNumbers ? ' line-numbers' : ''}`}
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        )}
      </div>
    </div>
  );
}

export function CodeRenderer({ files, owner, repo }: CodeRendererProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true);
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
          className={`btn btn-sm gap-1.5 ${showLineNumbers ? 'btn-active' : ''}`}
          onClick={() => setShowLineNumbers((v) => !v)}
        >
          <Hash className="w-4 h-4" />
          Lines
        </button>
      </div>

      {/* Grid of variant panels */}
      <div className={`grid ${colsClass} gap-4`}>
        {entries.map(([variantName, file]) => (
          <VariantCodePanel
            key={variantName}
            variantName={variantName}
            file={file}
            owner={owner}
            repo={repo}
            showLineNumbers={showLineNumbers}
            onClick={() => setSelectedVariant(variantName)}
          />
        ))}
      </div>

      {/* Fullscreen modal */}
      <FullscreenCode
        files={files}
        owner={owner}
        repo={repo}
        selectedVariant={selectedVariant}
        showLineNumbers={showLineNumbers}
        onClose={() => setSelectedVariant(null)}
      />
    </>
  );
}

/** Fullscreen view of a single variant's code */
function FullscreenCode({
  files,
  owner,
  repo,
  selectedVariant,
  showLineNumbers,
  onClose,
}: {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
  selectedVariant: string | null;
  showLineNumbers: boolean;
  onClose: () => void;
}) {
  const file = selectedVariant ? files[selectedVariant] : undefined;
  const { content } = useFileContent(
    selectedVariant ? owner : undefined,
    selectedVariant ? repo : undefined,
    file?.repoPath,
  );
  const highlightedHtml = useHighlightedCode(
    content,
    file?.extension ?? '',
  );

  return (
    <FullscreenModal
      isOpen={selectedVariant !== null}
      onClose={onClose}
      title={file ? `${selectedVariant} — ${file.name}` : undefined}
    >
      {highlightedHtml && (
        <div
          className={`shiki-wrapper text-sm${showLineNumbers ? ' line-numbers' : ''}`}
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      )}
    </FullscreenModal>
  );
}
