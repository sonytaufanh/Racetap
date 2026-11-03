import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { cleanKey, normalizeConfig } from './config';
import { loadConfig, loadDatabase } from './sources';
import type {
  DisplayState,
  FieldStyle,
  KioskConfig,
  KioskDatabase,
  KioskPayload,
  KioskRecord
} from './types';

interface Props {
  payload: KioskPayload;
}

function textAlignOf(align: FieldStyle['align']): CSSProperties['textAlign'] {
  return align === 'left' || align === 'right' ? align : 'center';
}

function styleFor(style: FieldStyle | null | undefined, centered: 'x' | 'xy'): CSSProperties {
  if (!style) {
    return { display: 'none' };
  }

  return {
    display: style.enabled === false ? 'none' : 'block',
    top: style.top || '0px',
    left: style.left || '50%',
    width: style.width || '1000px',
    fontSize: style.fontSize || '80px',
    color: style.color || '#ffffff',
    textAlign: textAlignOf(style.align),
    textShadow: style.textShadow || undefined,
    fontFamily: style.fontFamily || undefined,
    fontStyle: style.fontStyle || undefined,
    transform: centered === 'xy' ? 'translateX(-50%) translateY(-50%)' : 'translateX(-50%)',
    whiteSpace: style.wrap ? 'normal' : 'nowrap',
    overflowWrap: style.wrap ? 'break-word' : undefined
  };
}

function backgroundFor(record: KioskRecord | null, config: KioskConfig, assetBase: string): string {
  const fallback = `${assetBase}${config.background}`;
  const category = config.categoryBackground;

  if (!category || category.enabled === false || !record) {
    return fallback;
  }

  const source = category.source || 'Item';
  let value = '';

  for (const key of Object.keys(config.fields || {})) {
    if (config.fields[key].source === source) {
      value = String(record[key] ?? '').trim();
    }
  }

  const mapped = category.map ? category.map[value] : undefined;

  return mapped ? `${assetBase}${mapped}` : fallback;
}

export default function KioskApp({ payload }: Props) {
  const [config, setConfig] = useState<KioskConfig | null>(null);
  const [database, setDatabase] = useState<KioskDatabase>({});
  const [display, setDisplay] = useState<DisplayState>({
    kind: 'standby',
    record: null,
    message: ''
  });

  const databaseRef = useRef<KioskDatabase>({});
  const configRef = useRef<KioskConfig | null>(null);
  const bufferRef = useRef('');
  const timerRef = useRef<number | null>(null);
  const fullscreenDone = useRef(false);

  const resetTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetDisplay = useCallback(() => {
    resetTimer();
    setDisplay({ kind: 'standby', record: null, message: '' });
  }, [resetTimer]);

  const showFound = useCallback(
    (record: KioskRecord) => {
      resetTimer();
      setDisplay({ kind: 'found', record, message: '' });

      const current = configRef.current;

      timerRef.current = window.setTimeout(resetDisplay, current?.resetTime ?? 40000);
    },
    [resetDisplay, resetTimer]
  );

  const showNotFound = useCallback(
    (message?: string) => {
      resetTimer();
      setDisplay({
        kind: 'not-found',
        record: null,
        message: message || configRef.current?.notFoundText || 'DATA TIDAK DITEMUKAN'
      });

      const current = configRef.current;

      timerRef.current = window.setTimeout(resetDisplay, current?.notFoundTime ?? 2500);
    },
    [resetDisplay, resetTimer]
  );

  const refresh = useCallback(async () => {
    const current = configRef.current;

    if (!current) {
      return;
    }

    try {
      const next = await loadDatabase(current, payload.assetBase);
      databaseRef.current = next;
      setDatabase(next);
    } catch (cause) {
      console.error('DATA LOAD ERROR:', cause);
    }
  }, [payload.assetBase]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const userConfig = await loadConfig(payload.configUrl);

      if (cancelled) {
        return;
      }

      const merged = normalizeConfig(userConfig);
      const resolved: KioskConfig = payload.dataSource
        ? { ...merged, dataSource: payload.dataSource }
        : merged;

      configRef.current = resolved;
      setConfig(resolved);
      document.title = resolved.eventName;

      await refresh();
    })();

    return () => {
      cancelled = true;
    };
  }, [payload.configUrl, payload.dataSource, refresh]);

  useEffect(() => {
    if (!config) {
      return;
    }

    const interval = window.setInterval(() => {
      void refresh();
    }, config.refreshInterval || 5000);

    return () => window.clearInterval(interval);
  }, [config, refresh]);

  useEffect(() => {
    if (!config) {
      return;
    }

    const wakeLock = async () => {
      if (!config.enableWakeLock) {
        return;
      }

      try {
        if ('wakeLock' in navigator) {
          await navigator.wakeLock.request('screen');
        }
      } catch {
        // Wake lock is best-effort; ignore unsupported browsers.
      }
    };

    const requestFullscreen = () => {
      if (!config.enableFullscreen || fullscreenDone.current) {
        return;
      }

      try {
        void document.documentElement.requestFullscreen?.();
        fullscreenDone.current = true;
      } catch {
        // Fullscreen needs a user gesture; the first scan key press retries.
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        requestFullscreen();
        void wakeLock();

        const key = cleanKey(bufferRef.current, config.uppercaseOnly);
        bufferRef.current = '';

        if (!key) {
          return;
        }

        const record = databaseRef.current[key];

        if (record) {
          showFound(record);
        } else {
          showNotFound();
        }

        return;
      }

      if (event.key.length === 1) {
        bufferRef.current += event.key;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void wakeLock();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('visibilitychange', onVisibility);
    void wakeLock();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('visibilitychange', onVisibility);
      resetTimer();
    };
  }, [config, showFound, showNotFound, resetTimer]);

  const fieldKeys = useMemo(() => Object.keys(config?.fields ?? {}), [config]);

  const background = useMemo(
    () => backgroundFor(display.record, config ?? normalizeConfig({}), payload.assetBase),
    [display.record, config, payload.assetBase]
  );

  const standbyVisible = display.kind === 'standby' && (config?.standbyText.enabled ?? true);
  const overlayVisible = display.kind !== 'standby';
  const databaseSize = Object.keys(database).length;

  return (
    <div className="rt-kiosk" style={{ backgroundImage: `url("${background}")` }} data-db-keys={databaseSize}>
      <div
        className={standbyVisible ? 'text-layer blink' : 'text-layer'}
        style={{
          ...styleFor(config?.standbyText, 'xy'),
          display: standbyVisible ? 'block' : 'none',
          animationDuration: `${config?.standbyText.blinkSpeed || 1}s`,
          whiteSpace: 'nowrap'
        }}
      >
        {config?.standbyText.text || 'BIB CHECKING'}
      </div>

      <div className="overlay" style={{ display: overlayVisible ? 'block' : 'none' }}>
        <div className="text-layer" style={styleFor(config?.status, 'x')}>
          {display.kind === 'not-found' ? display.message : ''}
        </div>

        {fieldKeys.map((key) => (
          <div
            key={key}
            className={config?.fields[key]?.wrap ? 'text-layer allow-wrap' : 'text-layer'}
            style={styleFor(config?.fields[key], 'x')}
          >
            {display.kind === 'found' && display.record ? display.record[key] || '' : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
