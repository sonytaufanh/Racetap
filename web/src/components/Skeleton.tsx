export function SkeletonBlock({ width = '100%', height = 14 }: { width?: string | number; height?: number }) {
  return <span className="rt-skeleton" style={{ width, height }} aria-hidden="true" />;
}

export function SkeletonCards({ count = 6 }: { count?: number }) {
  return (
    <div className="row g-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div className="col-md-6 col-lg-4" key={index}>
          <div className="rt-skeleton-card">
            <span className="rt-skeleton" style={{ height: 160 }} />
            <span className="rt-skeleton" style={{ width: '70%' }} />
            <span className="rt-skeleton" style={{ width: '45%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonRows({ rows = 8, columns = 6 }: { rows?: number; columns?: number }) {
  return (
    <div className="rt-skeleton-table" aria-hidden="true">
      {Array.from({ length: rows }).map((_, row) => (
        <div className="rt-skeleton-row" key={row}>
          {Array.from({ length: columns }).map((__, column) => (
            <span key={column} className="rt-skeleton" />
          ))}
        </div>
      ))}
    </div>
  );
}
