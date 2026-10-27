import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({ title, crumbs, children }: { title: string; crumbs?: Crumb[]; children?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="container">
        <h1 className="mb-3">{title}</h1>
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
        {children}
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
