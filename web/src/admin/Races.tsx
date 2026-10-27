import { useEffect, useState, type FormEvent } from 'react';
import { ErrorBox, Loading } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import type { RaceSummary } from '../types';

interface RacesPayload {
  races: RaceSummary[];
}

export default function AdminRaces() {
  const { data, loading, error, reload } = useApi<RacesPayload>('/admin/races');
  const [editing, setEditing] = useState<RaceSummary | null>(null);
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (editing) {
      setName(editing.name);
      setApiUrl(editing.api_url || '');
    } else {
      setName('');
      setApiUrl('');
    }
  }, [editing]);

  const reset = () => {
    setEditing(null);
    setFormError('');
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');
    setNotice('');

    try {
      if (editing) {
        await api(`/admin/races/${editing.id}`, { method: 'PATCH', body: { name, api_url: apiUrl } });
        setNotice('Race berhasil diperbarui.');
      } else {
        await api('/admin/races', { method: 'POST', body: { name, api_url: apiUrl } });
        setNotice('Race berhasil ditambahkan.');
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
    setNotice('');
    setFormError('');

    try {
      await promise;
      setNotice(label);
      reload();
    } catch (actionError) {
      setFormError(errorMessage(actionError));
    }
  };

  return (
    <>
      <div className="rt-admin-toolbar">
        <div>
          <h1 className="h4 mb-1">Races</h1>
          <p className="mb-0 text-slate">Kelola event race dan sinkronisasi hasil dari API Feibot.</p>
        </div>
      </div>

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {formError && <div className="alert alert-danger py-2">{formError}</div>}

      <div className="rt-admin-card mb-4">
        <h2 className="h6 mb-3">{editing ? `Edit: ${editing.name}` : 'Tambah race baru'}</h2>
        <form className="row g-3 align-items-end" onSubmit={onSubmit}>
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
          <div className="col-md-5">
            <label className="form-label" htmlFor="raceApi">
              URL API
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
          </div>
          <div className="col-md-2 d-flex gap-2">
            <button className="btn btn-primary w-100" type="submit" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Simpan'}
            </button>
            {editing && (
              <button className="btn btn-light-custom" type="button" onClick={reset}>
                Batal
              </button>
            )}
          </div>
        </form>
      </div>

      {loading && <Loading label="Memuat races..." />}
      {!loading && error && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && data && (
        <div className="rt-admin-card">
          {data.races.length === 0 ? (
            <p className="mb-0 text-slate">Belum ada race.</p>
          ) : (
            <div className="table-responsive">
              <table className="rt-table">
                <thead>
                  <tr>
                    <th>Race</th>
                    <th>API</th>
                    <th>Sinkronisasi</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.races.map((race) => (
                    <tr key={race.id}>
                      <td>
                        <strong>{race.name}</strong>
                        <div className="text-slate small">
                          {race.slug} · <a href={`/v2/race/${race.slug}`} target="_blank" rel="noreferrer">hasil</a>
                        </div>
                      </td>
                      <td className="small" style={{ maxWidth: 320, wordBreak: 'break-all' }}>
                        {race.api_url}
                      </td>
                      <td className="small">
                        <div>{race.last_sync_status || 'belum pernah'}</div>
                        <div className="text-slate">{race.last_sync_at || '-'}</div>
                        {race.last_sync_message && <div className="text-slate">{race.last_sync_message}</div>}
                      </td>
                      <td>
                        <span className={`rt-badge ${race.is_active ? 'ok' : 'off'}`}>{race.is_active ? 'Aktif' : 'Nonaktif'}</span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <button className="btn btn-sm btn-light-custom" type="button" onClick={() => setEditing(race)}>
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-light-custom"
                            type="button"
                            onClick={() => action('Sinkronisasi dijalankan.', api(`/admin/races/${race.id}/sync`, { method: 'POST' }))}
                          >
                            Sync
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
                            onClick={() => {
                              if (window.confirm(`Hapus race ${race.name}? Hasil terkait juga dihapus.`)) {
                                void action('Race dihapus.', api(`/admin/races/${race.id}`, { method: 'DELETE' }));
                              }
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
