import type { FileGroup } from '../../types';
import { ImageRenderer } from './ImageRenderer';
import { MarkdownRenderer } from './MarkdownRenderer';

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
