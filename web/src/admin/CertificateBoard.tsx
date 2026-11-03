import { useCallback, useEffect, useRef, useState } from 'react';
import { measuringContext, prepareField, renderCertificate } from '../certificate/render';
import { fieldText } from '../certificate/tokens';
import type { CertificateConfig, CertificateField, CertificateMeta } from '../certificate/types';
import type { Participant } from '../results/types';

interface DragState {
  id: string;
  pointerId: number;
  startX: number;
  startY: number;
  originX: number;
  originY: number;
}

export interface CertificateBoardProps {
  config: CertificateConfig;
  image: HTMLImageElement | null;
  participant: Participant;
  meta: CertificateMeta;
  selectedId: string | null;
  zoom: number;
  onSelect: (id: string | null) => void;
  onMove: (id: string, x: number, y: number) => void;
  onDelete: (id: string) => void;
  onSaveShortcut: () => void;
}

/**
 * WYSIWYG canvas for the certificate layout: the template plus the real
 * rendered text (drawn by the same renderer the participant download uses),
 * with draggable handles for every field.
 */
export function CertificateBoard({
  config,
  image,
  participant,
  meta,
  selectedId,
  zoom,
  onSelect,
  onMove,
  onDelete,
  onSaveShortcut
}: CertificateBoardProps) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const canvasHost = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [drag, setDrag] = useState<DragState | null>(null);

  useEffect(() => {
    const element = wrap.current;

    if (!element || typeof ResizeObserver === 'undefined') {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;

      if (width && width > 240) {
        setContainerWidth(Math.round(width - 26));
      }
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const displayWidth = Math.max(280, Math.round(containerWidth * zoom));
  const scale = displayWidth / Math.max(1, config.width);
  const displayHeight = Math.max(1, Math.round(Math.max(1, config.height) * scale));

  // One redraw per animation frame: pointermove bursts cancel the pending frame
  // instead of rasterising the template on every event.
  useEffect(() => {
    const host = canvasHost.current;

    if (!host) {
      return;
    }

    const handle = window.requestAnimationFrame(() => {
      const canvas = renderCertificate(config, participant, meta, image, {
        maxWidth: Math.min(2800, Math.max(1000, Math.round(displayWidth * 1.4)))
      });

      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.display = 'block';
      host.replaceChildren(canvas);
    });

    return () => window.cancelAnimationFrame(handle);
  }, [config, participant, meta, image, displayWidth]);

  const measure = measuringContext();

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>, field: CertificateField) => {
      if (event.button !== 0) {
        return;
      }

      event.stopPropagation();
      onSelect(field.id);
      event.currentTarget.setPointerCapture(event.pointerId);

      setDrag({
        id: field.id,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        originX: field.x,
        originY: field.y
      });
    },
    [onSelect]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!drag || event.pointerId !== drag.pointerId) {
        return;
      }

      const dx = (event.clientX - drag.startX) / scale;
      const dy = (event.clientY - drag.startY) / scale;

      onMove(
        drag.id,
        Math.round(Math.min(Math.max(0, drag.originX + dx), config.width)),
        Math.round(Math.min(Math.max(0, drag.originY + dy), config.height))
      );
    },
    [config.height, config.width, drag, onMove, scale]
  );

  const endDrag = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    setDrag(null);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = (target?.tagName || '').toLowerCase();
      const typing =
        tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable === true;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSaveShortcut();
        return;
      }

      if (typing || !selectedId) {
        return;
      }

      const field = config.fields.find((item) => item.id === selectedId);

      if (!field) {
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const moves: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
        ArrowUp: [0, -step],
        ArrowDown: [0, step]
      };
      const move = moves[event.key];

      if (move) {
        event.preventDefault();
        onMove(
          field.id,
          Math.round(Math.min(Math.max(0, field.x + move[0]), config.width)),
          Math.round(Math.min(Math.max(0, field.y + move[1]), config.height))
        );
        return;
      }

      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        onDelete(field.id);
        return;
      }

      if (event.key === 'Escape') {
        onSelect(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [config.fields, config.height, config.width, onDelete, onMove, onSaveShortcut, onSelect, selectedId]);

  const empty = config.template === null && image === null;

  return (
    <div className="rt-cert-stage-wrap" ref={wrap}>
      {empty ? (
        <div className="rt-cert-emptyboard">
          <i className="bi bi-card-image" aria-hidden="true" />
          <strong>Belum ada template</strong>
          <span>Unggah gambar sertifikat (JPG/PNG/WebP, maksimal 8 MB) untuk mulai mengatur posisi field.</span>
        </div>
      ) : (
        <div
          className="rt-cert-board"
          style={{ width: displayWidth, height: displayHeight }}
          onPointerDown={() => onSelect(null)}
        >
          <div className="rt-cert-canvas-host" ref={canvasHost} />

          <div className="rt-cert-overlay">
            {config.fields.map((field) => {
              const text = fieldText(field, participant, meta);
              const placeholder = text === '';
              const label = placeholder ? `[${field.token ?? 'teks'}]` : text;
              const prepared = measure ? prepareField(measure, field, label) : null;
              const width = Math.max(30, (prepared?.width ?? field.style.size * 3) * scale);
              const height = Math.max(16, (prepared?.height ?? field.style.size) * scale);
              const left =
                field.align === 'left'
                  ? field.x * scale
                  : field.align === 'right'
                    ? field.x * scale - width
                    : field.x * scale - width / 2;

              return (
                <div
                  key={field.id}
                  className={`rt-cert-box${field.id === selectedId ? ' is-selected' : ''}${
                    field.type === 'text' ? ' is-static' : ''
                  }${placeholder ? ' is-placeholder' : ''}`}
                  style={{
                    left,
                    top: field.y * scale - height / 2,
                    width,
                    height,
                    transform: field.style.rotation ? `rotate(${field.style.rotation}deg)` : undefined
                  }}
                  onPointerDown={(event) => handlePointerDown(event, field)}
                  onPointerMove={handlePointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                >
                  {field.id === selectedId ? (
                    <span className="rt-cert-box-tag">
                      {field.type === 'text' ? 'Teks' : field.token} · {field.x},{field.y}
                    </span>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
