import { useEffect, useMemo, useState } from 'react';
import { EmptyBox, ErrorBox, Loading, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { buildQuery, formatNumber, labelFromKey } from '../lib/format';
import type { LiveResultsPayload } from '../types';

const PREFERRED = [
  ['bib', 'BIB'],
  ['name', 'Nama'],
  ['category', 'Kategori'],
  ['gender', 'Gender'],
  ['age_group', 'Age Group'],
  ['gun_time', 'Gun Time'],
  ['net_time', 'Net Time'],
  ['overall_rank', 'Overall Rank'],
  ['gender_rank', 'Gender Rank'],
  ['age_rank', 'Age Rank'],
  ['status', 'Status']
] as const;

type Row = Record<string, string | number>;

function rowValue(row: Row, column: string | null): string {
  if (!column) {
    return '-';
  }

  const value = row[column];
  return value === null || value === undefined || value === '' ? '-' : String(value);
}

export default function LiveResults() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [category, setCategory] = useState('');
  const [perPage, setPerPage] = useState(25);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const path = `/live-results${buildQuery({ q: debounced, category, per_page: perPage, page })}`;
  const { data, loading, error, reload } = useApi<LiveResultsPayload>(path);

  const columns = useMemo(() => {
    if (!data) {
      return [] as Array<{ key: string; label: string }>;
    }

    const available = data.columns;
    const preferred = PREFERRED.filter(([key]) => available.includes(key)).map(([key, label]) => ({ key, label }));

    if (preferred.length > 0) {
      return preferred;
    }

    return available.slice(0, 10).map((key) => ({ key, label: labelFromKey(key) }));
  }, [data]);

  const goto = (next: number) => {
    if (!data) {
      return;
    }

    setPage(Math.min(Math.max(1, next), data.pagination.total_pages));
  };

  return (
    <>
      <PageHeader title="Race Results" crumbs={[{ label: 'Home', to: '/' }, { label: 'Live Results' }]} />

      <section className="section pt-0">
        <div className="container">
          <div className="rt-admin-card">
            <div className="rt-admin-toolbar">
              <div>
                <h2 className="section-title h4 mb-1">Hasil lomba terbaru</h2>
                <p className="mb-0 text-slate">
                  {data ? `${formatNumber(data.pagination.total)} peserta` : 'Memuat data...'}
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
                <select
                  className="form-select"
                  style={{ minWidth: 110 }}
                  value={perPage}
                  onChange={(event) => {
                    setPerPage(Number(event.target.value));
                    setPage(1);
                  }}
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </div>

            {loading && <Loading label="Mengambil hasil lomba..." />}
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
                        <th>#</th>
                        {columns.map((column) => (
                          <th key={column.key}>{column.label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.results.map((row, index) => (
                        <tr key={`${rowValue(row, data.bib_column)}-${index}`}>
                          <td>{(data.pagination.page - 1) * data.pagination.per_page + index + 1}</td>
                          {columns.map((column) => (
                            <td key={column.key}>{rowValue(row, column.key)}</td>
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
                    <button className="btn btn-light-custom btn-sm" type="button" disabled={data.pagination.page <= 1} onClick={() => goto(1)}>
                      <i className="bi bi-chevron-double-left" />
                    </button>
                    <button className="btn btn-light-custom btn-sm" type="button" disabled={data.pagination.page <= 1} onClick={() => goto(data.pagination.page - 1)}>
                      <i className="bi bi-chevron-left" />
                    </button>
                    <button
                      className="btn btn-light-custom btn-sm"
                      type="button"
                      disabled={data.pagination.page >= data.pagination.total_pages}
                      onClick={() => goto(data.pagination.page + 1)}
                    >
                      <i className="bi bi-chevron-right" />
                    </button>
                    <button
                      className="btn btn-light-custom btn-sm"
                      type="button"
                      disabled={data.pagination.page >= data.pagination.total_pages}
                      onClick={() => goto(data.pagination.total_pages)}
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
    </>
  );
}
