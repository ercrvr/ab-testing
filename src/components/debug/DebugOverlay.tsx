import { useState, useEffect, useRef, useCallback } from 'react';

interface LogEntry {
  id: number;
  time: string;
  tag: string;
  message: string;
  color: string;
}

let logId = 0;
let globalAddLog: ((tag: string, message: string, color?: string) => void) | null = null;
let globalShowOverlay: (() => void) | null = null;

const ts = () => new Date().toISOString().slice(11, 23);

function installInterceptors() {
  const addLog = (tag: string, message: string, color = '#e2e8f0') => {
    globalAddLog?.(tag, message, color);
  };

  // ── Console Error Interceptor ──
  const origConsoleError = console.error.bind(console);
  console.error = function (...args: unknown[]) {
    origConsoleError(...args);
    const message = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    addLog('ERROR', message.slice(0, 500), '#fca5a5');
    globalShowOverlay?.();
  };

  // Also intercept unhandled errors and promise rejections
  window.addEventListener('error', (event) => {
    addLog('ERROR', `${event.message} (${event.filename}:${event.lineno})`, '#fca5a5');
    globalShowOverlay?.();
  });

  window.addEventListener('unhandledrejection', (event) => {
    // Suppress AbortError from media play() — the browser's native play
    // button creates a promise we can't catch. During sync playback,
    // concurrent media loads can cause resource contention that aborts
    // the pending play(). This is expected and harmless.
    if (event.reason?.name === 'AbortError') {
      event.preventDefault();
      return;
    }
    const reason = event.reason instanceof Error ? event.reason.message : String(event.reason);
    addLog('ERROR', `Unhandled rejection: ${reason.slice(0, 500)}`, '#fca5a5');
    globalShowOverlay?.();
  });

  // ── Fetch Interceptor ──
  const origFetch = window.fetch;
  let callSeq = 0;

  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request)?.url ?? '?';
    const isGitHub = url.includes('api.github.com');
    const seq = ++callSeq;

    if (isGitHub) {
      const method = (args[1] as RequestInit)?.method ?? 'GET';
      const headers = (args[1] as RequestInit)?.headers as Record<string, string> | undefined;
      const hasEtag = !!(headers?.['if-none-match'] || headers?.['If-None-Match']);
      const shortUrl = url.replace('https://api.github.com', '');
      addLog('FETCH', `#${seq} \u2192 ${method} ${shortUrl}${hasEtag ? ' (ETag)' : ''}`, '#93c5fd');
    }

    try {
      const response = await origFetch.apply(this, args);

      if (isGitHub) {
        const status = response.status;
        const remaining = response.headers.get('x-ratelimit-remaining');
        const limit = response.headers.get('x-ratelimit-limit');
        const reset = response.headers.get('x-ratelimit-reset');
        const resetMins = reset ? Math.ceil((parseInt(reset) * 1000 - Date.now()) / 60000) : '??';
        const rlExists = remaining != null;

        if (status === 304) {
          const allHeaders: Record<string, string> = {};
          response.headers.forEach((v, k) => { allHeaders[k] = v; });
          addLog('FETCH', `#${seq} \u2190 304 headers: ${JSON.stringify(allHeaders)}`, '#fbbf24');
        }

        const statusColor = status === 304 ? '#fbbf24' : status < 300 ? '#86efac' : '#fca5a5';
        addLog(
          'FETCH',
          `#${seq} \u2190 ${status} | RL: ${rlExists ? `${remaining}/${limit}` : '\u26a0\ufe0f MISSING'} | reset: ${resetMins}m | hdr: ${rlExists ? '\u2705' : '\u274c'}`,
          statusColor
        );
      }

      return response;
    } catch (err) {
      if (isGitHub) {
        addLog('FETCH', `#${seq} \u2718 ${(err as Error)?.message ?? err}`, '#fca5a5');
      }
      throw err;
    }
  };

  // ── SessionStorage Monitor ──
  const origSetItem = sessionStorage.setItem.bind(sessionStorage);
  sessionStorage.setItem = function (key: string, value: string) {
    if (key === 'ab-rate-limit') {
      try {
        const p = JSON.parse(value);
        const resetMins = Math.ceil((p.reset * 1000 - Date.now()) / 60000);
        addLog(
          'STORAGE',
          `remaining: ${p.remaining}, limit: ${p.limit}, reset: ${resetMins}m, checked: ${new Date(p.lastChecked).toISOString().slice(11, 23)}`,
          '#c4b5fd'
        );
      } catch {
        addLog('STORAGE', `(unparseable): ${value.slice(0, 80)}`, '#c4b5fd');
      }
    }
    return origSetItem(key, value);
  };

  // ── History Monitor ──
  const origPush = history.pushState.bind(history);
  const origReplace = history.replaceState.bind(history);

  history.pushState = function (...args: Parameters<typeof history.pushState>) {
    addLog('HISTORY', `pushState \u2192 ${String(args[2] ?? '(none)')} (depth: ${history.length})`, '#fdba74');
    return origPush(...args);
  };

  history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
    addLog('HISTORY', `replaceState \u2192 ${String(args[2] ?? '(none)')} (depth: ${history.length})`, '#fdba74');
    return origReplace(...args);
  };

  window.addEventListener('popstate', () => {
    addLog('HISTORY', `popstate \u2192 ${location.href} (depth: ${history.length})`, '#fdba74');
  });

  // ── Initial State (logged silently, no auto-show) ──
  try {
    const stored = sessionStorage.getItem('ab-rate-limit');
    if (stored) {
      const p = JSON.parse(stored);
      const resetMins = Math.ceil((p.reset * 1000 - Date.now()) / 60000);
      addLog('INIT', `sessionStorage RL \u2192 remaining: ${p.remaining}, limit: ${p.limit}, reset: ${resetMins}m`, '#67e8f9');
    } else {
      addLog('INIT', 'No rate-limit in sessionStorage', '#67e8f9');
    }
  } catch {
    addLog('INIT', 'Could not read sessionStorage', '#fca5a5');
  }

  addLog('INIT', `location: ${location.href}`, '#67e8f9');
  addLog('INIT', `history depth: ${history.length}`, '#67e8f9');
}

let interceptorsInstalled = false;

export function DebugOverlay() {
  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorCount, setErrorCount] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = useCallback((tag: string, message: string, color = '#e2e8f0') => {
    const entry: LogEntry = { id: ++logId, time: ts(), tag, message, color };
    setLogs((prev) => [...prev, entry]);
    if (tag === 'ERROR') {
      setErrorCount((c) => c + 1);
    }
  }, []);

  const showOverlay = useCallback(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    globalAddLog = addLog;
    globalShowOverlay = showOverlay;
    if (!interceptorsInstalled) {
      installInterceptors();
      interceptorsInstalled = true;
    }
    return () => {
      globalAddLog = null;
      globalShowOverlay = null;
    };
  }, [addLog, showOverlay]);

  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleCopy = () => {
    const text = logs
      .map((l) => `[${l.time}] [${l.tag}] ${l.message}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(
      () => addLog('DEBUG', 'Logs copied to clipboard \u2705', '#86efac'),
      () => addLog('DEBUG', 'Copy failed \u2014 select and copy manually', '#fca5a5')
    );
  };

  const handleClear = () => {
    setLogs([]);
    setErrorCount(0);
    setIsOpen(false);
    setIsVisible(false);
  };

  // Hidden until an error surfaces
  if (!isVisible) return null;

  return (
    <>
      {/* Toggle Button — red circle with error count */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[9999] w-12 h-12 rounded-full bg-error text-error-content flex items-center justify-center shadow-lg active:scale-95 transition-transform"
        aria-label="Toggle debug panel"
      >
        {isOpen ? (
          <span className="text-xl">{"\u2715"}</span>
        ) : (
          <span className="text-lg font-bold animate-pulse">{errorCount}</span>
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div
          className="fixed inset-x-0 bottom-16 z-[9998] mx-2 max-h-[60vh] flex flex-col rounded-lg shadow-2xl border border-base-300 overflow-hidden"
          style={{ backgroundColor: 'rgba(15, 15, 25, 0.95)' }}
        >
          {/* Toolbar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-base-300 shrink-0">
            <span className="text-xs font-mono text-gray-400">
              AB-DEBUG {"\u00b7"} {logs.length} entries {"\u00b7"} {errorCount} errors
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="text-xs px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30 font-mono"
              >
                Copy
              </button>
              <button
                onClick={handleClear}
                className="text-xs px-2 py-1 rounded bg-error/20 text-error hover:bg-error/30 font-mono"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Log Entries */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 overscroll-contain">
            {logs.length === 0 && (
              <p className="text-xs text-gray-500 font-mono text-center py-4">
                No logs captured yet...
              </p>
            )}
            {logs.map((l) => (
              <div key={l.id} className="text-[11px] font-mono leading-tight" style={{ color: l.color }}>
                <span className="text-gray-500">{l.time}</span>{' '}
                <span className="font-semibold">[{l.tag}]</span>{' '}
                {l.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
