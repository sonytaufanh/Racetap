import { useState, type ImgHTMLAttributes, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { isOfflineMessage } from '../lib/http';

interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  crumbs,
  actions,
  children
}: {
  title: string;
  subtitle?: ReactNode;
  eyebrow?: string;
  crumbs?: Crumb[];
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div className="container">
        <div className="page-header-row">
          <div className="page-header-copy">
            {crumbs && crumbs.length > 0 && (
              <div className="breadcrumb-custom">
                {crumbs.map((crumb, index) => (
                  <span key={`${crumb.label}-${index}`}>
                    {index > 0 && <span> / </span>}
                    {crumb.to ? (
                      crumb.to.startsWith('/') ? (
                        <Link to={crumb.to}>{crumb.label}</Link>
                      ) : (
                        <a href={crumb.to}>{crumb.label}</a>
                      )
                    ) : (
                      <span className="active">{crumb.label}</span>
                    )}
                  </span>
                ))}
              </div>
            )}
            {eyebrow ? <span className="page-header-eyebrow">{eyebrow}</span> : null}
            <h1>{title}</h1>
            {subtitle ? <p className="page-header-subtitle">{subtitle}</p> : null}
          </div>
          {actions ? <div className="page-header-actions">{actions}</div> : null}
        </div>
        {children ? <div className="page-header-extra">{children}</div> : null}
      </div>
    </header>
  );
}

export function SectionHeading({
  title,
  subtitle,
  action,
  center = false
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  center?: boolean;
}) {
  return (
    <div className={`row section-header align-items-end${center ? ' justify-content-center text-center' : ''}`}>
      <div className={center ? 'col-lg-7' : 'col-lg-7'}>
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className={`section-subtitle${center ? ' mx-auto' : ''}`}>{subtitle}</p>}
      </div>
      {action && <div className="col-lg-5 text-lg-end mt-3 mt-lg-0">{action}</div>}
    </div>
  );
}

export function Loading({ label = 'Memuat data...' }: { label?: string }) {
  return (
    <div className="rt-state">
      <span className="spinner-border text-primary" role="status" aria-hidden="true" />
      <p className="mb-0 mt-3 text-slate">{label}</p>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (isOfflineMessage(message)) {
    return (
      <div className="photo-empty">
        <i className="bi bi-cloud-slash" />
        <h4>Data belum tersedia</h4>
        <p className="mb-0">Konten ini dimuat dari server API yang belum aktif di deployment saat ini.</p>
      </div>
    );
  }

  return (
    <div className="photo-empty">
      <i className="bi bi-exclamation-triangle" />
      <h4>Data gagal dimuat</h4>
      <p className="mb-3">{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary btn-sm-custom" onClick={onRetry}>
          <i className="bi bi-arrow-clockwise me-1" /> Coba lagi
        </button>
      )}
    </div>
  );
}

export function EmptyBox({ icon = 'bi-images', title, description }: { icon?: string; title: string; description: string }) {
  return (
    <div className="photo-empty">
      <i className={`bi ${icon}`} />
      <h4>{title}</h4>
      <p className="mb-0">{description}</p>
    </div>
  );
}

export function Badge({
  children,
  tone = 'neutral'
}: {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'primary';
}) {
  return <span className={`rt-chip rt-chip-${tone}`}>{children}</span>;
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = 'primary',
  progress
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: string;
  tone?: 'primary' | 'success' | 'warning' | 'info';
  progress?: number;
}) {
  return (
    <div className={`rt-stat-card rt-stat-card-${tone}`}>
      {icon ? (
        <span className="rt-stat-icon">
          <i className={`bi ${icon}`} />
        </span>
      ) : null}
      <div className="rt-stat-body">
        <div className="rt-stat-value">{value}</div>
        <div className="rt-stat-label">{label}</div>
        {hint ? <div className="rt-stat-hint">{hint}</div> : null}
        {typeof progress === 'number' ? (
          <div
            className="rt-stat-meter"
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <span style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * <img> with a graceful placeholder: if the file is missing (or blocked), the
 * card keeps its layout instead of showing a broken image icon.
 */
export function SafeImage({ src, alt, className, ...rest }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span className={`img-fallback ${className || ''}`.trim()} role="img" aria-label={alt || 'image'}>
        <i className="bi bi-image" />
      </span>
    );
  }

  return <img src={src} alt={alt} className={className} loading={rest.loading} onError={() => setFailed(true)} {...rest} />;
}