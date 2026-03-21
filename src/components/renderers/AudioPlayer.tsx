import { useRef, useState, useCallback, useEffect } from 'react';
import type { FileGroup } from '../../types';
import { FullscreenModal } from './FullscreenModal';

interface AudioPlayerProps {
  group: FileGroup;
}

export default function AudioPlayer({ group }: AudioPlayerProps) {
  const variants = Object.entries(group.files);
  const audioRefs = useRef<(HTMLAudioElement | null)[]>([]);
  const fullscreenAudioRef = useRef<HTMLAudioElement>(null);
  const [synced, setSynced] = useState(false);
  const [fullscreenVariant, setFullscreenVariant] = useState<string | null>(null);

  // Timestamp-based cooldown prevents infinite sync loops where setting
  // currentTime fires timeUpdate on the target, cascading back.
  const lastSyncRef = useRef(0);
  const SYNC_COOLDOWN_MS = 100;
  const activePlayerRef = useRef<number | null>(null);

  // Track mounted state to prevent play() calls after unmount
  const mountedRef = useRef(true);

  // Play lock: after handlePlay triggers sibling play(), freeze
  // handleTimeUpdate/handleSeeking for this duration so they don't
  // set currentTime on elements mid-play-transition (which aborts the promise).
  const syncLockUntilRef = useRef(0);
  const SYNC_PLAY_LOCK_MS = 500;

  // Cleanup: pause all media and release resources on unmount to prevent
  // AbortError from pending play() promises when navigating away
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      audioRefs.current.forEach((el) => {
        if (el) {
          el.pause();
          el.removeAttribute('src');
          el.load();
        }
      });
      if (fullscreenAudioRef.current) {
        fullscreenAudioRef.current.pause();
        fullscreenAudioRef.current.removeAttribute('src');
        fullscreenAudioRef.current.load();
      }
    };
  }, []);

  // Controlled autoplay for fullscreen modal — replaces autoPlay attribute
  // to ensure the play() promise is always caught
  useEffect(() => {
    if (fullscreenAudioRef.current && fullscreenVariant) {
      fullscreenAudioRef.current.play().catch(() => {});
    }
  }, [fullscreenVariant]);

  const handleTimeUpdate = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;

      // Respect play lock — don't seek while siblings are starting playback
      if (Date.now() < syncLockUntilRef.current) return;

      const now = Date.now();
      if (now - lastSyncRef.current < SYNC_COOLDOWN_MS) return;

      // Only sync from the active player (the one the user interacted with)
      if (activePlayerRef.current !== null && activePlayerRef.current !== sourceIndex) return;

      const source = audioRefs.current[sourceIndex];
      if (!source) return;

      // Only seek siblings that are ready and meaningfully out of sync
      const needsSync = audioRefs.current.some(
        (el, i) =>
          el &&
          i !== sourceIndex &&
          el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          Math.abs(el.currentTime - source.currentTime) > 0.5,
      );
      if (!needsSync) return;

      lastSyncRef.current = now;
      audioRefs.current.forEach((el, i) => {
        if (
          el &&
          i !== sourceIndex &&
          el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          el.currentTime = source.currentTime;
        }
      });
    },
    [synced],
  );

  const handlePlay = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;
      activePlayerRef.current = sourceIndex;

      const source = audioRefs.current[sourceIndex];

      // Lock out handleTimeUpdate/handleSeeking while siblings start
      syncLockUntilRef.current = Date.now() + SYNC_PLAY_LOCK_MS;
      lastSyncRef.current = Date.now();

      audioRefs.current.forEach((el, i) => {
        if (el && i !== sourceIndex && el.paused) {
          // Sync position BEFORE playing — avoids seek-during-play race
          if (source) el.currentTime = source.currentTime;
          el.play().catch(() => {});
        }
      });
    },
    [synced],
  );

  const handlePause = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;

      // Respect play lock — don't cascade pauses while siblings are starting.
      // Setting currentTime before play() can fire a transient browser pause
      // event on the sibling, which would cascade back and kill the source.
      if (Date.now() < syncLockUntilRef.current) return;

      // Only cascade pause from the active player (user-initiated).
      // Ignore pause events from siblings that paused due to buffering/seeking.
      if (activePlayerRef.current !== null && activePlayerRef.current !== sourceIndex) return;

      activePlayerRef.current = sourceIndex;
      lastSyncRef.current = Date.now();
      audioRefs.current.forEach((el, i) => {
        if (el && i !== sourceIndex && !el.paused) el.pause();
      });
    },
    [synced],
  );

  const handleSeeking = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;

      // Respect play lock
      if (Date.now() < syncLockUntilRef.current) return;

      activePlayerRef.current = sourceIndex;
      const source = audioRefs.current[sourceIndex];
      if (!source) return;

      lastSyncRef.current = Date.now();
      audioRefs.current.forEach((el, i) => {
        if (
          el &&
          i !== sourceIndex &&
          el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          el.currentTime = source.currentTime;
        }
      });
    },
    [synced],
  );

  // Reset active player when sync is toggled off
  useEffect(() => {
    if (!synced) {
      activePlayerRef.current = null;
    }
  }, [synced]);

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
                onSeeking={() => handleSeeking(index)}
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
              ref={fullscreenAudioRef}
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
