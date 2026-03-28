import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, X, ExternalLink } from 'lucide-react';
import { isElectron } from '../lib/tauri';

interface WebPageViewProps {
  url: string;
  visible?: boolean;
  onUrlChange?: (url: string) => void;
}

export function WebPageView({ url, visible = true, onUrlChange }: WebPageViewProps) {
  const [inputUrl, setInputUrl] = useState(url);
  const [currentUrl, setCurrentUrl] = useState(url);
  const [loading, setLoading] = useState(true);
  const [crashed, setCrashed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const webviewRef = useRef<HTMLElement>(null);
  const inputFocusedRef = useRef(false);
  // Initial URL — set once on the webview src attribute, never mutated by React.
  // All subsequent navigation happens inside the webview via its own links or loadURL().
  // Mutating src triggers GUEST_VIEW_MANAGER which crashes on rapid navigation.
  const [initialUrl] = useState(url);

  // For iframe fallback: manual history tracking
  const [history, setHistory] = useState<string[]>([url]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Webview can query its own canGoBack/canGoForward
  const [wvCanGoBack, setWvCanGoBack] = useState(false);
  const [wvCanGoForward, setWvCanGoForward] = useState(false);

  const canGoBack = isElectron ? wvCanGoBack : historyIndex > 0;
  const canGoForward = isElectron ? wvCanGoForward : historyIndex < history.length - 1;

  function normalizeUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    if (/^[a-z0-9-]+\.[a-z]{2,}/i.test(trimmed)) return `https://${trimmed}`;
    return trimmed;
  }

  // Update the URL bar only when the user isn't actively editing it
  const updateDisplayUrl = useCallback((newUrl: string) => {
    if (!inputFocusedRef.current) {
      setInputUrl(newUrl);
    }
    setCurrentUrl(newUrl);
  }, []);

  // Set up webview event listeners
  useEffect(() => {
    if (!isElectron || !webviewRef.current) return;
    const wv = webviewRef.current as any;

    function updateNavState() {
      try {
        setWvCanGoBack(wv.canGoBack?.() ?? false);
        setWvCanGoForward(wv.canGoForward?.() ?? false);
      } catch {}
    }

    function onNavStart() {
      setLoading(true);
      updateNavState();
    }
    function onNavDone() {
      setLoading(false);
      try {
        const wvUrl = wv.getURL?.();
        if (wvUrl) {
          updateDisplayUrl(wvUrl);
          onUrlChange?.(wvUrl);
        }
      } catch {}
      updateNavState();
    }
    function onNavFailed(event: any) {
      // errorCode -3 = ABORTED — happens during rapid navigation, not a real failure.
      // The last navigation will still complete; just ignore the abort.
      const code = event?.errorCode ?? event?.detail?.errorCode;
      if (code === -3) return;
      setLoading(false);
      updateNavState();
    }

    // Crash/unresponsive recovery — webview renderer can die under memory pressure
    function onCrash() {
      console.warn('[WebPageView] Webview renderer crashed, will reload');
      setCrashed(true);
      setLoading(false);
    }
    function onUnresponsive() {
      console.warn('[WebPageView] Webview became unresponsive');
      setCrashed(true);
      setLoading(false);
    }
    function onResponsive() {
      setCrashed(false);
    }

    // Watchdog: if loading takes longer than 10s (likely stuck), auto-reload
    let loadTimer: ReturnType<typeof setTimeout> | null = null;
    function onNavStartWithWatchdog() {
      onNavStart();
      if (loadTimer) clearTimeout(loadTimer);
      loadTimer = setTimeout(() => {
        try {
          if (wv.isLoading?.()) {
            console.warn('[WebPageView] Loading stuck, reloading...');
            wv.reload?.();
          }
        } catch {}
      }, 10000);
    }
    function onNavDoneWithWatchdog() {
      if (loadTimer) { clearTimeout(loadTimer); loadTimer = null; }
      onNavDone();
    }

    wv.addEventListener('did-start-loading', onNavStartWithWatchdog);
    wv.addEventListener('did-stop-loading', onNavDoneWithWatchdog);
    wv.addEventListener('did-fail-load', onNavFailed);
    wv.addEventListener('did-navigate', updateNavState);
    wv.addEventListener('did-navigate-in-page', updateNavState);
    wv.addEventListener('render-process-gone', onCrash);
    wv.addEventListener('crashed', onCrash);
    wv.addEventListener('unresponsive', onUnresponsive);
    wv.addEventListener('responsive', onResponsive);

    return () => {
      if (loadTimer) clearTimeout(loadTimer);
      wv.removeEventListener('did-start-loading', onNavStartWithWatchdog);
      wv.removeEventListener('did-stop-loading', onNavDoneWithWatchdog);
      wv.removeEventListener('did-fail-load', onNavFailed);
      wv.removeEventListener('did-navigate', updateNavState);
      wv.removeEventListener('did-navigate-in-page', updateNavState);
      wv.removeEventListener('render-process-gone', onCrash);
      wv.removeEventListener('crashed', onCrash);
      wv.removeEventListener('unresponsive', onUnresponsive);
      wv.removeEventListener('responsive', onResponsive);
    };
  }, [onUrlChange, updateDisplayUrl]);

  const navigate = useCallback((newUrl: string) => {
    const normalized = normalizeUrl(newUrl);
    if (!normalized) return;
    setCurrentUrl(normalized);
    setInputUrl(normalized);
    setLoading(true);

    if (isElectron && webviewRef.current) {
      // Use loadURL() — never mutate the src attribute (causes GUEST_VIEW_MANAGER crash)
      (webviewRef.current as any).loadURL?.(normalized);
    } else {
      setHistory((prev) => {
        const trimmed = prev.slice(0, historyIndex + 1);
        return [...trimmed, normalized];
      });
      setHistoryIndex((prev) => prev + 1);
    }
    onUrlChange?.(normalized);
  }, [historyIndex, onUrlChange]);

  function goBack() {
    if (isElectron && webviewRef.current) {
      try { (webviewRef.current as any).goBack?.(); } catch {}
    } else {
      if (historyIndex <= 0) return;
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const prevUrl = history[newIndex];
      setCurrentUrl(prevUrl);
      setInputUrl(prevUrl);
      setLoading(true);
    }
  }

  function goForward() {
    if (isElectron && webviewRef.current) {
      try { (webviewRef.current as any).goForward?.(); } catch {}
    } else {
      if (historyIndex >= history.length - 1) return;
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const nextUrl = history[newIndex];
      setCurrentUrl(nextUrl);
      setInputUrl(nextUrl);
      setLoading(true);
    }
  }

  function stop() {
    if (isElectron && webviewRef.current) {
      try { (webviewRef.current as any).stop?.(); } catch {}
    }
    setLoading(false);
  }

  function refresh() {
    setLoading(true);
    if (isElectron && webviewRef.current) {
      (webviewRef.current as any).reload?.();
    } else if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  }

  function openExternal() {
    window.open(currentUrl, '_blank');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(inputUrl);
    (e.target as HTMLFormElement).querySelector('input')?.blur();
  }

  // Recover from crash: reload the webview
  function recoverFromCrash() {
    setCrashed(false);
    setLoading(true);
    if (isElectron && webviewRef.current) {
      (webviewRef.current as any).reload?.();
    } else if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
    }
  }

  // Keep mounted but hidden — unmounting destroys the webview renderer process
  return (
    <div className="h-full flex flex-col" style={{ display: visible ? 'flex' : 'none' }}>
      {/* Browser toolbar */}
      <div
        className="flex items-center gap-1.5 px-2 py-1.5 shrink-0"
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-secondary)',
        }}
      >
        <button
          onClick={goBack}
          disabled={!canGoBack && !loading}
          className="flex items-center justify-center rounded transition-colors disabled:opacity-30"
          style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}
          title="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          onClick={goForward}
          disabled={!canGoForward}
          className="flex items-center justify-center rounded transition-colors disabled:opacity-30"
          style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}
          title="Go forward"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        {loading ? (
          <button
            onClick={stop}
            className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}
            title="Stop loading"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={refresh}
            className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-tertiary)]"
            style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        )}

        <form onSubmit={handleSubmit} className="flex-1 min-w-0">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            onFocus={(e) => {
              inputFocusedRef.current = true;
              e.target.select();
            }}
            onBlur={() => {
              inputFocusedRef.current = false;
              setInputUrl(currentUrl);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setInputUrl(currentUrl);
                e.currentTarget.blur();
              }
            }}
            placeholder="Enter URL..."
            spellCheck={false}
            autoComplete="off"
            className="w-full px-3 py-1 rounded-md text-xs outline-none"
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
            }}
          />
        </form>

        <button
          onClick={openExternal}
          className="flex items-center justify-center rounded transition-colors hover:bg-[var(--bg-tertiary)]"
          style={{ width: 28, height: 28, color: 'var(--text-secondary)' }}
          title="Open in browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Content area */}
      <div className="flex-1 min-h-0 relative">
        {crashed && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3"
            style={{ background: 'var(--bg-primary)' }}>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              This page became unresponsive or crashed.
            </p>
            <button
              onClick={recoverFromCrash}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium"
              style={{ background: 'var(--accent)', color: 'white' }}
            >
              <RotateCw className="w-3.5 h-3.5" />
              Reload Page
            </button>
          </div>
        )}
        {isElectron ? (
          // Electron webview: src is set ONCE on mount via initialUrl.
          // Never let React mutate src — it triggers GUEST_VIEW_MANAGER IPC
          // which causes ERR_ABORTED (-3) and blank pages on rapid navigation.
          // All navigation after mount happens via the SPA's own links inside
          // the webview, or via webview.loadURL() from the URL bar.
          <webview
            ref={webviewRef as any}
            src={initialUrl}
            // @ts-ignore — Electron webview attributes not in React types
            partition="persist:webpages"
            style={{ width: '100%', height: '100%', background: '#0f1117' }}
          />
        ) : (
          <iframe
            ref={iframeRef}
            src={currentUrl}
            className="w-full h-full border-0"
            style={{ background: 'white' }}
            onLoad={() => setLoading(false)}
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
            allow="clipboard-read; clipboard-write"
          />
        )}
      </div>
    </div>
  );
}
