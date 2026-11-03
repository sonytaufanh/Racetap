import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { PUBLISHED_EVENT_SLUGS } from '../lib/events';
import { formatNumber, timeAgo } from '../lib/format';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSkeleton,
  Pagination,
  SearchField
} from './AdminUI';
import type { RaceResultsPreview } from '../types';

export default function AdminRaceDetail() {
  const { id = '' } = useParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const query = `/admin/races/${id}/results?page=${page}&q=${encodeURIComponent(debouncedSearch)}`;
  const { data, loading, error, reload } = useApi<RaceResultsPreview>(id ? query : null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [search]);

  const sync = async () => {
    setBusy(true);

    try {
      await api(`/admin/races/${id}/sync`, { method: 'POST' });
      toast.success('Sinkronisasi selesai.');
      reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Memuat race..." backTo="/admin/races" />
        <AdminSkeleton rows={8} />
      </>
    );
  }

  if (error || !data) {
    return <AdminError message={error || 'Race tidak ditemukan.'} onRetry={reload} />;
  }

  const { race } = data;
  const published = PUBLISHED_EVENT_SLUGS.has(race.slug);

  return (
    <>
      <AdminPageHeader
        title={race.name}
        backTo="/admin/races"
        subtitle={
          <>
            {race.slug} · {formatNumber(data.pagination.total)} baris hasil · sinkron {timeAgo(race.last_sync_at)}
          </>
        }
        actions={
          <>
            {published ? (
              <a className="btn btn-light-custom" href={`/results/${race.slug}/`} target="_blank" rel="noreferrer">
                <i className="bi bi-box-arrow-up-right me-1" aria-hidden="true" /> Halaman hasil
              </a>
            ) : (
              <span className="rt-chip rt-chip-neutral">Hasil belum dipublikasikan</span>
            )}
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void sync()}
              disabled={busy || !race.api_url}
              title={race.api_url ? 'Sinkronkan hasil dari API' : 'Race ini belum punya URL API'}
            >
              <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />
              {busy ? 'Menyinkronkan...' : 'Sinkronisasi'}
            </button>
          </>
        }
      />

      <div className="rt-admin-card mb-4">
        <div className="row g-3">
          <div className="col-md-6">
            <div className="small text-slate">API sumber</div>
            <div className="small" style={{ wordBreak: 'break-all' }}>
              {race.api_url || '-'}
            </div>
          </div>
          <div className="col-md-3">
            <div className="small text-slate">Status sync</div>
            <div>
              <span
                className={`rt-badge ${race.last_sync_status === 'ok' ? 'ok' : race.last_sync_status ? 'warn' : 'off'}`}
              >
                {race.last_sync_status || 'belum pernah'}
              </span>
            </div>
          </div>
          <div className="col-md-3">
            <div className="small text-slate">Waktu sync</div>
            <div className="small">{race.last_sync_at || '-'}</div>
            {race.last_sync_message ? <small className="text-slate">{race.last_sync_message}</small> : null}
          </div>
        </div>
      </div>

      <div className="rt-admin-card">
        <div className="rt-adm-filters">
          <h2 className="h6 mb-0 me-auto">Preview hasil</h2>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Cari nama atau BIB"
            label="Cari hasil race"
          />
        </div>

        {data.results.length === 0 ? (
          <AdminEmpty
            icon="bi-cloud-download"
            title="Belum ada hasil"
            description="Hasil belum tersimpan untuk race ini. Jalankan sinkronisasi dari tombol di atas."
          />
        ) : (
          <div className="table-responsive">
            <table className="rt-table">
              <thead>
                <tr>
                  <th scope="col">#</th>
                  <th scope="col">BIB</th>
                  <th scope="col">Nama</th>
                  <th scope="col">Kategori</th>
                  <th scope="col">Gender</th>
                  <th scope="col">Net</th>
                  <th scope="col">Gun</th>
                  <th scope="col">Status</th>
                </tr>
              </thead>
              <tbody>
                {data.results.map((row) => (
                  <tr key={`${row.bib}-${row.name}-${row.overall_rank}`}>
                    <td>{row.overall_rank ?? '-'}</td>
                    <td>{row.bib || '-'}</td>
                    <td>{row.name || '-'}</td>
                    <td>{row.category || '-'}</td>
                    <td>{row.gender || '-'}</td>
                    <td className="num">{row.net_time || '-'}</td>
                    <td className="num">{row.gun_time || '-'}</td>
                    <td>{row.status || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.total_pages}
          total={data.pagination.total}
          unit="baris"
          onChange={setPage}
        />
      </div>
    </>
  );
}
