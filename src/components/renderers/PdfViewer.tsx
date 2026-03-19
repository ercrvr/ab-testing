import { useState } from 'react';
import { Maximize2, FileText, ExternalLink } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { FullscreenModal } from './FullscreenModal';

/* ── Helper ── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ── Embedded PDF panel ── */

function PdfEmbed({
  url,
  title,
  height = '24rem',
}: {
  url: string;
  title: string;
  height?: string;
}) {
  const [embedFailed, setEmbedFailed] = useState(false);

  if (embedFailed) {
    // iframe fallback — some browsers don't support <embed> for PDF
    return (
      <iframe
        src={url}
        title={title}
        className="w-full border-0"
        style={{ height }}
      />
    );
  }

  return (
    <embed
      src={url}
      type="application/pdf"
      className="w-full"
      style={{ height }}
      onError={() => setEmbedFailed(true)}
    />
  );
}

/* ── Variant panel ── */

function VariantPanel({
  variantName,
  file,
  onClick,
}: {
  variantName: string;
  file: DiscoveredFile;
  onClick: () => void;
}) {
  return (
    <div
      className="border border-base-300 rounded-box overflow-hidden bg-base-100 cursor-pointer hover:border-primary/30 transition-colors"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-base-200/50 border-b border-base-300">
        <div className="flex items-center gap-2">
          <span className="lab-label text-primary">{variantName}</span>
          <span className="text-xs text-base-content/40">
            {file.name}
            {file.size > 0 && ` · ${formatFileSize(file.size)}`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={file.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-xs"
            onClick={(e) => e.stopPropagation()}
            title="Open in new tab"
          >
            <ExternalLink size={14} />
          </a>
          <Maximize2 size={14} className="text-base-content/30" />
        </div>
      </div>

      {/* PDF embed */}
      <PdfEmbed url={file.downloadUrl} title={`${variantName} — ${file.name}`} />

      {/* Footer with icon */}
      <div className="px-3 py-2 border-t border-base-300 flex items-center gap-2 text-xs text-base-content/50">
        <FileText size={14} />
        <span>PDF Document</span>
      </div>
    </div>
  );
}

/* ── Main PdfViewer renderer ── */

interface PdfViewerProps {
  files: Record<string, DiscoveredFile>;
}

export function PdfViewer({ files }: PdfViewerProps) {
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const entries = Object.entries(files);
  const selectedFile = selectedVariant ? files[selectedVariant] : undefined;

  const colsClass =
    entries.length === 1
      ? 'grid-cols-1'
      : entries.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3';

  return (
    <>
      <div className={`grid ${colsClass} gap-4`}>
        {entries.map(([variantName, file]) => (
          <VariantPanel
            key={variantName}
            variantName={variantName}
            file={file}
            onClick={() => setSelectedVariant(variantName)}
          />
        ))}
      </div>

      <FullscreenModal
        isOpen={selectedVariant !== null}
        onClose={() => setSelectedVariant(null)}
        title={
          selectedFile
            ? `${selectedVariant} — ${selectedFile.name}`
            : undefined
        }
      >
        {selectedFile && (
          <PdfEmbed
            url={selectedFile.downloadUrl}
            title={selectedFile.name}
            height="85vh"
          />
        )}
      </FullscreenModal>
    </>
  );
}
