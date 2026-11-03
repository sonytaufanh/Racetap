import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md'
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return createPortal(
    <div className="rt-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div
        className={`rt-modal rt-modal-${size}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="rt-modal-header">
          <div className="fw-semibold">{title}</div>
          <button type="button" className="btn btn-sm btn-light-custom" onClick={onClose} aria-label="Tutup">
            <i className="bi bi-x-lg" />
          </button>
        </header>
        <div className="rt-modal-content">{children}</div>
        {footer ? <footer className="rt-modal-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
