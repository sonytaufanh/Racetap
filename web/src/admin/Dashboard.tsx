import { useState } from 'react';
import { Link } from 'react-router-dom';
import { StatCard } from '../components/ui';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { formatNumber, timeAgo } from '../lib/format';
import { AdminError, AdminPageHeader, AdminSkeleton } from './AdminUI';
import type { AdminStatsPayload, MediaCheckPayload } from '../types';

const ACTION_ICONS: Array<{ match: RegExp; icon: string }> = [
  { match: /delete|remove|destroy/i, icon: 'bi-trash3' },
  { match: /create|store|add|upload/i, icon: 'bi-plus-circle' },
  { match: /update|edit|patch|sync/i, icon: 'bi-pencil-square' },
  { match: /login|auth/i, icon: 'bi-shield-lock' }
];

function actionIcon(action: string): string {
  return ACTION_ICONS.find((entry) => entry.match.test(action))?.icon || 'bi-activity';
}

export default function AdminDashboard() {
  const { data, loading, error, reload } = useApi<AdminStatsPayload>('/admin/stats');
  const toast = useToast();
  const [media, setMedia] = useState<MediaCheckPayload | null>(null);
  const [checking, setChecking] = useState(false);

  const checkMedia = async () => {
    setChecking(true);

    try {
      const result = await api<MediaCheckPayload>('/admin/media/check');
      setMedia(result);

      if (result.total_missing === 0) {
        toast.success(`Media lengkap. ${formatNumber(result.checked)} file diperiksa.`);
      } else {
        toast.error(`${result.total_missing} file media tidak ditemukan.`);
      }
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setChecking(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Dashboard" subtitle="Ringkasan operasional RaceTap." />
        <AdminSkeleton stats={6} rows={5} />
      </>
    );
  }

  if (error || !data) {
    return <AdminError message={error || 'Data tidak tersedia.'} onRetry={reload} />;
  }

  const { stats } = data;
  const ocrCoverage = stats.photos > 0 ? Math.round((stats.ocr_indexed / stats.photos) * 100) : 0;

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        subtitle="Ringkasan operasional RaceTap."
        actions={
          <>
            <button
              className="btn btn-light-custom"
              type="button"
              onClick={() => void checkMedia()}
              disabled={checking}
            >
              <i className="bi bi-images me-1" aria-hidden="true" />
              {checking ? 'Memeriksa media...' : 'Periksa media'}
            </button>
            <Link className="btn btn-primary" to="/admin/races">
              <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Kelola race
            </Link>
          </>
        }
      />

      {media ? (
        <div
          className={`alert ${media.total_missing === 0 ? 'alert-success' : 'alert-warning'} py-2`}
          role="status"
        >
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <span>
              <strong>{formatNumber(media.checked)}</strong> file diperiksa ·{' '}
              {media.total_missing === 0 ? (
                <span>semua foto &amp; cover tersedia.</span>
              ) : (
                <span>{media.total_missing} file tidak ditemukan.</span>
              )}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-light-custom"
              onClick={() => setMedia(null)}
              aria-label="Tutup hasil pemeriksaan media"
            >
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          </div>
          {media.total_missing > 0 ? (
            <details className="mt-2">
              <summary className="small">Lihat daftar file</summary>
              <ul className="rt-adm-media-list small mb-0">
                {media.missing.map((item) => (
                  <li key={`${item.kind}-${item.id}`}>
                    {item.kind} #{item.id}: <code>{item.file}</code>
                  </li>
                ))}
                {media.truncated ? <li>…dan file lainnya</li> : null}
              </ul>
            </details>
          ) : null}
        </div>
      ) : null}

      <div className="rt-stat-grid mb-4">
        <StatCard label="Event foto" value={formatNumber(stats.photo_events)} icon="bi-images" tone="info" />
        <StatCard
          label="Foto"
          value={formatNumber(stats.photos)}
          hint={`${formatNumber(stats.photos_with_bib)} punya BIB`}
          icon="bi-camera"
          tone="primary"
        />
        <StatCard
          label="OCR coverage"
          value={`${ocrCoverage}%`}
          hint={`${formatNumber(stats.ocr_indexed)} terindeks`}
          icon="bi-cpu"
          tone="success"
          progress={ocrCoverage}
        />
        <StatCard label="Race" value={formatNumber(stats.races)} icon="bi-stopwatch" tone="warning" />
        <StatCard label="Baris hasil" value={formatNumber(stats.race_results)} icon="bi-table" tone="info" />
        <StatCard
          label="Lead baru"
          value={formatNumber(stats.leads_new)}
          hint="dari form kontak"
          icon="bi-envelope-paper"
          tone="success"
        />
      </div>

      <div className="row g-4">
        <div className="col-lg-7">
          <div className="rt-admin-card h-100">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 className="h6 mb-0">Sinkronisasi terakhir</h2>
              <Link className="small text-decoration-none" to="/admin/races">
                Lihat semua
              </Link>
            </div>
            {data.recent_syncs.length === 0 ? (
              <p className="text-slate mb-0">Belum ada race.</p>
            ) : (
              <div className="table-responsive">
                <table className="rt-table">
                  <thead>
                    <tr>
                      <th scope="col">Race</th>
                      <th scope="col">Status</th>
                      <th scope="col">Waktu</th>
                      <th scope="col" className="num">
                        Baris
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent_syncs.map((race) => (
                      <tr key={race.id}>
                        <td data-label="Race">
                          <Link to={`/admin/races/${race.id}`} className="fw-semibold">
                            {race.name}
                          </Link>
                          <div className="text-slate small">{race.slug}</div>
                        </td>
                        <td data-label="Status">
                          <span
                            className={`rt-badge ${race.last_sync_status === 'ok' ? 'ok' : race.last_sync_status ? 'warn' : 'off'}`}
                          >
                            {race.last_sync_status || 'belum pernah'}
                          </span>
                        </td>
                        <td data-label="Waktu" className="small text-slate">
                          {timeAgo(race.last_sync_at)}
                        </td>
                        <td data-label="Baris" className="small num">
                          {race.last_sync_count ?? '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="col-lg-5">
          <div className="rt-admin-card h-100">
            <div className="d-flex align-items-center justify-content-between gap-2 mb-3">
              <h2 className="h6 mb-0">Aktivitas terbaru</h2>
              <Link className="small text-decoration-none" to="/admin/audit">
                Audit log
              </Link>
            </div>
            {data.recent_activity.length === 0 ? (
              <p className="text-slate mb-0">Belum ada aktivitas tercatat.</p>
            ) : (
              <ul className="rt-adm-timeline">
                {data.recent_activity.map((entry) => (
                  <li key={`${entry.created_at}-${entry.action}-${entry.entity_id}`}>
                    <span className="rt-adm-timeline-icon" aria-hidden="true">
                      <i className={`bi ${actionIcon(entry.action)}`} />
                    </span>
                    <div className="rt-adm-timeline-body">
                      <strong>
                        {entry.entity}
                        {entry.entity_id ? ` #${entry.entity_id}` : ''}
                      </strong>
                      <small>
                        <span className="rt-chip rt-chip-neutral me-1">{entry.action}</span>
                        {entry.admin_username || 'system'} · {timeAgo(entry.created_at)}
                      </small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
