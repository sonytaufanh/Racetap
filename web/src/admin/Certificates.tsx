import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useApi } from '../hooks/useApi';
import { formatNumber } from '../lib/format';
import { StatCard } from '../components/ui';
import { certificateAssetUrl } from '../certificate/api';
import type { CertificateEventRow } from '../certificate/types';
import {
  ActionGroup,
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSkeleton,
  SearchField
} from './AdminUI';

function StatusBadge({ event }: { event: CertificateEventRow }) {
  if (!event.has_template) {
    return <span className="rt-badge off">Belum ada template</span>;
  }

  if (!event.enabled) {
    return <span className="rt-badge warn">Template siap, nonaktif</span>;
  }

  return <span className="rt-badge ok">Aktif</span>;
}

export default function AdminCertificates() {
  const { data, loading, error, reload } = useApi<{ events: CertificateEventRow[] }>(
    '/admin/certificates'
  );
  const [query, setQuery] = useState('');

  const term = query.trim().toLowerCase();
  const events = useMemo(() => {
    const rows = data?.events || [];

    if (term === '') {
      return rows;
    }

    return rows.filter(
      (event) => event.name.toLowerCase().includes(term) || event.slug.toLowerCase().includes(term)
    );
  }, [data, term]);

  const stats = useMemo(() => {
    const rows = data?.events || [];

    return {
      total: rows.length,
      ready: rows.filter((event) => event.has_template).length,
      active: rows.filter((event) => event.has_template && event.enabled).length
    };
  }, [data]);

  return (
    <>
      <AdminPageHeader
        title="Sertifikat"
        subtitle="Unggah desain e-sertifikat per event, lalu atur posisi nama, gender, waktu finish, dan peringkat peserta."
      />

      {loading ? <AdminSkeleton rows={6} stats={3} /> : null}

      {!loading && error ? <AdminError message={error} onRetry={reload} /> : null}

      {!loading && !error && data ? (
        <>
          <div className="rt-stat-grid mb-4">
            <StatCard
              label="Event dengan folder hasil"
              value={formatNumber(stats.total)}
              icon="bi-folder2-open"
              tone="info"
            />
            <StatCard
              label="Sudah ada template"
              value={formatNumber(stats.ready)}
              hint={`${formatNumber(stats.total - stats.ready)} belum diunggah`}
              icon="bi-image"
              tone="primary"
            />
            <StatCard
              label="Aktif di halaman hasil"
              value={formatNumber(stats.active)}
              hint={`${formatNumber(stats.ready - stats.active)} template nonaktif`}
              icon="bi-award"
              tone="success"
            />
          </div>

          <div className="rt-admin-card">
            <div className="rt-adm-filters">
              <h2 className="h6 mb-0 me-auto">Daftar event</h2>
              <SearchField
                value={query}
                onChange={setQuery}
                placeholder="Cari nama atau slug event"
                label="Cari event sertifikat"
              />
              <span className="rt-adm-count">
                {formatNumber(events.length)} dari {formatNumber(stats.total)} event
              </span>
            </div>

            {events.length === 0 ? (
              (data.events.length === 0 ? (
                <AdminEmpty
                  icon="bi-award"
                  title="Belum ada event dengan folder hasil"
                  description="Sertifikat dibuat per event dari folder results/<slug>/. Unggah data hasil terlebih dahulu."
                />
              ) : (
                <AdminEmpty
                  icon="bi-search"
                  title="Tidak ada event yang cocok"
                  description={`Tidak ada hasil untuk "${query}". Coba kata kunci lain.`}
                />
              ))
            ) : (
              <div className="table-responsive">
                <table className="rt-table rt-table--stack">
                  <thead>
                    <tr>
                      <th scope="col">Event</th>
                      <th scope="col">Template</th>
                      <th scope="col">Field</th>
                      <th scope="col">Status</th>
                      <th scope="col">Update</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.slug}>
                        <td data-label="Event">
                          <div className="d-flex align-items-center gap-2">
                            {event.template ? (
                              <img
                                src={certificateAssetUrl(event.slug, event.template) || ''}
                                alt=""
                                width={64}
                                height={46}
                                loading="lazy"
                                style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }}
                              />
                            ) : (
                              <span className="rt-badge off">kosong</span>
                            )}
                            <div>
                              <strong>{event.name}</strong>
                              <div className="text-slate small">{event.slug}</div>
                            </div>
                          </div>
                        </td>
                        <td data-label="Template" className="small">
                          {event.has_template && event.width && event.height
                            ? `${event.width} x ${event.height} px`
                            : '-'}
                        </td>
                        <td data-label="Field" className="small">
                          {formatNumber(event.field_count)} field
                        </td>
                        <td data-label="Status">
                          <StatusBadge event={event} />
                        </td>
                        <td data-label="Update" className="small">
                          {event.updated_at ? event.updated_at.slice(0, 16) : '-'}
                        </td>
                        <td data-label="Aksi">
                          <ActionGroup>
                            <Link className="btn btn-sm btn-primary" to={`/admin/sertifikat/${encodeURIComponent(event.slug)}`}>
                              <i className="bi bi-vector-pen me-1" aria-hidden="true" />
                              {event.has_template ? 'Atur desain' : 'Unggah template'}
                            </Link>
                          </ActionGroup>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </>
  );
}
