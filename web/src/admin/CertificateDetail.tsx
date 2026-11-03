import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useToast } from '../components/Toast';
import { errorMessage } from '../lib/http';
import { parseScoresData } from '../results/model';
import type { Participant } from '../results/types';
import {
  certificateAssetUrl,
  deleteCertificate,
  getCertificate,
  getCertificateSample,
  listCertificates,
  saveCertificate,
  uploadCertificateTemplate
} from '../certificate/api';
import {
  DEFAULT_CERTIFICATE_BODY_FONT,
  DEFAULT_CERTIFICATE_FONT,
  CERTIFICATE_FONTS,
  findCertificateFont
} from '../certificate/fonts';
import {
  defaultLayout,
  emptyCertificateConfig,
  makeTextField,
  makeTokenField,
  styleDefaults
} from '../certificate/defaults';
import { loadImage } from '../certificate/render';
import { CERTIFICATE_TOKENS } from '../certificate/tokens';
import type {
  CertificateConfig,
  CertificateEventRow,
  CertificateField,
  CertificateFieldStyle,
  CertificateMeta,
  CertificateToken
} from '../certificate/types';
import { CertificateBoard } from './CertificateBoard';
import { AdminPageHeader, AdminSkeleton, FormSection, useConfirm } from './AdminUI';

/** Shown when an event has no data.json yet, so the editor still previews text. */
const FALLBACK_PARTICIPANT: Participant = {
  id: 0,
  name: 'Nama Peserta Contoh',
  bib: '1234',
  sex: 'M',
  genderLabel: 'Male',
  itemName: '10K',
  ageGroup: 'OPEN',
  ageGroup2: 'OPEN',
  finisher: 1,
  status: { label: 'Finisher', tone: 'finisher' },
  netScore: '01:23:45',
  totalScore: '01:25:10',
  startTime: '05:00:00',
  finishTime: '06:23:45',
  pace: '05:30',
  city: 'Jakarta',
  team: 'Racetap Runner',
  diff: '',
  cp1: '',
  cp2: '',
  cp1Cp2: '',
  netRanking: 12,
  itemNetRank: 34,
  ageNetRank: 5,
  age2NetRank: 5
};

function fieldLabel(field: CertificateField): string {
  if (field.type === 'text') {
    const text = (field.text || '').split('\n')[0].trim();

    return `Teks: ${text.slice(0, 22) || '(kosong)'}`;
  }

  const token = CERTIFICATE_TOKENS.find((item) => item.id === field.token);

  return token ? token.label : String(field.token);
}

export default function AdminCertificateDetail() {
  const { slug = '' } = useParams();
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [config, setConfig] = useState<CertificateConfig | null>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageError, setImageError] = useState('');
  const [eventName, setEventName] = useState(slug);
  const [events, setEvents] = useState<CertificateEventRow[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [sampleTitle, setSampleTitle] = useState('');
  const [sampleDate, setSampleDate] = useState('');
  const [sampleTotal, setSampleTotal] = useState(0);
  const [sampleMissing, setSampleMissing] = useState(false);
  const [participantId, setParticipantId] = useState<number | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dirty, setDirty] = useState(false);

  const participant = useMemo(() => {
    if (participantId === FALLBACK_PARTICIPANT.id) {
      return FALLBACK_PARTICIPANT;
    }

    return participants.find((item) => item.id === participantId) || participants[0] || FALLBACK_PARTICIPANT;
  }, [participantId, participants]);

  const meta: CertificateMeta = useMemo(
    () => ({
      eventName: config?.eventName || eventName,
      eventDate: config?.eventDate || sampleDate,
      eventTitle: sampleTitle || eventName
    }),
    [config?.eventDate, config?.eventName, eventName, sampleDate, sampleTitle]
  );

  const selectedField = useMemo(
    () => config?.fields.find((field) => field.id === selectedFieldId) || null,
    [config, selectedFieldId]
  );

  // Same-origin URL (works in dev and production); never the API's absolute
  // template_url, which would be cross-origin behind the Vite dev server.
  const templateUrl = config?.template ? certificateAssetUrl(slug, config.template) : null;

  // The eventName token is picked from the published events so it can never be
  // a typo; the current event is always present even before the list loads.
  const eventOptions = useMemo(() => {
    const rows = events.map((event) => ({ slug: event.slug, name: event.name }));

    if (!rows.some((row) => row.slug === slug)) {
      rows.unshift({ slug, name: eventName });
    }

    return rows;
  }, [eventName, events, slug]);

  const selectedEventSlug = useMemo(() => {
    const match = eventOptions.find((option) => option.name === config?.eventName);

    return match ? match.slug : slug;
  }, [config?.eventName, eventOptions, slug]);

  const setSample = useCallback((sample: Awaited<ReturnType<typeof getCertificateSample>>) => {
    const parsed = parseScoresData({
      race: {
        title: sample.race.title,
        date_time: sample.race.date_time,
        items: sample.race.items
      },
      scores: sample.scores
    });

    setParticipants(parsed.participants);
    setSampleTitle(parsed.raceTitle);
    setSampleDate(parsed.raceDate);
    setSampleTotal(sample.total);
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError('');

      try {
        const [certificate, list] = await Promise.all([getCertificate(slug), listCertificates()]);

        if (!active) {
          return;
        }

        const row = list.events.find((event) => event.slug === slug) || null;
        const name = row?.name || certificate.config?.eventName || slug;

        setEvents(list.events);
        setEventName(name);

        let date = '';
        let title = '';

        try {
          const sample = await getCertificateSample(slug, 60);

          if (!active) {
            return;
          }

          setSample(sample);
          setSampleMissing(false);
          date = parseScoresData({
            race: { title: sample.race.title, date_time: sample.race.date_time, items: sample.race.items },
            scores: sample.scores
          }).raceDate;
          title = sample.race.title;
        } catch {
          if (!active) {
            return;
          }

          setSampleMissing(true);
        }

        const base =
          certificate.config ??
          emptyCertificateConfig(slug, { eventName: name, eventDate: date, eventTitle: title }, 2480, 1754, null);

        setConfig({
          ...base,
          eventName: base.eventName || name,
          eventDate: base.eventDate || date,
          pdf: { size: base.pdf.size }
        });
        setDirty(false);
      } catch (loadFailure) {
        if (active) {
          setLoadError(errorMessage(loadFailure));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [setSample, slug]);

  // Keep a usable preview participant selected.
  useEffect(() => {
    if (participants.length === 0) {
      return;
    }

    setParticipantId((current) => {
      if (current === FALLBACK_PARTICIPANT.id) {
        return current;
      }

      if (current !== null && participants.some((item) => item.id === current)) {
        return current;
      }

      return participants.reduce((longest, item) => (item.name.length > longest.name.length ? item : longest), participants[0]).id;
    });
  }, [participants]);

  useEffect(() => {
    let active = true;

    setImageError('');

    if (!templateUrl) {
      setImage(null);
      return;
    }

    loadImage(templateUrl)
      .then((loaded) => {
        if (active) {
          setImage(loaded);
        }
      })
      .catch(() => {
        if (active) {
          // Never leave a silent white board: say which file could not load.
          setImage(null);
          setImageError(`Gambar template tidak dapat dimuat: ${templateUrl}`);
        }
      });

    return () => {
      active = false;
    };
  }, [templateUrl]);

  const patchConfig = useCallback((patch: Partial<CertificateConfig>) => {
    setConfig((current) => (current ? { ...current, ...patch } : current));
    setDirty(true);
  }, []);

  const patchField = useCallback(
    (id: string, patch: Partial<CertificateField>) => {
      setConfig((current) =>
        current
          ? { ...current, fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)) }
          : current
      );
      setDirty(true);
    },
    []
  );

  const patchStyle = useCallback((id: string, patch: Partial<CertificateFieldStyle>) => {
    setConfig((current) =>
      current
        ? {
            ...current,
            fields: current.fields.map((field) =>
              field.id === id ? { ...field, style: { ...field.style, ...patch } } : field
            )
          }
        : current
    );
    setDirty(true);
  }, []);

  const moveField = useCallback((id: string, x: number, y: number) => {
    setConfig((current) =>
      current
        ? { ...current, fields: current.fields.map((field) => (field.id === id ? { ...field, x, y } : field)) }
        : current
    );
    setDirty(true);
  }, []);

  const removeField = useCallback(
    (id: string) => {
      setConfig((current) =>
        current ? { ...current, fields: current.fields.filter((field) => field.id !== id) } : current
      );
      setSelectedFieldId((current) => (current === id ? null : current));
      setDirty(true);
    },
    []
  );

  const save = useCallback(async () => {
    if (!config) {
      return;
    }

    setSaving(true);

    try {
      const payload = await saveCertificate(slug, config);
      setConfig(payload.config ?? config);
      setDirty(false);
      toast.success('Tata letak sertifikat disimpan.');
    } catch (saveError) {
      toast.error(errorMessage(saveError));
    } finally {
      setSaving(false);
    }
  }, [config, slug, toast]);

  const upload = useCallback(
    async (file: File) => {
      setUploading(true);

      try {
        const result = await uploadCertificateTemplate(slug, file);
        setConfig(result.config ?? config);
        setSelectedFieldId(null);
        setDirty(false);
        toast.success(`Template ${result.width} x ${result.height} px diunggah.`);
      } catch (uploadError) {
        toast.error(errorMessage(uploadError));
      } finally {
        setUploading(false);

        if (fileInput.current) {
          fileInput.current.value = '';
        }
      }
    },
    [config, slug, toast]
  );

  const removeCertificate = () =>
    confirm({
      title: 'Hapus sertifikat event',
      message: (
        <>
          Hapus template dan seluruh pengaturan sertifikat untuk <strong>{eventName}</strong>? Peserta akan kembali
          diarahkan ke tautan sertifikat lama.
        </>
      ),
      confirmLabel: 'Hapus sertifikat',
      onConfirm: async () => {
        try {
          await deleteCertificate(slug);
          setConfig((current) => (current ? { ...current, fields: [], template: null, enabled: false } : current));
          setImage(null);
          setSelectedFieldId(null);
          setDirty(false);
          toast.success('Sertifikat event dihapus.');
        } catch (deleteError) {
          toast.error(errorMessage(deleteError));
        }
      }
    });

  const applyDefaultLayout = () =>
    confirm({
      title: 'Isi tata letak contoh',
      message: 'Tata letak contoh akan menambahkan field nama, BIB, kategori, waktu, peringkat, dan tanggal. Lanjutkan?',
      confirmLabel: 'Isi tata letak',
      tone: 'primary',
      onConfirm: () => {
        setConfig((current) => (current ? { ...current, fields: defaultLayout(current.width, current.height) } : current));
        setSelectedFieldId(null);
        setDirty(true);
      }
    });

  const addTokenField = (token: CertificateToken) => {
    if (!config) {
      return;
    }

    const field = makeTokenField(
      token,
      config.width / 2,
      config.height / 2,
      styleDefaults(Math.round(config.height * 0.028), {
        font: DEFAULT_CERTIFICATE_BODY_FONT,
        weight: 600,
        color: '#111827',
        // Hidden guardrail: long values shrink instead of running off the card.
        maxWidth: Math.round(config.width * 0.8),
        autoShrink: true
      })
    );

    setConfig({ ...config, fields: [...config.fields, field] });
    setSelectedFieldId(field.id);
    setDirty(true);
  };

  const addTextField = () => {
    if (!config) {
      return;
    }

    const field = makeTextField(
      'TEKS BARU',
      config.width / 2,
      config.height / 2,
      styleDefaults(Math.round(config.height * 0.03), {
        font: DEFAULT_CERTIFICATE_FONT,
        weight: 700,
        color: '#0b4e6e',
        uppercase: true,
        // Same hidden guardrail as token fields.
        maxWidth: Math.round(config.width * 0.8),
        autoShrink: true
      })
    );

    setConfig({ ...config, fields: [...config.fields, field] });
    setSelectedFieldId(field.id);
    setDirty(true);
  };

  const duplicateField = (field: CertificateField) => {
    if (!config) {
      return;
    }

    const copy: CertificateField = {
      ...field,
      id: `${field.id}-c${config.fields.length}`,
      x: Math.min(config.width, field.x + 24),
      y: Math.min(config.height, field.y + 24),
      style: { ...field.style }
    };

    setConfig({ ...config, fields: [...config.fields, copy] });
    setSelectedFieldId(copy.id);
    setDirty(true);
  };

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Sertifikat" subtitle={`Memuat pengaturan untuk ${slug}...`} backTo="/admin/sertifikat" />
        <AdminSkeleton rows={6} />
      </>
    );
  }

  if (loadError || !config) {
    return (
      <>
        <AdminPageHeader title="Sertifikat" subtitle={slug} backTo="/admin/sertifikat" />
        <div className="alert alert-danger py-2" role="alert">
          {loadError || 'Pengaturan sertifikat tidak dapat dimuat.'}
        </div>
      </>
    );
  }

  const selectedFont = selectedField ? findCertificateFont(selectedField.style.font) : null;

  return (
    <>
      <AdminPageHeader
        title={`Sertifikat · ${eventName}`}
        subtitle={`Atur posisi field pada template. Perubahan tersimpan ke results/${slug}/certificate.json.`}
        backTo="/admin/sertifikat"
        actions={
          <>
            <a className="btn btn-light-custom" href={`/results/${encodeURIComponent(slug)}/`} target="_blank" rel="noopener noreferrer">
              <i className="bi bi-box-arrow-up-right me-1" aria-hidden="true" /> Lihat hasil
            </a>
            <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}>
              <i className="bi bi-save me-1" aria-hidden="true" />
              {saving ? 'Menyimpan...' : dirty ? 'Simpan' : 'Tersimpan'}
            </button>
          </>
        }
      />

      {sampleMissing ? (
        <div className="alert alert-warning py-2" role="alert">
          <i className="bi bi-info-circle me-1" aria-hidden="true" />
          <code>results/{slug}/data.json</code> belum tersedia, jadi pratinjau memakai data contoh. Tata letak tetap
          bisa disimpan.
        </div>
      ) : null}

      {imageError ? (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-triangle me-1" aria-hidden="true" />
          {imageError} — pastikan file ada di <code>results/{slug}/</code>, lalu muat ulang halaman ini.
        </div>
      ) : null}

      {!imageError && config.template && config.fields.length === 0 ? (
        <div className="alert alert-info py-2" role="alert">
          <i className="bi bi-info-circle me-1" aria-hidden="true" />
          Template sudah terunggah. Klik <strong>Tata letak contoh</strong> untuk mengisi field, atau tambahkan field satu
          per satu, lalu geser ke posisi yang tepat.
        </div>
      ) : null}

      <div className="rt-cert-admin">
        <div>
          <div className="rt-cert-toolbar">
            <input
              ref={fileInput}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="d-none"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  void upload(file);
                }
              }}
            />
            <button
              className="btn btn-sm btn-primary"
              type="button"
              disabled={uploading}
              onClick={() => fileInput.current?.click()}
            >
              <i className="bi bi-upload me-1" aria-hidden="true" />
              {uploading ? 'Mengunggah...' : config.template ? 'Ganti template' : 'Unggah template'}
            </button>

            <button className="btn btn-sm btn-light-custom" type="button" onClick={applyDefaultLayout}>
              <i className="bi bi-magic me-1" aria-hidden="true" /> Tata letak contoh
            </button>

            <span className="vr d-none d-lg-inline" />

            <label className="small text-slate mb-0" htmlFor="certParticipant">
              Peserta contoh
            </label>
            <select
              id="certParticipant"
              className="form-select form-select-sm"
              value={participant.id}
              onChange={(event) => setParticipantId(Number(event.target.value))}
            >
              <option value={FALLBACK_PARTICIPANT.id}>Data contoh ({FALLBACK_PARTICIPANT.name})</option>
              {participants.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.bib || '-'} · {item.itemName}
                </option>
              ))}
            </select>

            <div className="btn-group btn-group-sm" role="group" aria-label="Zoom" style={{ marginLeft: 'auto' }}>
              <button className="btn btn-light-custom" type="button" onClick={() => setZoom((value) => Math.max(0.4, Number((value - 0.15).toFixed(2))))}>
                <i className="bi bi-dash-lg" aria-hidden="true" />
              </button>
              <button className="btn btn-light-custom" type="button" onClick={() => setZoom(1)}>
                {Math.round(zoom * 100)}%
              </button>
              <button className="btn btn-light-custom" type="button" onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.15).toFixed(2))))}>
                <i className="bi bi-plus-lg" aria-hidden="true" />
              </button>
            </div>
          </div>

          <CertificateBoard
            config={config}
            image={image}
            participant={participant}
            meta={meta}
            selectedId={selectedFieldId}
            zoom={zoom}
            onSelect={setSelectedFieldId}
            onMove={moveField}
            onDelete={removeField}
            onSaveShortcut={() => {
              if (dirty) {
                void save();
              }
            }}
          />

          <p className="rt-cert-hint">
            Geser kotak untuk memindahkan field. Panah = 1 px, Shift + panah = 10 px, Delete = hapus field, Ctrl/Cmd + S
            = simpan. Kotak bergaris merah berarti token itu kosong untuk peserta contoh yang dipilih (tidak akan
            tercetak). {sampleTotal > 0 ? `${sampleTotal} peserta pada data hasil.` : ''}
          </p>
        </div>

        <div>
          <FormSection title="Field sertifikat" description="Pilih field untuk mengatur posisi dan gayanya.">
            <div className="rt-cert-fieldlist">
              {config.fields.length === 0 ? (
                <p className="rt-cert-hint">Belum ada field. Tambahkan dari daftar token di bawah.</p>
              ) : (
                config.fields.map((field) => (
                  <button
                    key={field.id}
                    type="button"
                    className={`rt-cert-fielditem${field.id === selectedFieldId ? ' is-active' : ''}`}
                    onClick={() => setSelectedFieldId(field.id)}
                  >
                    <i className={`bi ${field.type === 'text' ? 'bi-fonts' : 'bi-tag'} me-1`} aria-hidden="true" />
                    <span className="text-truncate">{fieldLabel(field)}</span>
                  </button>
                ))
              )}
            </div>

            <div className="d-flex gap-2">
              <select
                className="form-select form-select-sm"
                value=""
                aria-label="Tambah field token"
                onChange={(event) => {
                  if (event.target.value) {
                    addTokenField(event.target.value as CertificateToken);
                  }
                }}
              >
                <option value="">+ Tambah token…</option>
                {CERTIFICATE_TOKENS.map((token) => (
                  <option key={token.id} value={token.id}>
                    {token.label}
                  </option>
                ))}
              </select>
              <button className="btn btn-sm btn-light-custom text-nowrap" type="button" onClick={addTextField}>
                <i className="bi bi-fonts me-1" aria-hidden="true" /> Teks
              </button>
            </div>
          </FormSection>

          {selectedField && selectedFont ? (
            <FormSection title="Pengaturan field">
              {selectedField.type === 'token' ? (
                <div className="mb-3">
                  <label className="form-label" htmlFor="fieldToken">
                    Token
                  </label>
                  <select
                    id="fieldToken"
                    className="form-select form-select-sm"
                    value={selectedField.token ?? 'name'}
                    onChange={(event) => patchField(selectedField.id, { token: event.target.value as CertificateToken })}
                  >
                    {CERTIFICATE_TOKENS.map((token) => (
                      <option key={token.id} value={token.id}>
                        {token.label}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="mb-3">
                  <label className="form-label" htmlFor="fieldText">
                    Teks statis
                  </label>
                  <textarea
                    id="fieldText"
                    className="form-control form-control-sm"
                    rows={2}
                    value={selectedField.text ?? ''}
                    onChange={(event) => patchField(selectedField.id, { text: event.target.value })}
                  />
                  <p className="rt-cert-hint">Enter membuat baris baru.</p>
                </div>
              )}

              <div className="rt-cert-grid2 mb-3">
                <div>
                  <label className="form-label" htmlFor="fieldFont">
                    Font
                  </label>
                  <select
                    id="fieldFont"
                    className="form-select form-select-sm"
                    value={selectedField.style.font}
                    onChange={(event) => {
                      const next = findCertificateFont(event.target.value);
                      patchStyle(selectedField.id, {
                        font: next.id,
                        weight: next.weights.includes(selectedField.style.weight) ? selectedField.style.weight : next.weights[0],
                        italic: next.italic ? selectedField.style.italic : false
                      });
                    }}
                  >
                    <optgroup label="Bundled (selalu tersedia)">
                      {CERTIFICATE_FONTS.filter((font) => font.bundled).map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Font sistem">
                      {CERTIFICATE_FONTS.filter((font) => !font.bundled).map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div>
                  <label className="form-label" htmlFor="fieldWeight">
                    Ketebalan
                  </label>
                  <select
                    id="fieldWeight"
                    className="form-select form-select-sm"
                    value={selectedField.style.weight}
                    onChange={(event) => patchStyle(selectedField.id, { weight: Number(event.target.value) })}
                  >
                    {selectedFont.weights.map((weight) => (
                      <option key={weight} value={weight}>
                        {weight}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label" htmlFor="fieldSize">
                  Ukuran: {selectedField.style.size} px (pada resolusi template)
                </label>
                <div className="d-flex align-items-center gap-2">
                  <input
                    id="fieldSize"
                    type="range"
                    className="form-range"
                    min={8}
                    max={Math.max(80, Math.round(config.height * 0.25))}
                    step={1}
                    value={selectedField.style.size}
                    onChange={(event) => patchStyle(selectedField.id, { size: Number(event.target.value) })}
                  />
                  <input
                    className="form-control form-control-sm"
                    style={{ width: 88 }}
                    type="number"
                    min={6}
                    max={600}
                    value={selectedField.style.size}
                    aria-label="Ukuran font"
                    onChange={(event) => patchStyle(selectedField.id, { size: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="rt-cert-grid2 mb-3">
                <div>
                  <label className="form-label" htmlFor="fieldColor">
                    Warna
                  </label>
                  <div className="rt-cert-swatch">
                    <input
                      id="fieldColor"
                      type="color"
                      value={/^#[0-9a-f]{6}$/i.test(selectedField.style.color) ? selectedField.style.color : '#111827'}
                      onChange={(event) => patchStyle(selectedField.id, { color: event.target.value })}
                    />
                    <input
                      className="form-control form-control-sm"
                      value={selectedField.style.color}
                      aria-label="Kode warna"
                      onChange={(event) => patchStyle(selectedField.id, { color: event.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="fieldRotation">
                    Rotasi (derajat)
                  </label>
                  <input
                    id="fieldRotation"
                    className="form-control form-control-sm"
                    type="number"
                    min={-180}
                    max={180}
                    value={selectedField.style.rotation}
                    onChange={(event) => patchStyle(selectedField.id, { rotation: Number(event.target.value) })}
                  />
                </div>
              </div>

              <div className="d-flex flex-wrap gap-3 mb-3">
                <div className="form-check">
                  <input
                    id="fieldUppercase"
                    className="form-check-input"
                    type="checkbox"
                    checked={selectedField.style.uppercase}
                    onChange={(event) => patchStyle(selectedField.id, { uppercase: event.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="fieldUppercase">
                    HURUF BESAR
                  </label>
                </div>
                <div className="form-check">
                  <input
                    id="fieldItalic"
                    className="form-check-input"
                    type="checkbox"
                    checked={selectedField.style.italic}
                    disabled={!selectedFont.italic}
                    onChange={(event) => patchStyle(selectedField.id, { italic: event.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="fieldItalic">
                    Miring
                  </label>
                </div>
                <div className="form-check">
                  <input
                    id="fieldShrink"
                    className="form-check-input"
                    type="checkbox"
                    checked={selectedField.style.autoShrink}
                    onChange={(event) => patchStyle(selectedField.id, { autoShrink: event.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="fieldShrink" title="Kecilkan font otomatis bila teks terlalu lebar">
                    Auto shrink
                  </label>
                </div>
              </div>

              <div className="d-flex gap-2 mt-3">
                <button className="btn btn-sm btn-light-custom" type="button" onClick={() => duplicateField(selectedField)}>
                  <i className="bi bi-copy me-1" aria-hidden="true" /> Duplikat
                </button>
                <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removeField(selectedField.id)}>
                  <i className="bi bi-trash3 me-1" aria-hidden="true" /> Hapus field
                </button>
              </div>
            </FormSection>
          ) : (
            <FormSection title="Pengaturan field">
              <p className="rt-cert-hint">Pilih field pada daftar atau klik kotaknya di kanvas untuk mengatur font, warna, ukuran, dan posisi.</p>
            </FormSection>
          )}

          <FormSection title="Publikasi & output">
            <div className="form-check form-switch mb-2">
              <input
                id="certEnabled"
                className="form-check-input"
                type="checkbox"
                checked={config.enabled}
                onChange={(event) => patchConfig({ enabled: event.target.checked })}
              />
              <label className="form-check-label" htmlFor="certEnabled">
                Aktifkan sertifikat di halaman hasil
              </label>
            </div>
            <div className="form-check form-switch mb-3">
              <input
                id="certFinishers"
                className="form-check-input"
                type="checkbox"
                checked={config.onlyFinishers}
                onChange={(event) => patchConfig({ onlyFinishers: event.target.checked })}
              />
              <label className="form-check-label" htmlFor="certFinishers">
                Hanya peserta finisher
              </label>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="certEventName">
                Nama event pada token
              </label>
              <select
                id="certEventName"
                className="form-select form-select-sm"
                value={selectedEventSlug}
                onChange={(event) => {
                  const option = eventOptions.find((item) => item.slug === event.target.value);
                  patchConfig({ eventName: option ? option.name : eventName });
                }}
              >
                {eventOptions.map((option) => (
                  <option key={option.slug} value={option.slug}>
                    {option.name}
                  </option>
                ))}
              </select>
              <p className="rt-cert-hint">
                Dipakai oleh token <code>eventName</code> (dan <code>eventTitle</code> bila data hasil tidak memuat
                judul).
              </p>
            </div>

            <div className="mb-3">
              <label className="form-label" htmlFor="certPdfSize">
                Ukuran halaman PDF
              </label>
              <select
                id="certPdfSize"
                className="form-select form-select-sm"
                value={config.pdf.size}
                onChange={(event) => patchConfig({ pdf: { size: event.target.value as CertificateConfig['pdf']['size'] } })}
              >
                <option value="template">Ikuti rasio template</option>
                <option value="a4">A4</option>
                <option value="a3">A3</option>
                <option value="letter">Letter</option>
              </select>
              <p className="rt-cert-hint">
                Orientasi halaman otomatis mengikuti artwork ({config.width} x {config.height} px), jadi tidak ada
                pengaturan terpisah yang bisa bentrok.
              </p>
            </div>

            <p className="rt-cert-hint">
              Template: {config.template ? <code>{config.template}</code> : <em>belum ada</em>} · {config.width} x{' '}
              {config.height} px
            </p>

            <div className="rt-adm-form-actions">
              <button className="btn btn-primary" type="button" onClick={() => void save()} disabled={saving || !dirty}>
                <i className="bi bi-save me-1" aria-hidden="true" />
                {saving ? 'Menyimpan...' : dirty ? 'Simpan pengaturan' : 'Tersimpan'}
              </button>
              <button className="btn btn-outline-danger" type="button" onClick={removeCertificate}>
                <i className="bi bi-trash3 me-1" aria-hidden="true" /> Hapus sertifikat event
              </button>
            </div>
          </FormSection>
        </div>
      </div>

      {dialog}
    </>
  );
}
