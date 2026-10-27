import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { EmptyBox, ErrorBox, Loading, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { buildQuery, formatNumber } from '../lib/format';
import type { RaceDetailPayload, RaceResultRow } from '../types';

const COLUMNS: Array<{ key: keyof RaceResultRow; label: string }> = [
  { key: 'category', label: 'Kategori' },
  { key: 'bib', label: 'BIB' },
  { key: 'name', label: 'Nama' },
  { key: 'gender', label: 'Gender' },
  { key: 'age_group', label: 'Age Group' },
  { key: 'gun_time', label: 'Gun Time' },
  { key: 'net_time', label: 'Net Time' },
  { key: 'overall_rank', label: 'Overall' },
  { key: 'gender_rank', label: 'Gender' },
  { key: 'age_rank', label: 'Age Rank' },
  { key: 'status', label: 'Status' }
];

function value(row: RaceResultRow, key: keyof RaceResultRow): string {
  const cell = row[key];
  return cell === null || cell === undefined || cell === '' ? '-' : String(cell);
}

export default function RaceResults() {
  const { slug = '' } = useParams();
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<RaceResultRow | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!detail) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDetail(null);
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [detail]);

  const path = slug ? `/races/${encodeURIComponent(slug)}${buildQuery({ q: debounced, category, page })}` : null;
  const { data, loading, error, reload } = useApi<RaceDetailPayload>(path);

  return (
    <>
      <PageHeader
        title={data?.race.name || 'Hasil Race'}
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Results', to: '/results' }, { label: data?.race.name || 'Race' }]}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="rt-admin-card">
            <div className="rt-admin-toolbar">
              <div>
                <h2 className="section-title h4 mb-1">{data?.race.name || 'Memuat race...'}</h2>
                <p className="mb-0 text-slate">
                  {data?.race.last_sync_at ? `Sinkron terakhir: ${data.race.last_sync_at}` : 'Data hasil resmi Racetap'}
                  {data ? ` · ${formatNumber(data.pagination.total)} peserta` : ''}
                </p>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <input
                  type="search"
                  className="form-control"
                  style={{ minWidth: 220 }}
                  placeholder="Cari nama atau BIB"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
                <select
                  className="form-select"
                  style={{ minWidth: 170 }}
                  value={category}
                  onChange={(event) => {
                    setCategory(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Semua kategori</option>
                  {(data?.categories || []).map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading && <Loading label="Memuat hasil race..." />}
            {!loading && error && <ErrorBox message={error} onRetry={reload} />}

            {!loading && !error && data && data.results.length === 0 && (
              <EmptyBox icon="bi-table" title="Belum ada hasil" description="Tidak ada peserta yang cocok dengan filter saat ini." />
            )}

            {!loading && !error && data && data.results.length > 0 && (
              <>
                <div className="table-responsive">
                  <table className="rt-table">
                    <thead>
                      <tr>
                        {COLUMNS.map((column) => (
                          <th key={String(column.key)}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((row, index) => (
                        <tr key={`${row.bib || 'row'}-${index}`}>
                          {COLUMNS.map((column) => (
                            <td key={String(column.key)}>
                              {column.key === 'name' ? (
                                <button type="button" className="btn btn-link p-0" onClick={() => setDetail(row)}>
                                  {value(row, column.key)}
                                </button>
                              ) : (
                                value(row, column.key)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                  <small className="text-slate">
                    Halaman {data.pagination.page} dari {data.pagination.total_pages}
                  </small>
                  <div className="d-flex gap-1">
                    <button className="btn btn-light-custom btn-sm" type="button" disabled={data.pagination.page <= 1} onClick={() => setPage(1)}>
                      <i className="bi bi-chevron-double-left" />
                    </button>
                    <button
                      className="btn btn-light-custom btn-sm"
                      type="button"
                      disabled={data.pagination.page <= 1}
                      onClick={() => setPage(data.pagination.page - 1)}
                    >
                      <i className="bi bi-chevron-left" />
                    </button>
                    <button
                      className="btn btn-light-custom btn-sm"
                      type="button"
                      disabled={data.pagination.page >= data.pagination.total_pages}
                      onClick={() => setPage(data.pagination.page + 1)}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                    <button
                      className="btn btn-light-custom btn-sm"
                      type="button"
                      disabled={data.pagination.page >= data.pagination.total_pages}
                      onClick={() => setPage(data.pagination.total_pages)}
                    >
                      <i className="bi bi-chevron-double-right" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {detail && (
        <div
          className="rt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Detail peserta"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDetail(null);
            }
          }}
        >
          <div className="rt-modal" style={{ maxWidth: 640 }}>
            <div className="rt-modal-header">
              <h5 className="mb-0">{detail.name}</h5>
              <button type="button" className="btn-close" aria-label="Tutup" onClick={() => setDetail(null)} />
            </div>
            <div className="rt-modal-body" style={{ background: '#fff', padding: '1.25rem', display: 'block' }}>
              <table className="rt-table">
                <tbody>
                  {COLUMNS.map((column) => (
                    <tr key={String(column.key)}>
                      <th style={{ width: '45%' }}>{column.label}</th>
                      <td>{value(detail, column.key)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
