import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { PUBLISHED_EVENT_SLUGS } from '../lib/events';
import { api, errorMessage } from '../lib/http';
import { timeAgo } from '../lib/format';
import { ActionGroup, AdminEmpty, AdminPageHeader, AdminSkeleton, FormSection, useConfirm } from './AdminUI';
import type { RaceSummary } from '../types';

interface RacesPayload {
  races: RaceSummary[];
}

export default function AdminRaces() {
  const { data, loading, error, reload } = useApi<RacesPayload>('/admin/races');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<RaceSummary | null>(null);
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setApiUrl(editing.api_url || '');
      setFormOpen(true);
    } else {
      setName('');
      setApiUrl('');
    }
  }, [editing]);

  const reset = () => {
    setEditing(null);
    setFormError('');
    setFormOpen(false);
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');

    try {
      if (editing) {
        await api(`/admin/races/${editing.id}`, { method: 'PATCH', body: { name, api_url: apiUrl } });
        toast.success('Race berhasil diperbarui.');
      } else {
        await api('/admin/races', { method: 'POST', body: { name, api_url: apiUrl } });
        toast.success('Race berhasil ditambahkan.');
      }

      reset();
      reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const action = async (label: string, promise: Promise<unknown>) => {
    setFormError('');

    try {
      await promise;
      toast.success(label);
      reload();
    } catch (actionError) {
      toast.error(errorMessage(actionError));
    }
  };

  const syncable = (data?.races || []).filter((race) => race.api_url && race.is_active);

  const syncAll = async () => {
    if (syncable.length === 0) {
      return;
    }

    setSyncingAll(true);
    setFormError('');

    let ok = 0;
    const failed: string[] = [];

    for (const race of syncable) {
      try {
        await api(`/admin/races/${race.id}/sync`, { method: 'POST' });
        ok += 1;
      } catch (syncError) {
        failed.push(`${race.slug}: ${errorMessage(syncError)}`);
      }
    }

    setSyncingAll(false);
    reload();

    if (failed.length > 0) {
      setFormError(`${ok} berhasil, ${failed.length} gagal. ${failed.join(' | ')}`);
    } else {
      toast.success(`${ok} race berhasil disinkronkan.`);
    }
  };

  const toggleForm = () => {
    setFormError('');

    if (editing) {
      setEditing(null);
      setFormOpen(false);
      return;
    }

    setFormOpen((previous) => !previous);
  };

  return (
    <>
      <AdminPageHeader
        title="Races"
        subtitle="Kelola event race dan sinkronisasi hasil dari API Feibot."
        actions={
          <>
            <button
              className="btn btn-light-custom"
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Race baru
            </button>
            <button
              className="btn btn-primary"
              type="button"
              onClick={() => void syncAll()}
              disabled={syncingAll || syncable.length === 0}
              title={syncable.length === 0 ? 'Tidak ada race dengan URL API aktif' : `Sinkronkan ${syncable.length} race`}
            >
              <i className="bi bi-arrow-repeat me-1" aria-hidden="true" />
              {syncingAll ? 'Menyinkronkan...' : `Sync semua (${syncable.length})`}
            </button>
          </>
        }
      />

      {formError ? (
        <div className="alert alert-danger py-2" role="alert">
          {formError}
        </div>
      ) : null}

      <div className="rt-admin-card mb-4">
        <button
          type="button"
          className="rt-adm-collapse-toggle"
          aria-expanded={formOpen}
          aria-controls="race-form"
          onClick={toggleForm}
        >
          <h2 className="h6 mb-0">{editing ? `Edit: ${editing.name}` : 'Tambah race baru'}</h2>
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </button>

        {formOpen ? (
          <form id="race-form" className="mt-3" onSubmit={onSubmit}>
            <FormSection title="Detail race" description="Nama tampil di daftar race dan halaman hasil.">
              <div className="row g-3">
                <div className="col-md-5">
                  <label className="form-label" htmlFor="raceName">
                    Nama race
                  </label>
                  <input
                    id="raceName"
                    className="form-control"
                    maxLength={190}
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                  />
                </div>
                <div className="col-md-7">
                  <label className="form-label" htmlFor="raceApi">
                    URL API Feibot
                  </label>
                  <input
                    id="raceApi"
                    type="url"
                    className="form-control"
                    maxLength={1000}
                    required
                    placeholder="https://time.feibot.com/api/runner-scores/..."
                    value={apiUrl}
                    onChange={(event) => setApiUrl(event.target.value)}
                  />
                  <small className="text-slate">Hasil ditarik dari endpoint ini saat sinkronisasi.</small>
                </div>
              </div>
            </FormSection>
            <div className="rt-adm-form-actions">
              {editing ? (
                <button className="btn btn-light-custom" type="button" onClick={reset}>
                  Batal
                </button>
              ) : null}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Simpan race'}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {loading ? <AdminSkeleton rows={5} /> : null}
      {!loading && error ? (
        <div className="alert alert-danger py-2" role="alert">
          {error}{' '}
          <button type="button" className="btn btn-sm btn-light-custom ms-2" onClick={reload}>
            Coba lagi
          </button>
        </div>
      ) : null}

      {!loading && !error && data ? (
        <div className="rt-admin-card">
          {data.races.length === 0 ? (
            <AdminEmpty
              icon="bi-stopwatch"
              title="Belum ada race"
              description="Tambahkan race lalu hubungkan ke endpoint Feibot untuk menarik hasil otomatis."
              action={
                <button
                  className="btn btn-primary btn-sm"
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setFormOpen(true);
                  }}
                >
                  <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Tambah race
                </button>
              }
            />
          ) : (
            <div className="table-responsive">
              <table className="rt-table rt-table--stack">
                <thead>
                  <tr>
                    <th scope="col">Race</th>
                    <th scope="col">API</th>
                    <th scope="col">Sinkronisasi</th>
                    <th scope="col">Status</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.races.map((race) => (
                    <tr key={race.id}>
                      <td data-label="Race">
                        <Link to={`/admin/races/${race.id}`} className="fw-semibold text-decoration-none">
                          {race.name}
                        </Link>
                        <div className="text-slate small">
                          {race.slug} ·{' '}
                          {PUBLISHED_EVENT_SLUGS.has(race.slug) ? (
                            <a href={`/results/${race.slug}/`} target="_blank" rel="noreferrer">
                              hasil
                            </a>
                          ) : (
                            <span className="text-muted">hasil belum dipublikasikan</span>
                          )}
                        </div>
                      </td>
                      <td data-label="API" className="small">
                        {race.api_url ? (
                          <span className="rt-adm-truncate" title={race.api_url}>
                            {race.api_url}
                          </span>
                        ) : (
                          <span className="text-muted">Tanpa integrasi API (data.json)</span>
                        )}
                      </td>
                      <td data-label="Sinkronisasi" className="small">
                        <div>{timeAgo(race.last_sync_at)}</div>
                        {race.last_sync_message ? (
                          <div className="text-slate rt-adm-truncate" title={race.last_sync_message}>
                            {race.last_sync_message}
                          </div>
                        ) : null}
                      </td>
                      <td data-label="Status">
                        <span className={`rt-badge ${race.is_active ? 'ok' : 'off'}`}>
                          {race.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td data-label="Aksi">
                        <ActionGroup>
                          <button className="btn btn-sm btn-light-custom" type="button" onClick={() => setEditing(race)}>
                            <i className="bi bi-pencil me-1" aria-hidden="true" /> Edit
                          </button>
                          <button
                            className="btn btn-sm btn-light-custom"
                            type="button"
                            disabled={!race.api_url}
                            title={race.api_url ? 'Sinkronkan hasil dari API' : 'Race ini belum punya URL API'}
                            onClick={() => action('Sinkronisasi dijalankan.', api(`/admin/races/${race.id}/sync`, { method: 'POST' }))}
                          >
                            <i className="bi bi-arrow-repeat me-1" aria-hidden="true" /> Sync
                          </button>
                          <button
                            className="btn btn-sm btn-light-custom"
                            type="button"
                            onClick={() => action('Status race diperbarui.', api(`/admin/races/${race.id}/toggle`, { method: 'POST' }))}
                          >
                            {race.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            type="button"
                            onClick={() =>
                              confirm({
                                title: 'Hapus race',
                                message: (
                                  <>
                                    Hapus race <strong>{race.name}</strong>? Hasil terkait juga akan dihapus.
                                  </>
                                ),
                                confirmLabel: 'Hapus race',
                                onConfirm: () =>
                                  action('Race dihapus.', api(`/admin/races/${race.id}`, { method: 'DELETE' }))
                              })
                            }
                          >
                            <i className="bi bi-trash3 me-1" aria-hidden="true" /> Hapus
                          </button>
                        </ActionGroup>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}

      {dialog}
    </>
  );
}
