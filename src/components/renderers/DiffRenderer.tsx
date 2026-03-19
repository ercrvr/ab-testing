import { useState, useEffect, useMemo } from 'react';
import { diffLines } from 'diff';
import type { DiscoveredFile } from '../../types';
import { getFileContent } from '../../lib/github';
import { getShikiLanguage } from '../../lib/content-type';
import { highlightCode } from '../../lib/shiki';
import { FullscreenModal } from './FullscreenModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBanner } from '../ui/ErrorBanner';

interface DiffRendererProps {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
}

type DiffStatus = 'added' | 'removed' | 'unchanged';

/* ── Hooks ──────────────────────────────────────────────────────── */

/**
 * Load every variant's text content in parallel.
 * Uses the same cached `getFileContent` from github.ts.
 */
function useAllContents(
  owner: string,
  repo: string,
  files: Record<string, DiscoveredFile>,
) {
  const [contents, setContents] = useState<Record<string, string> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fileKey = useMemo(
    () =>
      Object.entries(files)
        .map(([k, f]) => `${k}:${f.repoPath}`)
        .join('|'),
    [files],
  );

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    setContents(null);

    const entries = Object.entries(files);

    Promise.all(entries.map(([, f]) => getFileContent(owner, repo, f.repoPath)))
      .then((results) => {
        if (cancelled) return;
        const map: Record<string, string> = {};
        entries.forEach(([name], i) => {
          map[name] = results[i];
        });
        setContents(map);
        setIsLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load files');
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [owner, repo, fileKey]);

  return { contents, isLoading, error };
}

/**
 * Highlight code with Shiki, then inject per-line diff CSS classes.
 */
function useDiffHighlight(
  content: string | null,
  baselineContent: string | null,
  extension: string,
  isBaseline: boolean,
) {
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (content === null) {
      setHtml(null);
      return;
    }

    let cancelled = false;
    const lang = getShikiLanguage(extension);

    highlightCode(content, lang).then((raw) => {
      if (cancelled) return;

      if (baselineContent !== null && baselineContent !== content) {
        const statuses = computeLineStatuses(
          baselineContent,
          content,
          isBaseline ? 'baseline' : 'variant',
        );
        setHtml(injectDiffClasses(raw, statuses));
      } else {
        setHtml(raw);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [content, baselineContent, extension, isBaseline]);

  return html;
}

/* ── Diff helpers ───────────────────────────────────────────────── */

/**
 * Walk `diffLines()` output and build a per-line status array for one side.
 *
 * - **baseline** side: emits `removed` + `unchanged` lines (skips `added`).
 * - **variant** side: emits `added` + `unchanged` lines (skips `removed`).
 */
function computeLineStatuses(
  baseline: string,
  variant: string,
  side: 'baseline' | 'variant',
): DiffStatus[] {
  const changes = diffLines(baseline, variant);
  const statuses: DiffStatus[] = [];

  for (const change of changes) {
    const lines = change.value.replace(/\n$/, '').split('\n');

    if (change.added) {
      if (side === 'variant') lines.forEach(() => statuses.push('added'));
    } else if (change.removed) {
      if (side === 'baseline') lines.forEach(() => statuses.push('removed'));
    } else {
      lines.forEach(() => statuses.push('unchanged'));
    }
  }

  return statuses;
}

/**
 * Inject `diff-added` / `diff-removed` classes into Shiki's HTML output.
 * Shiki v3 emits one `<span class="line">` per source line.
 */
function injectDiffClasses(shikiHtml: string, statuses: DiffStatus[]): string {
  let i = 0;
  return shikiHtml.replace(/<span class="line">/g, () => {
    const s = statuses[i++];
    if (s && s !== 'unchanged') return `<span class="line diff-${s}">`;
    return '<span class="line">';
  });
}

/* ── Components ─────────────────────────────────────────────────── */

function DiffPanel({
  variantName,
  content,
  baselineContent,
  isBaseline,
  file,
  onClick,
}: {
  variantName: string;
  content: string;
  baselineContent: string;
  isBaseline: boolean;
  file: DiscoveredFile;
  onClick: () => void;
}) {
  const html = useDiffHighlight(content, baselineContent, file.extension, isBaseline);

  return (
    <div
      className="border border-base-300 rounded-box overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold">{variantName}</span>
          {isBaseline && (
            <span className="badge badge-xs badge-neutral">base</span>
          )}
        </div>
        <span className="text-xs text-base-content/50">
          {file.size < 1024
            ? `${file.size} B`
            : `${(file.size / 1024).toFixed(1)} KB`}
        </span>
      </div>

      {/* Code with diff highlights */}
      <div className="max-h-96 overflow-auto">
        {html ? (
          <div
            className="shiki-wrapper diff-view line-numbers text-sm"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <div className="p-4">
            <LoadingSpinner size="sm" text="Highlighting..." />
          </div>
        )}
      </div>
    </div>
  );
}

function FullscreenDiff({
  variantName,
  content,
  baselineContent,
  isBaseline,
  file,
  onClose,
}: {
  variantName: string | null;
  content: string;
  baselineContent: string;
  isBaseline: boolean;
  file?: DiscoveredFile;
  onClose: () => void;
}) {
  const html = useDiffHighlight(
    variantName ? content : null,
    baselineContent,
    file?.extension ?? '',
    isBaseline,
  );

  return (
    <FullscreenModal
      isOpen={variantName !== null}
      onClose={onClose}
      title={file ? `${variantName} — ${file.name}` : undefined}
    >
      {html ? (
        <div
          className="shiki-wrapper diff-view line-numbers text-sm"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <LoadingSpinner size="sm" text="Highlighting..." />
      )}
    </FullscreenModal>
  );
}

export function DiffRenderer({ files, owner, repo }: DiffRendererProps) {
  const { contents, isLoading, error } = useAllContents(owner, repo, files);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const entries = Object.entries(files);
  const baselineKey = entries[0]?.[0] ?? '';

  const colsClass =
    entries.length === 1
      ? 'grid-cols-1'
      : entries.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  if (isLoading) {
    return <LoadingSpinner size="sm" text="Loading files for diff..." />;
  }
  if (error) {
    return <ErrorBanner message={error} />;
  }
  if (!contents) return null;

  const selectedFile = selectedVariant ? files[selectedVariant] : undefined;

  return (
    <>
      <div className={`grid ${colsClass} gap-4`}>
        {entries.map(([name, file]) => (
          <DiffPanel
            key={name}
            variantName={name}
            content={contents[name] ?? ''}
            baselineContent={contents[baselineKey] ?? ''}
            isBaseline={name === baselineKey}
            file={file}
            onClick={() => setSelectedVariant(name)}
          />
        ))}
      </div>

      {/* Fullscreen modal */}
      <FullscreenDiff
        variantName={selectedVariant}
        content={selectedVariant ? (contents[selectedVariant] ?? '') : ''}
        baselineContent={contents[baselineKey] ?? ''}
        isBaseline={selectedVariant === baselineKey}
        file={selectedFile}
        onClose={() => setSelectedVariant(null)}
      />
    </>
  );
}
