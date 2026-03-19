import { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, ExternalLink, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { FileGroup, DiscoveredFile } from '../../types';
import { FullscreenModal } from './FullscreenModal';

/* ------------------------------------------------------------------ */
/*  PDF.js dynamic import – keeps it out of the main bundle           */
/* ------------------------------------------------------------------ */
type PDFDocumentProxy = import('pdfjs-dist').PDFDocumentProxy;

let pdfjsPromise: Promise<typeof import('pdfjs-dist')> | null = null;

function loadPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import('pdfjs-dist').then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.min.mjs',
        import.meta.url,
      ).toString();
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/* ------------------------------------------------------------------ */
/*  usePdfDocument – fetches + parses a PDF into a PDFDocumentProxy   */
/* ------------------------------------------------------------------ */
function usePdfDocument(url: string | undefined) {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);

    loadPdfJs()
      .then((pdfjs) => pdfjs.getDocument(url).promise)
      .then((pdf) => {
        if (!cancelled) { setDoc(pdf); setLoading(false); }
      })
      .catch((err) => {
        if (!cancelled) { setError(String(err)); setLoading(false); }
      });

    return () => { cancelled = true; };
  }, [url]);

  return { doc, error, loading };
}

/* ------------------------------------------------------------------ */
/*  PdfCanvas – renders a single PDF page onto a <canvas>            */
/* ------------------------------------------------------------------ */
function PdfCanvas({
  doc,
  pageNum,
  maxWidth,
}: {
  doc: PDFDocumentProxy;
  pageNum: number;
  maxWidth: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let cancelled = false;
    doc.getPage(pageNum).then((page) => {
      if (cancelled || !canvasRef.current) return;
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(maxWidth / viewport.width, 2);
      const scaled = page.getViewport({ scale });
      const canvas = canvasRef.current;
      canvas.width = scaled.width;
      canvas.height = scaled.height;
      canvas.style.width = `${scaled.width / window.devicePixelRatio}px`;
      canvas.style.height = `${scaled.height / window.devicePixelRatio}px`;
      const ctx = canvas.getContext('2d')!;
      page.render({ canvasContext: ctx, viewport: scaled });
    });
    return () => { cancelled = true; };
  }, [doc, pageNum, maxWidth]);

  return <canvas ref={canvasRef} className="mx-auto block" />;
}

/* ------------------------------------------------------------------ */
/*  PdfPanel – per-variant PDF viewer with page navigation            */
/* ------------------------------------------------------------------ */
function PdfPanel({
  file,
  maxWidth,
}: {
  file: DiscoveredFile;
  maxWidth: number;
}) {
  const { doc, error, loading } = usePdfDocument(file.downloadUrl);
  const [page, setPage] = useState(1);
  const totalPages = doc?.numPages ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-base-content/50">
        <span className="loading loading-spinner loading-sm" />
        Loading PDF…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-warning">
        <FileText size={32} />
        <p className="text-sm">Failed to load PDF</p>
        <a
          href={file.downloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm gap-2"
        >
          <ExternalLink size={14} /> Open PDF
        </a>
      </div>
    );
  }

  if (!doc) return null;

  return (
    <div className="flex flex-col gap-2">
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            className="btn btn-ghost btn-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-xs text-base-content/60 font-mono">
            {page} / {totalPages}
          </span>
          <button
            className="btn btn-ghost btn-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      <div className="overflow-auto rounded bg-base-200/30 p-2" style={{ maxHeight: '70vh' }}>
        <PdfCanvas doc={doc} pageNum={page} maxWidth={maxWidth} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FullscreenPdf – fullscreen variant                                */
/* ------------------------------------------------------------------ */
function FullscreenPdf({ file }: { file: DiscoveredFile }) {
  const { doc, error, loading } = usePdfDocument(file.downloadUrl);
  const [page, setPage] = useState(1);
  const totalPages = doc?.numPages ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-base-content/50">
        <span className="loading loading-spinner loading-md" />
        Loading PDF…
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-warning">
        <FileText size={40} />
        <p>Failed to load PDF</p>
        <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm gap-2">
          <ExternalLink size={14} /> Open PDF
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 h-full">
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button className="btn btn-ghost btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm text-base-content/60 font-mono">{page} / {totalPages}</span>
          <button className="btn btn-ghost btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
            <ChevronRight size={16} />
          </button>
        </div>
      )}
      <div className="overflow-auto flex-1 rounded bg-base-200/30 p-4" style={{ maxHeight: '80vh' }}>
        <PdfCanvas doc={doc} pageNum={page} maxWidth={900} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  PdfViewer – main renderer                                         */
/* ------------------------------------------------------------------ */
export default function PdfViewer({ group }: { group: FileGroup }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(600);
  const [fullscreenFile, setFullscreenFile] = useState<{ variantName: string; file: DiscoveredFile } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(([e]) => setContainerWidth(e.contentRect.width));
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const entries = Object.entries(group.files);
  const cols = entries.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2';
  const panelMaxWidth = entries.length === 1 ? containerWidth : Math.floor(containerWidth / 2) - 16;

  const openFullscreen = useCallback((variantName: string, file: DiscoveredFile) => {
    setFullscreenFile({ variantName, file });
  }, []);

  return (
    <div ref={containerRef}>
      <div className={`grid ${cols} gap-4`}>
        {entries.map(([variantName, file]) => (
          <div key={variantName} className="card bg-base-200/50 border border-base-300 overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-base-300 bg-base-200/30 text-xs">
              <span className="lab-label">{variantName}</span>
              <span className="truncate opacity-60">{file.name}</span>
              <span className="ml-auto opacity-50">
                {file.size < 1024 ? `${file.size} B` : `${(file.size / 1024).toFixed(1)} KB`}
              </span>
              <a href={file.downloadUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-xs" title="Open in new tab">
                <ExternalLink size={12} />
              </a>
              <button className="btn btn-ghost btn-xs" title="Fullscreen" onClick={() => openFullscreen(variantName, file)}>
                <Maximize2 size={12} />
              </button>
            </div>

            {/* PDF body */}
            <div className="p-3">
              <PdfPanel file={file} maxWidth={panelMaxWidth} />
            </div>

            {/* Footer */}
            <div className="flex items-center gap-2 px-3 py-1.5 border-t border-base-300 bg-base-200/10 text-xs opacity-60">
              <FileText size={12} />
              PDF Document
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen modal */}
      <FullscreenModal
        isOpen={fullscreenFile !== null}
        onClose={() => setFullscreenFile(null)}
        title={fullscreenFile ? `${fullscreenFile.variantName} — ${group.relativePath}` : undefined}
      >
        {fullscreenFile && <FullscreenPdf file={fullscreenFile.file} />}
      </FullscreenModal>
    </div>
  );
}
