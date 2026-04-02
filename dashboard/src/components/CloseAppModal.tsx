import { useEffect, useState } from 'react';
import { Monitor, Power, PowerOff } from 'lucide-react';

interface CloseAppModalProps {
  onChoice: (choice: 'minimize' | 'quit' | 'quit-all' | 'cancel', remember: boolean) => void;
}

export function CloseAppModal({ onChoice }: CloseAppModalProps) {
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onChoice('cancel', false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onChoice]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={() => onChoice('cancel', false)}
    >
      <div
        className="flex flex-col rounded-lg shadow-2xl overflow-hidden [&_button]:outline-none [&_button:focus]:outline-none"
        style={{
          width: '100%',
          maxWidth: '380px',
          background: 'var(--bg-primary)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with logo */}
        <div className="flex flex-col items-center gap-2 px-6 pt-6 pb-2">
          <img
            src="/octoally-icon.png"
            alt=""
            className="w-12 h-12 object-contain"
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            What would you like to do?
          </h3>
          <p
            className="text-xs text-center"
            style={{ color: 'var(--text-secondary)' }}
          >
            Minimize to tray keeps the server running in the background.
          </p>
        </div>

        {/* Options */}
        <div className="flex flex-col gap-2 px-6 py-4">
          <button
            onClick={() => onChoice('minimize', remember)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
              style={{ background: 'rgba(59, 130, 246, 0.15)' }}
            >
              <Monitor className="w-4 h-4" style={{ color: '#3b82f6' }} />
            </div>
            <div className="text-left">
              <div className="font-semibold">Minimize to Tray</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                Keep server running in background
              </div>
            </div>
          </button>

          <button
            onClick={() => onChoice('quit', remember)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
              style={{ background: 'rgba(245, 158, 11, 0.15)' }}
            >
              <Power className="w-4 h-4" style={{ color: '#f59e0b' }} />
            </div>
            <div className="text-left">
              <div className="font-semibold">Quit App</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                Close window, keep server running
              </div>
            </div>
          </button>

          <button
            onClick={() => onChoice('quit-all', remember)}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-xs font-medium transition-all hover:brightness-110"
            style={{
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            <div
              className="flex items-center justify-center w-8 h-8 rounded-full shrink-0"
              style={{ background: 'rgba(239, 68, 68, 0.15)' }}
            >
              <PowerOff className="w-4 h-4" style={{ color: '#ef4444' }} />
            </div>
            <div className="text-left">
              <div className="font-semibold">Quit All</div>
              <div style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>
                Stop server and close app
              </div>
            </div>
          </button>
        </div>

        {/* Remember + Cancel */}
        <div
          className="flex items-center justify-between px-6 py-3"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          <label
            className="flex items-center gap-2 text-xs cursor-pointer select-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="accent-blue-500"
            />
            Remember my choice
          </label>
          <button
            onClick={() => onChoice('cancel', false)}
            className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
            style={{
              background: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border)',
              outline: 'none',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
