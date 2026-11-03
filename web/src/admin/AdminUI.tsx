import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { SkeletonRows } from '../components/Skeleton';

export interface ConfirmOptions {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  tone?: 'danger' | 'primary';
  onConfirm: () => Promise<void> | void;
}

export function useConfirm() {
  const [state, setState] = useState<{ opts: ConfirmOptions; busy: boolean } | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ opts, busy: false });
  }, []);

  const close = useCallback(() => {
    setState(null);
  }, []);

  const handleConfirm = async () => {
    if (!state) {
      return;
    }

    setState((previous) => (previous ? { ...previous, busy: true } : previous));

    try {
      await state.opts.onConfirm();
    } finally {
      setState(null);
    }
  };

  const dialog = state ? (
    <ConfirmDialog
      open
      title={state.opts.title}
      message={state.opts.message}
      confirmLabel={state.opts.confirmLabel}
      tone={state.opts.tone}
      busy={state.busy}
      onConfirm={() => void handleConfirm()}
      onCancel={close}
    />
  ) : null;

  return { confirm, dialog };
}

/**
 * Shared building blocks for the admin CMS. Kept separate from
 * `components/ui.tsx` so public pages never inherit admin-only styling.
 */

export function AdminPageHeader({
  title,
  subtitle,
  actions,
  backTo,
  backLabel = 'Kembali'
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <header className="rt-adm-pagehead">
      <div className="rt-adm-pagehead-copy">
        {backTo ? (
          <Link className="rt-adm-back" to={backTo}>
            <i className="bi bi-arrow-left" aria-hidden="true" /> {backLabel}
          </Link>
        ) : null}
        <h1>{title}</h1>
        {subtitle ? <p className="rt-adm-sub">{subtitle}</p> : null}
      </div>
      {actions ? <div className="rt-adm-pagehead-actions">{actions}</div> : null}
    </header>
  );
}

export function FormSection({
  title,
  description,
  children,
  className = ''
}: {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rt-adm-section ${className}`.trim()}>
      {title || description ? (
        <div className="rt-adm-section-head">
          {title ? <h2>{title}</h2> : null}
          {description ? <p>{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function AdminEmpty({
  icon = 'bi-inbox',
  title,
  description,
  action
}: {
  icon?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rt-adm-empty">
      <span className="rt-adm-empty-icon" aria-hidden="true">
        <i className={`bi ${icon}`} />
      </span>
      <h3>{title}</h3>
      {description ? <p>{description}</p> : null}
      {action ? <div className="rt-adm-empty-action">{action}</div> : null}
    </div>
  );
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <AdminEmpty
      icon="bi-exclamation-triangle"
      title="Data gagal dimuat"
      description={message}
      action={
        onRetry ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={onRetry}>
            <i className="bi bi-arrow-clockwise me-1" aria-hidden="true" /> Coba lagi
          </button>
        ) : undefined
      }
    />
  );
}

export function AdminSkeleton({ rows = 6, stats = 0 }: { rows?: number; stats?: number }) {
  return (
    <div className="rt-adm-skeleton" aria-hidden="true">
      {stats > 0 ? (
        <div className="rt-adm-skeleton-stats">
          {Array.from({ length: stats }).map((_, index) => (
            <span className="rt-skeleton rt-adm-skeleton-stat" key={index} />
          ))}
        </div>
      ) : null}
      <SkeletonRows rows={rows} columns={4} />
    </div>
  );
}

function buildPageList(page: number, totalPages: number): Array<number | 'gap'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages: Array<number | 'gap'> = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(totalPages - 1, page + 1);

  if (start > 2) {
    pages.push('gap');
  }

  for (let current = start; current <= end; current += 1) {
    pages.push(current);
  }

  if (end < totalPages - 1) {
    pages.push('gap');
  }

  pages.push(totalPages);

  return pages;
}

export function Pagination({
  page,
  totalPages,
  total,
  unit = 'data',
  onChange
}: {
  page: number;
  totalPages: number;
  total: number;
  unit?: string;
  onChange: (page: number) => void;
}) {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const pages = useMemo(() => buildPageList(page, safeTotalPages), [page, safeTotalPages]);

  return (
    <nav className="rt-adm-pagination" aria-label="Navigasi halaman">
      <span className="rt-adm-pageinfo">
        {total} {unit} · halaman {page} dari {safeTotalPages}
      </span>
      <div className="rt-adm-pager">
        <button type="button" aria-label="Halaman sebelumnya" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          <i className="bi bi-chevron-left" aria-hidden="true" />
        </button>
        {pages.map((item, index) =>
          item === 'gap' ? (
            <span className="rt-adm-pager-gap" key={`gap-${index}`} aria-hidden="true">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              className={item === page ? 'is-active' : undefined}
              aria-current={item === page ? 'page' : undefined}
              aria-label={`Halaman ${item}`}
              onClick={() => onChange(item)}
            >
              {item}
            </button>
          )
        )}
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={page >= safeTotalPages}
          onClick={() => onChange(page + 1)}
        >
          <i className="bi bi-chevron-right" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Hapus',
  cancelLabel = 'Batal',
  busy = false,
  tone = 'danger',
  onConfirm,
  onCancel
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  busy?: boolean;
  tone?: 'danger' | 'primary';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!busy) {
          onCancel();
        }
      }}
      size="sm"
      footer={
        <div className="rt-adm-dialog-actions">
          <button type="button" className="btn btn-light-custom" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}`}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      }
    >
      <div className="rt-adm-dialog-text">{message}</div>
    </Modal>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  minLength,
  required = true,
  hint,
  invalidFeedback,
  autoFocus = false
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  minLength?: number;
  required?: boolean;
  hint?: ReactNode;
  invalidFeedback?: string;
  autoFocus?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>
        {label}
      </label>
      <div className="rt-adm-password">
        <input
          id={id}
          className={`form-control${invalidFeedback ? ' is-invalid' : ''}`}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
          autoFocus={autoFocus}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button
          type="button"
          className="rt-adm-password-toggle"
          onClick={() => setVisible((previous) => !previous)}
          aria-label={visible ? 'Sembunyikan password' : 'Tampilkan password'}
          aria-pressed={visible}
        >
          <i className={`bi ${visible ? 'bi-eye-slash' : 'bi-eye'}`} aria-hidden="true" />
        </button>
      </div>
      {invalidFeedback ? (
        <div className="invalid-feedback d-block">{invalidFeedback}</div>
      ) : hint ? (
        <small className="text-slate">{hint}</small>
      ) : null}
    </div>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
}) {
  return (
    <div className="rt-adm-search">
      <i className="bi bi-search" aria-hidden="true" />
      <input
        className="form-control"
        type="search"
        value={value}
        placeholder={placeholder}
        aria-label={label || placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

export function ActionGroup({ children }: { children: ReactNode }) {
  return <div className="rt-adm-actions">{children}</div>;
}
