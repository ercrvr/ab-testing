import { lazy, Suspense } from 'react';
import type { FileGroup } from '../../types';
import { ImageRenderer } from './ImageRenderer';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CodeRenderer } from './CodeRenderer';
import { LoadingSpinner } from '../ui/LoadingSpinner';

// Dynamic imports for heavier renderers (DEV_SPEC §1498)
const JsonDiff = lazy(() =>
  import('./JsonDiff').then((m) => ({ default: m.JsonDiff })),
);
const CsvTable = lazy(() =>
  import('./CsvTable').then((m) => ({ default: m.CsvTable })),
);
const PdfViewer = lazy(() =>
  import('./PdfViewer').then((m) => ({ default: m.PdfViewer })),
);

interface FileGroupRendererProps {
  group: FileGroup;
  owner: string;
  repo: string;
}

export function FileGroupRenderer({ group, owner, repo }: FileGroupRendererProps) {
  switch (group.contentType) {
    case 'image':
    case 'svg':
      return <ImageRenderer files={group.files} />;
    case 'markdown':
      return <MarkdownRenderer files={group.files} owner={owner} repo={repo} />;
    case 'code':
    case 'plaintext':
    case 'xml':
      return <CodeRenderer files={group.files} owner={owner} repo={repo} />;
    case 'json':
      return (
        <Suspense fallback={<LoadingSpinner size="sm" text="Loading JSON viewer..." />}>
          <JsonDiff files={group.files} owner={owner} repo={repo} />
        </Suspense>
      );
    case 'csv':
      return (
        <Suspense fallback={<LoadingSpinner size="sm" text="Loading CSV table..." />}>
          <CsvTable files={group.files} owner={owner} repo={repo} />
        </Suspense>
      );
    case 'pdf':
      return (
        <Suspense fallback={<LoadingSpinner size="sm" text="Loading PDF viewer..." />}>
          <PdfViewer files={group.files} />
        </Suspense>
      );
    default:
      return (
        <div className="border border-base-300 rounded-box p-6 text-center text-base-content/50">
          <p className="text-sm">
            Renderer for{' '}
            <span className="badge badge-sm badge-ghost">{group.contentType}</span>{' '}
            coming in Phase 4
          </p>
        </div>
      );
  }
}
