import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ErrorBox, Loading } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { formatDate, formatNumber } from '../lib/format';
import { asset } from '../payload';
import type { PhotoEventSummary } from '../types';

interface EventsPayload {
  events: PhotoEventSummary[];
}

interface FormState {
  name: string;
  slug: string;
  location: string;
  event_date: string;
  description: string;
  photographer: string;
  is_active: boolean;
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  location: '',
  event_date: '',
  description: '',
  photographer: '',
  is_active: true
};

export default function AdminPhotos() {
  const { data, loading, error, reload } = useApi<EventsPayload>('/admin/photos/events');
  const [editing, setEditing] = useState<PhotoEventSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        slug: editing.slug,
        location: editing.location,
        event_date: editing.event_date ? editing.event_date.slice(0, 10) : '',
        description: editing.description,
        photographer: editing.photographer,
        is_active: Boolean(editing.is_active)
      });
    } else {
      setForm(EMPTY);
      setCover(null);
    }
  }, [editing]);

  const update = (key: keyof FormState, value: string | boolean) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    setFormError('');

    try {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        location: form.location,
        event_date: form.event_date,
        description: form.description,
        photographer: form.photographer,
        is_active: form.is_active
      };

      let id = editing?.id || 0;

      if (editing) {
        await api(`/admin/photos/events/${editing.id}`, { method: 'PATCH', body });
      } else {
        const created = await api<PhotoEventSummary>('/admin/photos/events', { method: 'POST', body });
        id = created.id;
      }

      if (cover && id) {
        const payload = new FormData();
        payload.append('cover', cover);
        await api(`/admin/photos/events/${id}/cover`, { method: 'POST', form: payload });
      }

      setNotice(editing ? 'Event diperbarui.' : 'Event dibuat.');
      setEditing(null);
      setCover(null);
      reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (event: PhotoEventSummary) => {
    if (!window.confirm(`Hapus event ${event.name} beserta semua fotonya?`)) {
      return;
    }

    setFormError('');
    setNotice('');

    try {
      await api(`/admin/photos/events/${event.id}`, { method: 'DELETE' });
      setNotice('Event dihapus.');
      reload();
    } catch (deleteError) {
      setFormError(errorMessage(deleteError));
    }
  };

  return (
    <>
      <div className="rt-admin-toolbar">
        <div>
          <h1 className="h4 mb-1">Photos</h1>
          <p className="mb-0 text-slate">Kelola event foto, unggah gambar, dan indeks OCR.</p>
        </div>
      </div>

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {formError && <div className="alert alert-danger py-2">{formError}</div>}

      <div className="rt-admin-card mb-4">
        <h2 className="h6 mb-3">{editing ? `Edit event: ${editing.name}` : 'Event foto baru'}</h2>
        <form className="row g-3" onSubmit={onSubmit}>
          <div className="col-md-4">
            <label className="form-label" htmlFor="eventName">
              Nama event
            </label>
            <input
              id="eventName"
              className="form-control"
              required
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="eventSlug">
              Slug (opsional)
            </label>
            <input
              id="eventSlug"
              className="form-control"
              placeholder="otomatis dari nama"
              value={form.slug}
              onChange={(event) => update('slug', event.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="eventLocation">
              Lokasi
            </label>
            <input
              id="eventLocation"
              className="form-control"
              value={form.location}
              onChange={(event) => update('location', event.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="eventDate">
              Tanggal
            </label>
            <input
              id="eventDate"
              type="date"
              className="form-control"
              value={form.event_date}
              onChange={(event) => update('event_date', event.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="eventPhotographer">
              Fotografer
            </label>
            <input
              id="eventPhotographer"
              className="form-control"
              value={form.photographer}
              onChange={(event) => update('photographer', event.target.value)}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="eventCover">
              Cover
            </label>
            <input
              id="eventCover"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="form-control"
              onChange={(event) => setCover(event.target.files?.[0] || null)}
            />
          </div>
          <div className="col-12">
            <label className="form-label" htmlFor="eventDescription">
              Deskripsi
            </label>
            <textarea
              id="eventDescription"
              className="form-control"
              rows={2}
              value={form.description}
              onChange={(event) => update('description', event.target.value)}
            />
          </div>
          <div className="col-md-3">
            <div className="form-check">
              <input
                id="eventActive"
                className="form-check-input"
                type="checkbox"
                checked={form.is_active}
                onChange={(event) => update('is_active', event.target.checked)}
              />
              <label className="form-check-label" htmlFor="eventActive">
                Aktif
              </label>
            </div>
          </div>
          <div className="col-md-9 d-flex justify-content-end gap-2">
            {editing && (
              <button className="btn btn-light-custom" type="button" onClick={() => setEditing(null)}>
                Batal
              </button>
            )}
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Buat event'}
            </button>
          </div>
        </form>
      </div>

      {loading && <Loading label="Memuat event foto..." />}
      {!loading && error && <ErrorBox message={error} onRetry={reload} />}

      {!loading && !error && data && (
        <div className="rt-admin-card">
          {data.events.length === 0 ? (
            <p className="mb-0 text-slate">Belum ada event foto.</p>
          ) : (
            <div className="table-responsive">
              <table className="rt-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Tanggal</th>
                    <th>Foto</th>
                    <th>OCR</th>
                    <th>Status</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.events.map((event) => (
                    <tr key={event.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          {event.cover ? (
                            <img src={asset(event.cover)} alt="" width={54} height={40} style={{ objectFit: 'cover', borderRadius: 6 }} />
                          ) : (
                            <span className="rt-badge off">no cover</span>
                          )}
                          <div>
                            <strong>{event.name}</strong>
                            <div className="text-slate small">{event.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="small">{formatDate(event.event_date)}</td>
                      <td className="small">
                        {formatNumber(event.photo_count)} foto · {formatNumber(event.bib_count)} BIB
                      </td>
                      <td className="small">
                        {formatNumber(event.ocr_indexed)} / {formatNumber(event.photo_count)}
                      </td>
                      <td>
                        <span className={`rt-badge ${event.is_active ? 'ok' : 'off'}`}>
                          {event.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex flex-wrap gap-1">
                          <Link className="btn btn-sm btn-primary" to={`/admin/photos/${event.id}`}>
                            Galeri
                          </Link>
                          <button className="btn btn-sm btn-light-custom" type="button" onClick={() => setEditing(event)}>
                            Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => remove(event)}>
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
