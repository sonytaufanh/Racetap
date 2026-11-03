import { useState } from 'react';
import { useApi } from '../hooks/useApi';
import { timeAgo } from '../lib/format';
import { AdminEmpty, AdminError, AdminPageHeader, AdminSkeleton, Pagination } from './AdminUI';
import type { AuditPayload } from '../types';

const ENTITIES = ['', 'race', 'photo_event', 'photo', 'admin_user', 'settings', 'lead'];

function actionTone(action: string): string {
  if (/delete|remove|destroy/i.test(action)) return 'rt-chip-danger';
  if (/create|store|add|upload/i.test(action)) return 'rt-chip-success';
  if (/update|edit|patch|sync/i.test(action)) return 'rt-chip-warning';
  return 'rt-chip-neutral';
}

export default function AdminAudit() {
  const [page, setPage] = useState(1);
  const [entity, setEntity] = useState('');
  const [expanded, setExpanded] = useState<Record<number, true>>({});
  const query = `/admin/audit?page=${page}${entity ? `&entity=${encodeURIComponent(entity)}` : ''}`;
  const { data, loading, error, reload } = useApi<AuditPayload>(query);

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Audit Log" subtitle="Jejak perubahan yang dilakukan admin." />
        <AdminSkeleton rows={8} />
      </>
    );
  }

  if (error || !data) {
    return <AdminError message={error || 'Audit log tidak tersedia.'} onRetry={reload} />;
  }

  return (
    <>
      <AdminPageHeader
        title="Audit Log"
        subtitle="Jejak perubahan yang dilakukan admin."
        actions={
          <select
            className="form-select"
            value={entity}
            aria-label="Filter entitas audit"
            onChange={(event) => {
              setEntity(event.target.value);
              setPage(1);
            }}
          >
            {ENTITIES.map((value) => (
              <option key={value} value={value}>
                {value || 'Semua entitas'}
              </option>
            ))}
          </select>
        }
      />

      <div className="rt-admin-card">
        {data.entries.length === 0 ? (
          <AdminEmpty
            icon="bi-clock-history"
            title="Belum ada aktivitas"
            description="Perubahan yang dilakukan admin akan tercatat di sini."
          />
        ) : (
          <div className="table-responsive">
            <table className="rt-table">
              <thead>
                <tr>
                  <th scope="col">Waktu</th>
                  <th scope="col">Admin</th>
                  <th scope="col">Aksi</th>
                  <th scope="col">Entitas</th>
                  <th scope="col">Detail</th>
                  <th scope="col">IP</th>
                </tr>
              </thead>
              <tbody>
                {data.entries.map((entry) => {
                  const detail = entry.detail || '-';
                  const isLong = detail.length > 70;
                  const isOpen = Boolean(expanded[entry.id]);

                  return (
                    <tr key={entry.id}>
                      <td className="small text-slate" title={entry.created_at}>
                        {timeAgo(entry.created_at)}
                      </td>
                      <td className="small">{entry.admin_username || 'system'}</td>
                      <td>
                        <span className={`rt-chip ${actionTone(entry.action)}`}>{entry.action}</span>
                      </td>
                      <td className="small">
                        {entry.entity}
                        {entry.entity_id ? ` #${entry.entity_id}` : ''}
                      </td>
                      <td className="small text-slate">
                        <span className={isLong && !isOpen ? 'rt-adm-truncate' : undefined} title={detail}>
                          {detail}
                        </span>
                        {isLong ? (
                          <button
                            type="button"
                            className="rt-adm-lead-toggle d-block"
                            onClick={() =>
                              setExpanded((previous) => {
                                const next = { ...previous };
                                if (next[entry.id]) delete next[entry.id];
                                else next[entry.id] = true;
                                return next;
                              })
                            }
                          >
                            {isOpen ? 'Ringkas' : 'Selengkapnya'}
                          </button>
                        ) : null}
                      </td>
                      <td className="small text-slate">{entry.ip || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={data.pagination.page}
          totalPages={data.pagination.total_pages}
          total={data.pagination.total}
          unit="entri"
          onChange={setPage}
        />
      </div>
    </>
  );
}
