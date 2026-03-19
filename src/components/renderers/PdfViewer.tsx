import { useState, useEffect } from 'react';
import { Maximize2, FileText, ExternalLink, Download, AlertTriangle } from 'lucide-react';
import type { DiscoveredFile } from '../../types';
import { FullscreenModal } from './FullscreenModal';

/* ── Helpers ── */

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Hook: fetches a PDF from a raw URL as binary,
 * re-wraps it as a Blob with the correct MIME type,
 * and returns a local object URL the browser can render inline.
 *
 * raw.githubusercontent.com serves PDFs as application/octet-stream,
 * which prevents <embed> and <iframe> from using the browser's built-in
 * PDF viewer. Creating a Blob URL with the correct MIME fixes this.
 */
function usePdfBlobUrl(downloadUrl: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!downloadUrl) return;

    let cancelled = false;
    let url: string | null = null;
    setIsLoading(true);
    setError(null);
    setBlobUrl(null);

    fetch(downloadUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then((raw) => {
        if (cancelled) return;
        // Re-create blob with correct MIME so the browser PDF viewer kicks in
        const pdfBlob = new Blob([raw], { type: 'application/pdf' });
        url = URL.createObjectURL(pdfBlob);
        setBlobUrl(url);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load PDF');
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [downloadUrl]);

  return { blobUrl, isLoading, error };
}

/** Detect mobile/touch devices where inline PDF rendering rarely works */
function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
}

/* ── PDF iframe panel ── */

function PdfFrame({ url, title, height = '24rem' }: { url: string; title: string; height?: string }) {
  return (
    <iframe
      src={url}
      title={title}
      className="w-full border-0 rounded"
      style={{ height, minHeight: '12rem' }}
    />
  );
}

/* ── Mobile fallback: download + open link ── */

function MobileFallback({ file }: { file: DiscoveredFile }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-base-content/60">
      <FileText size={48} className="text-primary/40" />
      <p className="text-sm text-center">
        Inline PDF preview is not available on this device.
      </p>
      <a
        href={file.downloadUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-sm gap-2"
      >
        <Download size={14} />
        Open PDF
      </a>
    </div>
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
  const mobile = isMobileDevice();
  const { blobUrl, isLoading, error } = usePdfBlobUrl(mobile ? undefined : file.downloadUrl);

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

      {/* PDF content area */}
      <div onClick={(e) => e.stopPropagation()}>
        {mobile ? (
          <MobileFallback file={file} />
        ) : isLoading ? (
          <div className="flex items-center justify-center py-12">
            <span className="loading loading-spinner loading-md text-primary" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-warning">
            <AlertTriangle size={24} />
            <p className="text-sm">{error}</p>
            <a
              href={file.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-sm btn-ghost gap-1"
            >
              <Download size={14} /> Download instead
            </a>
          </div>
        ) : blobUrl ? (
          <PdfFrame url={blobUrl} title={`${variantName} — ${file.name}`} />
        ) : null}
      </div>

      {/* Footer */}
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

  const mobile = isMobileDevice();
  const { blobUrl: fsBlobUrl } = usePdfBlobUrl(
    !mobile && selectedFile ? selectedFile.downloadUrl : undefined,
  );

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
          mobile ? (
            <MobileFallback file={selectedFile} />
          ) : fsBlobUrl ? (
            <PdfFrame
              url={fsBlobUrl}
              title={selectedFile.name}
              height="85vh"
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          )
        )}
      </FullscreenModal>
    </>
  );
}
