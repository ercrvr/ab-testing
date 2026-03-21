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

  // ---- Sync: master/slave + polling ----
  //
  // Previous approach used bidirectional event handlers on every element with
  // locks, cooldowns, and safety nets to prevent cascading loops.  After 8 PRs
  // of whack-a-mole, we replaced it with the model every proven sync player
  // uses (ViewSync, Bocoup/Popcorn.js, etc.):
  //
  //   1. The element the user interacts with becomes the "master"
  //   2. A 250ms polling loop keeps slaves in sync with the master
  //   3. Events from slave elements are ignored — no cascades possible
  //
  // This eliminates all cascade bugs by design: play/pause/seek events from
  // slaves never propagate back to the master.
  const masterRef = useRef<number | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  const SYNC_INTERVAL_MS = 250;
  const SYNC_DRIFT_THRESHOLD = 0.3; // seconds

  // ---- Sync helpers (stable — only reference refs, no reactive deps) ----

  const stopSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }
  }, []);

  const startSync = useCallback(() => {
    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
    }

    const tick = () => {
      if (!mountedRef.current || masterRef.current === null) return;
      const master = audioRefs.current[masterRef.current];
      if (!master || master.paused) return;

      audioRefs.current.forEach((el, i) => {
        if (!el || i === masterRef.current) return;
        // Correct drift — only hard-seek when meaningfully out of sync
        if (Math.abs(el.currentTime - master.currentTime) > SYNC_DRIFT_THRESHOLD) {
          el.currentTime = master.currentTime;
        }
        // Restart stalled slaves (browser may pause them during load)
        if (el.paused && el.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          el.play().catch(() => {});
        }
      });
    };

    tick(); // immediate first correction
    syncIntervalRef.current = setInterval(tick, SYNC_INTERVAL_MS);
  }, []);

  // ---- Lifecycle ----

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
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

  // Controlled autoplay for fullscreen modal
  useEffect(() => {
    if (fullscreenAudioRef.current && fullscreenVariant) {
      fullscreenAudioRef.current.play().catch(() => {});
    }
  }, [fullscreenVariant]);

  // Reset when sync toggled off
  useEffect(() => {
    if (!synced) {
      stopSync();
      masterRef.current = null;
    }
  }, [synced, stopSync]);

  // ---- Event handlers ----

  const handlePlay = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;

      const currentMaster =
        masterRef.current !== null ? audioRefs.current[masterRef.current] : null;

      // Become master if: no master yet, or current master is paused/gone.
      // A paused master means this is a fresh user gesture on a (possibly
      // different) element — not a programmatic play from the sync loop.
      if (masterRef.current === null || !currentMaster || currentMaster.paused) {
        masterRef.current = sourceIndex;
        startSync();
        return;
      }

      // Current master is playing — slave events are ignored
      if (sourceIndex !== masterRef.current) return;

      // Master itself resumed (e.g., after buffering) — ensure loop runs
      startSync();
    },
    [synced, startSync],
  );

  const handlePause = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;

      // Only the master can cascade pauses
      if (sourceIndex !== masterRef.current) return;

      stopSync();
      audioRefs.current.forEach((el, i) => {
        if (el && i !== sourceIndex && !el.paused) el.pause();
      });
    },
    [synced, stopSync],
  );

  const handleSeeking = useCallback(
    (sourceIndex: number) => {
      if (!synced || !mountedRef.current) return;

      // Only the master can cascade seeks
      if (sourceIndex !== masterRef.current) return;

      const source = audioRefs.current[sourceIndex];
      if (!source) return;

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

  // ---- Render ----

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

            {/* Audio player — no onTimeUpdate (polling replaces it) */}
            <div className="p-4">
              <audio
                ref={(el) => { audioRefs.current[index] = el; }}
                controls
                className="w-full"
                src={file.downloadUrl}
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
