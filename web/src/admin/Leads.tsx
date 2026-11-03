import { useState } from 'react';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { timeAgo } from '../lib/format';
import {
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSkeleton,
  Pagination,
  useConfirm
} from './AdminUI';
import type { Lead, LeadsPayload } from '../types';

const STATUSES = ['', 'new', 'contacted', 'won', 'archived'];

function statusTone(status: string): string {
  if (status === 'new') return 'warn';
  if (status === 'won') return 'ok';
  return 'off';
}

export default function AdminLeads() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [expanded, setExpanded] = useState<Record<number, true>>({});
  const query = `/admin/leads?page=${page}${status ? `&status=${encodeURIComponent(status)}` : ''}`;
  const { data, loading, error, reload } = useApi<LeadsPayload>(query);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const patch = async (lead: Lead, next: string) => {
    try {
      await api(`/admin/leads/${lead.id}`, { method: 'PATCH', body: { status: next } });
      toast.success('Status lead diperbarui.');
      reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  };

  const remove = (lead: Lead) =>
    confirm({
      title: 'Hapus pesan',
      message: (
        <>
          Hapus pesan dari <strong>{lead.email}</strong>?
        </>
      ),
      confirmLabel: 'Hapus pesan',
      onConfirm: async () => {
        try {
          await api(`/admin/leads/${lead.id}`, { method: 'DELETE' });
          toast.success('Lead dihapus.');
          reload();
        } catch (cause) {
          toast.error(errorMessage(cause));
        }
      }
    });

  const toggleExpanded = (id: number) => {
    setExpanded((previous) => {
      const next = { ...previous };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }

      return next;
    });
  };

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Pesan Kontak" subtitle="Lead dari formulir kontak situs." />
        <AdminSkeleton rows={4} />
      </>
    );
  }

  if (error || !data) {
    return <AdminError message={error || 'Lead tidak tersedia.'} onRetry={reload} />;
  }

  return (
    <>
      <AdminPageHeader
        title="Pesan Kontak"
        subtitle="Lead dari formulir kontak situs."
        actions={
          <select
            className="form-select"
            value={status}
            aria-label="Filter status lead"
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {value || 'Semua status'}
              </option>
            ))}
          </select>
        }
      />

      {data.leads.length === 0 ? (
        <AdminEmpty icon="bi-envelope-open" title="Belum ada pesan masuk" description="Lead baru dari form kontak akan muncul di sini." />
      ) : (
        <div className="rt-adm-lead-list">
          {data.leads.map((lead) => {
            const message = lead.message || '';
            const isLong = message.length > 220;
            const isOpen = Boolean(expanded[lead.id]);

            return (
              <article className="rt-adm-lead" key={lead.id}>
                <div className="rt-adm-lead-head">
                  <div className="rt-adm-lead-who">
                    <strong>{lead.name}</strong>
                    <div className="rt-adm-lead-meta">
                      <a href={`mailto:${lead.email}`}>{lead.email}</a>
                      {lead.phone ? <span>{lead.phone}</span> : null}
                      {lead.event_name ? <span>Event: {lead.event_name}</span> : null}
                    </div>
                  </div>
                  <div className="rt-adm-lead-controls">
                    <span className={`rt-badge ${statusTone(lead.status)}`}>{lead.status}</span>
                    <select
                      className="form-select form-select-sm"
                      value={lead.status}
                      aria-label={`Ubah status untuk ${lead.name}`}
                      onChange={(event) => void patch(lead, event.target.value)}
                    >
                      {STATUSES.filter(Boolean).map((value) => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                    <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => remove(lead)}>
                      <i className="bi bi-trash3" aria-hidden="true" />
                      <span className="visually-hidden">Hapus pesan</span>
                    </button>
                  </div>
                </div>

                <p className={`rt-adm-lead-message${isLong && !isOpen ? ' is-clamped' : ''}`}>{message}</p>
                {isLong ? (
                  <button type="button" className="rt-adm-lead-toggle" onClick={() => toggleExpanded(lead.id)}>
                    {isOpen ? 'Tampilkan lebih sedikit' : 'Selengkapnya'}
                  </button>
                ) : null}

                <div className="rt-adm-lead-foot">
                  <span>{timeAgo(lead.created_at)}</span>
                  <span>{lead.created_at}</span>
                  <span>sumber: {lead.source}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <Pagination
        page={data.pagination.page}
        totalPages={data.pagination.total_pages}
        total={data.pagination.total}
        unit="pesan"
        onChange={setPage}
      />

      {dialog}
    </>
  );
}
