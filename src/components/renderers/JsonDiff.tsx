import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { useFileContent } from '../../hooks/useFileContent';
import { FullscreenModal } from './FullscreenModal';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { ErrorBanner } from '../ui/ErrorBanner';

interface JsonDiffProps {
  files: Record<string, DiscoveredFile>;
  owner: string;
  repo: string;
}

// ── Color-coded value rendering ──

function JsonValue({ value }: { value: unknown }) {
  if (value === null) {
    return <span className="text-base-content/40 italic">null</span>;
  }
  if (typeof value === 'string') {
    return <span className="text-success">&quot;{value}&quot;</span>;
  }
  if (typeof value === 'number') {
    return <span className="text-info">{String(value)}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className="text-secondary">{String(value)}</span>;
  }
  return <span>{String(value)}</span>;
}

// ── Recursive collapsible JSON tree node ──

function JsonNode({
  keyName,
  value,
  defaultOpen = true,
  depth = 0,
}: {
  keyName?: string;
  value: unknown;
  defaultOpen?: boolean;
  depth?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // Primitive values — render inline
  if (value === null || typeof value !== 'object') {
    return (
      <div className="flex items-start gap-1 py-0.5" style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <span className="text-base-content/70 shrink-0">{keyName}:</span>
        )}
        <JsonValue value={value} />
      </div>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as unknown[]).map((v, i) => [String(i), v] as const)
    : Object.entries(value as Record<string, unknown>);
  const count = entries.length;
  const bracket = isArray ? ['[', ']'] : ['{', '}'];
  const label = isArray ? `Array(${count})` : `Object(${count})`;

  // Empty container
  if (count === 0) {
    return (
      <div className="flex items-start gap-1 py-0.5" style={{ paddingLeft: depth * 16 }}>
        {keyName !== undefined && (
          <span className="text-base-content/70 shrink-0">{keyName}:</span>
        )}
        <span className="text-base-content/40">
          {bracket[0]}{bracket[1]}
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Toggle row */}
      <button
        className="flex items-center gap-1 py-0.5 w-full text-left hover:bg-base-200/60 rounded transition-colors"
        style={{ paddingLeft: depth * 16 }}
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-base-content/50 shrink-0" />
        )}
        {keyName !== undefined && (
          <span className="text-base-content/70 shrink-0">{keyName}:</span>
        )}
        <span className="text-base-content/50 text-xs">{label}</span>
      </button>

      {/* Children */}
      {isOpen &&
        entries.map(([childKey, childVal]) => (
          <JsonNode
            key={childKey}
            keyName={isArray ? undefined : childKey}
            value={childVal}
            defaultOpen={depth < 1}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

// ── Variant panel ──

function VariantJsonPanel({
  variantName,
  file,
  owner,
  repo,
  onClick,
}: {
  variantName: string;
  file: DiscoveredFile;
  owner: string;
  repo: string;
  onClick: () => void;
}) {
  const { content, isLoading, error } = useFileContent(owner, repo, file.repoPath);

  let parsed: unknown = null;
  let parseError: string | null = null;

  if (content !== null) {
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      parseError = e instanceof Error ? e.message : 'Invalid JSON';
    }
  }

  return (
    <div
      className="border border-base-300 rounded-box overflow-hidden cursor-pointer hover:border-primary/40 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="px-3 py-2 border-b border-base-300 bg-base-200/50 flex items-center justify-between">
        <span className="font-mono text-sm font-semibold">{variantName}</span>
        <span className="text-xs text-base-content/50">
          {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
        </span>
      </div>

      {/* Tree body */}
      <div className="max-h-96 overflow-auto p-3 font-mono text-sm">
        {isLoading && <LoadingSpinner size="sm" text="Loading..." />}
        {error && <ErrorBanner message={error} />}
        {parseError && <ErrorBanner message={`JSON parse error: ${parseError}`} />}
        {parsed !== null && !parseError && (
          <JsonNode value={parsed} defaultOpen={true} />
        )}
      </div>
    </div>
  );
}

// ── Main component ──

export function JsonDiff({ files, owner, repo }: JsonDiffProps) {
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
      <div className={`grid ${colsClass} gap-4`}>
        {entries.map(([variantName, file]) => (
          <VariantJsonPanel
            key={variantName}
            variantName={variantName}
            file={file}
            owner={owner}
            repo={repo}
            onClick={() => setSelectedVariant(variantName)}
          />
        ))}
      </div>

      {/* Fullscreen modal */}
      <FullscreenJson
        files={files}
        owner={owner}
        repo={repo}
        selectedVariant={selectedVariant}
        onClose={() => setSelectedVariant(null)}
      />
    </>
  );
}

// ── Fullscreen view ──

function FullscreenJson({
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

  let parsed: unknown = null;
  if (content !== null) {
    try {
      parsed = JSON.parse(content);
    } catch {
      // ignore in fullscreen — error already shown in panel
    }
  }

  return (
    <FullscreenModal
      isOpen={selectedVariant !== null}
      onClose={onClose}
      title={file ? `${selectedVariant} — ${file.name}` : undefined}
    >
      {parsed !== null && (
        <div className="font-mono text-sm p-4">
          <JsonNode value={parsed} defaultOpen={true} />
        </div>
      )}
    </FullscreenModal>
  );
}
