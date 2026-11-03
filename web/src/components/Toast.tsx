import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

interface ToastApi {
  push: (tone: ToastTone, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const noop = () => undefined;

const ToastContext = createContext<ToastApi>({
  push: noop,
  success: noop,
  error: noop,
  info: noop
});

const GLYPHS: Record<ToastTone, string> = {
  success: '✓',
  error: '!',
  info: 'i'
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef<Record<number, number>>({});

  const dismiss = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id));
    const timer = timers.current[id];

    if (timer) {
      window.clearTimeout(timer);
      delete timers.current[id];
    }
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;

      setItems((current) => [...current.slice(-3), { id, tone, message }]);
      timers.current[id] = window.setTimeout(() => dismiss(id), tone === 'error' ? 6000 : 4000);
    },
    [dismiss]
  );

  useEffect(() => {
    const current = timers.current;

    return () => {
      Object.values(current).forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  const api: ToastApi = {
    push,
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message)
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="rt-toasts" role="status" aria-live="polite">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rt-toast rt-toast-${item.tone}`}
            onClick={() => dismiss(item.id)}
          >
            <span className="rt-toast-glyph" aria-hidden="true">{GLYPHS[item.tone]}</span>
            <span>{item.message}</span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Returns the toast API. Outside a ToastProvider it degrades to a no-op so
 * components stay renderable in tests and in isolated embeddings.
 */
export function useToast(): ToastApi {
  return useContext(ToastContext);
}
