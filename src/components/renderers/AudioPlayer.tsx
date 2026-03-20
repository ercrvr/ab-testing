import { useRef, useState, useCallback } from 'react';
import type { FileGroup } from '../../types';
import { FullscreenModal } from './FullscreenModal';

interface AudioPlayerProps {
  group: FileGroup;
}

export default function AudioPlayer({ group }: AudioPlayerProps) {
  const variants = Object.entries(group.files);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const [synced, setSynced] = useState(false);
  const [fullscreenVariant, setFullscreenVariant] = useState<string | null>(null);
  const syncingRef = useRef(false);

  const handleTimeUpdate = useCallback(
    (sourceIndex: number) => {
      if (!synced || syncingRef.current) return;
      const source = audioRefs.current[sourceIndex];
      if (!source) return;

      syncingRef.current = true;
      audioRefs.current.forEach((el, i) => {
        if (el && i !== sourceIndex) {
          if (Math.abs(el.currentTime - source.currentTime) > 0.3) {
            el.currentTime = source.currentTime;
          }
        }
      });
      syncingRef.current = false;
    },
    [synced],
  );

  const handlePlay = useCallback(
    (sourceIndex: number) => {
      if (!synced) return;
      audioRefs.current.forEach((el, i) => {
        if (el && i !== sourceIndex) el.play().catch(() => {});
      });
    },
    [synced],
  );

  const handlePause = useCallback(
    (sourceIndex: number) => {
      if (!synced) return;
      audioRefs.current.forEach((el, i) => {
        if (el && i !== sourceIndex) el.pause();
      });
    },
    [synced],
  );

  const gridCols =
    variants.length === 1
      ? 'grid-cols-1'
      : variants.length === 2
        ? 'grid-cols-1 md:grid-cols-2'
        : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';

  const fullscreenFile = fullscreenVariant
    ? variants.find(([name]) => name === fullscreenVariant)
    : null;

  return (
    <>
      {/* Sync toggle — only useful with 2+ variants */}
      {variants.length > 1 && (
        <div className="flex justify-end mb-2">
          <label className="label cursor-pointer gap-2">
            <span className="label-text text-xs">Sync playback</span>
            <input
              type="checkbox"
              className="toggle toggle-xs toggle-primary"
              checked={synced}
              onChange={(e) => setSynced(e.target.checked)}
            />
          </label>
        </div>
      )}

      <div className={`grid ${gridCols} gap-4`}>
        {variants.map(([variantName, file], index) => (
          <div key={variantName} className="border border-base-300 rounded-box overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between bg-base-200/50 px-3 py-2 border-b border-base-300">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-sm font-medium truncate">{variantName}</span>
                <span className="badge badge-xs badge-ghost">{file.path.split('.').pop()}</span>
              </div>
              <button
                className="btn btn-ghost btn-xs"
                onClick={() => setFullscreenVariant(variantName)}
                title="Expand"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            </div>

            {/* Audio player */}
            <div className="p-4">
              <audio
                ref={(el) => { audioRefs.current[index] = el; }}
                controls
                className="w-full"
                src={file.downloadUrl}
                onTimeUpdate={() => handleTimeUpdate(index)}
                onPlay={() => handlePlay(index)}
                onPause={() => handlePause(index)}
                preload="metadata"
              >
                Your browser does not support the audio element.
              </audio>
              <div className="mt-2 text-xs text-base-content/50 text-center">
                {file.path.split('/').pop()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen modal */}
      {fullscreenFile && (
        <FullscreenModal
          isOpen={true}
          onClose={() => setFullscreenVariant(null)}
          title={`${fullscreenFile[0]} — ${fullscreenFile[1].path.split('/').pop()}`}
        >
          <div className="flex items-center justify-center p-8">
            <audio
              controls
              className="w-full max-w-2xl"
              src={fullscreenFile[1].downloadUrl}
              preload="metadata"
            >
              Your browser does not support the audio element.
            </audio>
          </div>
        </FullscreenModal>
      )}
    </>
  );
}
