import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { formatDate, formatNumber } from '../lib/format';
import { asset } from '../payload';
import {
  ActionGroup,
  AdminEmpty,
  AdminPageHeader,
  AdminSkeleton,
  FormSection,
  SearchField,
  useConfirm
} from './AdminUI';
import type { OcrModeInfo, OcrRule, PhotoEventSummary } from '../types';

interface EventsPayload {
  events: PhotoEventSummary[];
  vision_enabled?: boolean;
  ocr?: OcrModeInfo;
}

interface FormState {
  name: string;
  slug: string;
  location: string;
  event_date: string;
  description: string;
  photographer: string;
  is_active: boolean;
  digitsOnly: boolean;
  digits: number;
}

const EMPTY: FormState = {
  name: '',
  slug: '',
  location: '',
  event_date: '',
  description: '',
  photographer: '',
  is_active: true,
  digitsOnly: true,
  digits: 4
};

/** Pilihan jumlah angka untuk aturan OCR (1-12, plus "belum ditentukan"). */
const DIGIT_CHOICES = Array.from({ length: 12 }, (_, index) => index + 1);

/** Short, human label for a per-event OCR rule. */
function ocrRuleLabel(rule?: OcrRule): string {
  const digits = rule?.digits ?? 0;
  const digitsOnly = rule?.digitsOnly ?? true;
  const kind = digitsOnly ? 'angka' : 'angka & huruf';

  return digits > 0 ? `${kind} · ${digits} angka` : `${kind} · 3-6 angka`;
}

export default function AdminPhotos() {
  const { data, loading, error, reload } = useApi<EventsPayload>('/admin/photos/events');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const [editing, setEditing] = useState<PhotoEventSummary | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [cover, setCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [query, setQuery] = useState('');
  const [formOpen, setFormOpen] = useState(false);

  const term = query.trim().toLowerCase();
  const filteredEvents = (data?.events || []).filter((event) => {
    if (term === '') {
      return true;
    }

    return (
      event.name.toLowerCase().includes(term) ||
      event.slug.toLowerCase().includes(term) ||
      event.location.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    if (editing) {
      setForm({
        name: editing.name,
        slug: editing.slug,
        location: editing.location,
        event_date: editing.event_date ? editing.event_date.slice(0, 10) : '',
        description: editing.description,
        photographer: editing.photographer,
        is_active: Boolean(editing.is_active),
        digitsOnly: editing.ocr_rule?.digitsOnly ?? true,
        digits: editing.ocr_rule?.digits ?? 4
      });
      setFormOpen(true);
    } else {
      setForm(EMPTY);
      setCover(null);
    }
  }, [editing]);

  useEffect(() => {
    if (cover) {
      const url = URL.createObjectURL(cover);
      setCoverPreview(url);

      return () => URL.revokeObjectURL(url);
    }

    setCoverPreview(editing?.cover ? asset(editing.cover) : null);
    return undefined;
  }, [cover, editing]);

  const update = (key: keyof FormState, value: string | boolean | number) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setFormError('');

    try {
      const body = {
        name: form.name,
        slug: form.slug || undefined,
        location: form.location,
        event_date: form.event_date,
        description: form.description,
        photographer: form.photographer,
        is_active: form.is_active,
        ocr_rule: {
          digitsOnly: form.digitsOnly,
          digits: Number.isFinite(form.digits) ? form.digits : 0
        }
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

      toast.success(editing ? 'Event diperbarui.' : 'Event dibuat.');
      setEditing(null);
      setCover(null);
      setFormOpen(false);
      reload();
    } catch (submitError) {
      setFormError(errorMessage(submitError));
    } finally {
      setBusy(false);
    }
  };

  const remove = (event: PhotoEventSummary) =>
    confirm({
      title: 'Hapus event foto',
      message: (
        <>
          Hapus event <strong>{event.name}</strong> beserta semua fotonya? Tindakan ini tidak bisa dibatalkan.
        </>
      ),
      confirmLabel: 'Hapus event',
      onConfirm: async () => {
        setFormError('');

        try {
          await api(`/admin/photos/events/${event.id}`, { method: 'DELETE' });
          toast.success('Event dihapus.');
          reload();
        } catch (deleteError) {
          toast.error(errorMessage(deleteError));
        }
      }
    });

  const toggleForm = () => {
    setFormError('');

    if (editing) {
      setEditing(null);
      setCover(null);
      setFormOpen(false);
      return;
    }

    setFormOpen((previous) => !previous);
  };

  return (
    <>
      <AdminPageHeader
        title="Photos"
        subtitle="Kelola event foto, unggah gambar, dan indeks OCR."
        actions={
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Event baru
          </button>
        }
      />

      {data?.ocr?.warning ? (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-octagon me-1" aria-hidden="true" />
          <strong>RapidOCR wajib aktif.</strong> {data.ocr.warning}
        </div>
      ) : null}

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
          aria-controls="photo-event-form"
          onClick={toggleForm}
        >
          <h2 className="h6 mb-0">{editing ? `Edit event: ${editing.name}` : 'Event foto baru'}</h2>
          <i className="bi bi-chevron-down" aria-hidden="true" />
        </button>

        {formOpen ? (
          <form id="photo-event-form" className="mt-3" onSubmit={onSubmit}>
            <FormSection title="Informasi event">
              <div className="row g-3">
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
                  <div className="form-check mt-md-4 pt-md-2">
                    <input
                      id="eventActive"
                      className="form-check-input"
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(event) => update('is_active', event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="eventActive">
                      Tampilkan di situs publik
                    </label>
                  </div>
                </div>
                <div className="col-md-8">
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
                <div className="col-md-4">
                  <label className="form-label" htmlFor="eventCover">
                    Cover
                  </label>
                  <div className="d-flex align-items-center gap-2">
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Pratinjau cover"
                        width={64}
                        height={48}
                        style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                      />
                    ) : (
                      <span className="rt-badge off">belum ada</span>
                    )}
                    <input
                      id="eventCover"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="form-control"
                      onChange={(event) => setCover(event.target.files?.[0] || null)}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            <FormSection
              title="Aturan OCR"
              description="Menentukan angka mana yang dianggap nomor BIB saat pemindaian OCR untuk event ini."
            >
              <div className="row g-3">
                <div className="col-md-5">
                  <label className="form-label" htmlFor="eventDigits">
                    Jumlah angka pada nomor BIB
                  </label>
                  <select
                    id="eventDigits"
                    className="form-select"
                    value={form.digits}
                    onChange={(event) => update('digits', Number(event.target.value))}
                  >
                    <option value={0}>Belum ditentukan (3-6 angka)</option>
                    {DIGIT_CHOICES.map((count) => (
                      <option key={count} value={count}>
                        {count} angka
                      </option>
                    ))}
                  </select>
                  <small className="text-slate">
                    Pilih <strong>4</strong> kalau semua BIB event ini 4 angka (mis. 1042). Angka di luar jumlah itu
                    diabaikan.
                  </small>
                </div>
                <div className="col-md-4">
                  <div className="form-check mt-md-4 pt-md-2">
                    <input
                      id="eventDigitsOnly"
                      className="form-check-input"
                      type="checkbox"
                      checked={form.digitsOnly}
                      onChange={(event) => update('digitsOnly', event.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="eventDigitsOnly">
                      Hanya angka (0-9)
                    </label>
                  </div>
                  <small className="text-slate d-block mt-1">
                    Huruf yang mirip angka tetap dibaca (mis. O → 0, I → 1).
                  </small>
                </div>
                <div className="col-md-3">
                  <div className="alert alert-light border mb-0 py-2 small" role="note">
                    Akan membaca <strong>{form.digitsOnly ? 'hanya angka' : 'angka & huruf'}</strong> sepanjang{' '}
                    <strong>{form.digits > 0 ? `${form.digits} angka` : '3-6 angka'}</strong>.
                  </div>
                </div>
              </div>
            </FormSection>
            <div className="rt-adm-form-actions">
              {editing ? (
                <button className="btn btn-light-custom" type="button" onClick={() => setEditing(null)}>
                  Batal
                </button>
              ) : null}
              <button className="btn btn-primary" type="submit" disabled={busy}>
                {busy ? 'Menyimpan...' : editing ? 'Simpan perubahan' : 'Buat event'}
              </button>
            </div>
          </form>
        ) : null}
      </div>

      {loading ? <AdminSkeleton rows={6} /> : null}
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
          <div className="rt-adm-filters">
            <h2 className="h6 mb-0 me-auto">Daftar event</h2>
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Cari event, slug, atau lokasi"
              label="Cari event foto"
            />
            <span className="rt-adm-count">
              {formatNumber(filteredEvents.length)} dari {formatNumber(data.events.length)} event
            </span>
          </div>

          {filteredEvents.length === 0 ? (
            data.events.length === 0 ? (
              <AdminEmpty
                icon="bi-images"
                title="Belum ada event foto"
                description="Buat event terlebih dahulu, lalu unggah foto peserta ke galerinya."
                action={
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    <i className="bi bi-plus-lg me-1" aria-hidden="true" /> Event foto baru
                  </button>
                }
              />
            ) : (
              <AdminEmpty
                icon="bi-search"
                title="Tidak ada event yang cocok"
                description={`Tidak ada hasil untuk "${query}". Coba kata kunci lain.`}
              />
            )
          ) : (
            <div className="table-responsive">
              <table className="rt-table rt-table--stack">
                <thead>
                  <tr>
                    <th scope="col">Event</th>
                    <th scope="col">Tanggal</th>
                    <th scope="col">Foto</th>
                    <th scope="col">OCR</th>
                    <th scope="col">Aturan OCR</th>
                    <th scope="col">Status</th>
                    <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event.id}>
                      <td data-label="Event">
                        <div className="d-flex align-items-center gap-2">
                          {event.cover ? (
                            <img
                              src={asset(event.cover)}
                              alt=""
                              width={54}
                              height={40}
                              loading="lazy"
                              style={{ objectFit: 'cover', borderRadius: 8, flexShrink: 0 }}
                            />
                          ) : (
                            <span className="rt-badge off">no cover</span>
                          )}
                          <div>
                            <strong>{event.name}</strong>
                            <div className="text-slate small">{event.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td data-label="Tanggal" className="small">
                        {formatDate(event.event_date)}
                      </td>
                      <td data-label="Foto" className="small">
                        {formatNumber(event.photo_count)} foto · {formatNumber(event.bib_count)} BIB
                      </td>
                      <td data-label="OCR" className="small">
                        {formatNumber(event.ocr_indexed)} / {formatNumber(event.photo_count)}
                      </td>
                      <td data-label="Aturan OCR" className="small">
                        <span className="rt-badge">{ocrRuleLabel(event.ocr_rule)}</span>
                      </td>
                      <td data-label="Status">
                        <span className={`rt-badge ${event.is_active ? 'ok' : 'off'}`}>
                          {event.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td data-label="Aksi">
                        <ActionGroup>
                          <Link className="btn btn-sm btn-primary" to={`/admin/photos/${event.id}`}>
                            <i className="bi bi-images me-1" aria-hidden="true" /> Galeri
                          </Link>
                          <button className="btn btn-sm btn-light-custom" type="button" onClick={() => setEditing(event)}>
                            <i className="bi bi-pencil me-1" aria-hidden="true" /> Edit
                          </button>
                          <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => remove(event)}>
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
