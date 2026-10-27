import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmptyBox, ErrorBox, Loading } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { digitsOnly, formatDate, formatDecimal, formatNumber } from '../lib/format';
import { extractWords, photoMatches, pickBibFromText, pickBibFromWords } from '../lib/bib';
import { asset } from '../payload';
import type { Photo, PhotoEventPayload } from '../types';

interface OcrCacheEntry {
  bib: string;
  text: string;
  confidence: number;
  scanned_at: number;
}

type StatusTone = '' | 'is-busy' | 'is-success' | 'is-error';

interface WorkerLike {
  recognize: (source: string | File) => Promise<{ data: any }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
}

function readCache(slug: string): Record<string, OcrCacheEntry> {
  try {
    return JSON.parse(window.localStorage.getItem(`racetap-photos-ocr:v1:${slug}`) || '{}') || {};
  } catch {
    return {};
  }
}

function writeCache(slug: string, cache: Record<string, OcrCacheEntry>): void {
  try {
    window.localStorage.setItem(`racetap-photos-ocr:v1:${slug}`, JSON.stringify(cache));
  } catch {
    // Storage can be full or blocked; search still works in this session.
  }
}

async function createOcrWorker(logger?: (message: any) => void): Promise<WorkerLike> {
  const module = await import('tesseract.js');
  const factory = module.createWorker as unknown as (
    lang: string,
    oem: number,
    options?: { logger?: (message: any) => void }
  ) => Promise<WorkerLike>;

  const worker = await factory('eng', 1, logger ? { logger } : undefined);

  try {
    await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
  } catch {
    // Parameter is optional; continue without the whitelist.
  }

  return worker;
}

export default function PhotoEvent() {
  const { slug = '' } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data, loading, error, reload } = useApi<PhotoEventPayload>(slug ? `/photos/events/${encodeURIComponent(slug)}` : null);

  const [query, setQuery] = useState(() => digitsOnly(searchParams.get('bib')));
  const [cache, setCache] = useState<Record<string, OcrCacheEntry>>({});
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState<{ percent: number; label: string } | null>(null);
  const [status, setStatus] = useState<{ text: string; tone: StatusTone }>({ text: '', tone: '' });
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCache(readCache(slug));
  }, [slug]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const digits = digitsOnly(query);

    if (digits) {
      next.set('bib', digits);
    } else {
      next.delete('bib');
    }

    const serialized = next.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${serialized ? `?${serialized}` : ''}`);
  }, [query, searchParams]);

  useEffect(() => {
    if (!activePhoto) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActivePhoto(null);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [activePhoto]);

  const photos = data?.photos || [];
  const event = data?.event || null;

  const effectiveBib = useCallback(
    (photo: Photo) => {
      const live = cache[photo.id];
      return live && live.bib ? live.bib : '';
    },
    [cache]
  );

  const filtered = useMemo(() => {
    const digits = digitsOnly(query);

    if (!digits) {
      return photos;
    }

    return photos.filter((photo) => {
      const live = cache[photo.id];
      return photoMatches(photo, digits) || (live ? digitsOnly(live.bib).includes(digits) : false);
    });
  }, [photos, query, cache]);

  const applyScanResults = (nextCache: Record<string, OcrCacheEntry>) => {
    setCache(nextCache);
    writeCache(slug, nextCache);
  };

  const scanAll = async () => {
    if (scanning || photos.length === 0) {
      return;
    }

    setScanning(true);
    setProgress({ percent: 2, label: 'Menyiapkan OCR...' });
    setStatus({ text: 'Mengunduh model OCR dan memindai nomor dada pada foto...', tone: 'is-busy' });

    const nextCache = { ...cache };
    const total = photos.length;
    let done = 0;
    let worker: WorkerLike | null = null;

    try {
      worker = await createOcrWorker();

      for (const photo of photos) {
        const src = asset(photo.file);
        setProgress({ percent: Math.round((done / total) * 100), label: `Memindai foto ${done + 1}/${total}...` });

        try {
          const result = await worker.recognize(src);
          const payload = result.data || {};
          const words = extractWords(payload);
          const picked = words.length > 0 ? pickBibFromWords(words) : pickBibFromText(String(payload.text || ''));

          if (picked.bib) {
            nextCache[photo.id] = {
              bib: picked.bib,
              text: picked.tokens.join(' '),
              confidence: Number(payload.confidence || 0),
              scanned_at: Date.now()
            };
          }
        } catch (scanError) {
          console.error('OCR gagal untuk foto ' + photo.id, scanError);
        }

        done += 1;
        setProgress({ percent: Math.round((done / total) * 100), label: `Selesai ${done}/${total}` });
      }

      applyScanResults(nextCache);
      setStatus({ text: `OCR selesai. ${Object.keys(nextCache).length} foto memiliki indeks BIB. Pencarian memakai hasil OCR terbaru.`, tone: 'is-success' });
    } catch (scanError) {
      setStatus({
        text: scanError instanceof Error ? scanError.message : 'OCR gagal dijalankan.',
        tone: 'is-error'
      });
    } finally {
      if (worker) {
        await worker.terminate().catch(() => undefined);
      }

      setScanning(false);
      setProgress(null);
    }
  };

  const readUploadedBib = async (file: File | undefined) => {
    if (!file) {
      return;
    }

    setStatus({ text: 'Membaca nomor dada dari foto BIB...', tone: 'is-busy' });
    setProgress({ percent: 10, label: 'Membaca foto BIB...' });

    let worker: WorkerLike | null = null;

    try {
      worker = await createOcrWorker();
      const result = await worker.recognize(file);
      const payload = result.data || {};
      const words = extractWords(payload);
      const picked = words.length > 0 ? pickBibFromWords(words) : pickBibFromText(String(payload.text || ''));

      if (picked.bib) {
        setQuery(picked.bib);
        setStatus({ text: `Nomor dada ${picked.bib} terbaca dari foto.`, tone: 'is-success' });
      } else {
        setStatus({ text: 'Nomor dada tidak terbaca. Coba foto yang lebih jelas atau ketik manual.', tone: 'is-error' });
      }
    } catch {
      setStatus({ text: 'Gagal membaca foto BIB. Coba lagi dengan foto yang lebih jelas.', tone: 'is-error' });
    } finally {
      if (worker) {
        await worker.terminate().catch(() => undefined);
      }

      setProgress(null);

      if (fileInput.current) {
        fileInput.current.value = '';
      }
    }
  };

  const reset = () => {
    setQuery('');
    setSearchParams({}, { replace: true });
  };

  if (loading && !data) {
    return (
      <section className="section">
        <div className="container">
          <Loading label="Memuat foto event..." />
        </div>
      </section>
    );
  }

  if (!loading && error) {
    return (
      <section className="section">
        <div className="container">
          <ErrorBox message={error} onRetry={reload} />
        </div>
      </section>
    );
  }

  if (!event) {
    return null;
  }

  const ocrIndexed = event.ocr_indexed;
  const displayCount = digitsOnly(query) === '' ? photos.length : filtered.length;

  return (
    <>
      <header className="page-header photo-page-header">
        <div className="container">
          <h1 className="mb-3">{event.name}</h1>
          <div className="breadcrumb-custom">
            <a href="/v2">Home</a> <span>/</span> <a href="/v2/photos">Photos</a> <span>/</span>
            <span className="active">{event.name}</span>
          </div>
          <div className="photo-hero-meta">
            <span className="photo-hero-chip">
              <i className="bi bi-geo-alt" /> {event.location}
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-calendar3" /> {formatDate(event.event_date)}
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-images" /> {formatNumber(event.photo_count)} Foto
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-upc-scan" /> {formatNumber(event.bib_count)} BIB
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-cpu" /> {formatNumber(ocrIndexed)} OCR indexed
            </span>
          </div>
        </div>
      </header>

      <section className="section pb-0">
        <div className="container">
          <div className="photo-toolbar">
            <div className="row g-4 align-items-center">
              <div className="col-lg-4">
                <span className="eyebrow">Photo Search</span>
                <h2 className="section-title h3 mb-2">Cari foto dengan nomor dada</h2>
                <p className="mb-0 text-slate">
                  Ketik nomor dada (BIB) atau unggah foto BIB Anda. Sistem mencocokkan nomor hasil OCR dengan indeks foto
                  event ini.
                </p>
              </div>
              <div className="col-lg-8">
                <form
                  className="photo-search-form"
                  onSubmit={(submitEvent) => submitEvent.preventDefault()}
                >
                  <div className="photo-search-input">
                    <i className="bi bi-upc-scan" />
                    <input
                      type="search"
                      inputMode="numeric"
                      autoComplete="off"
                      value={query}
                      placeholder="Masukkan nomor dada, contoh: 1024"
                      aria-label="Nomor dada"
                      onChange={(changeEvent) => setQuery(digitsOnly(changeEvent.target.value).slice(0, 12))}
                    />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    <i className="bi bi-search me-1" /> Cari Foto
                  </button>
                  <button className="btn btn-light-custom" type="button" onClick={scanAll} disabled={scanning}>
                    {scanning ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true" /> Memindai...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-magic me-1" /> Scan OCR
                      </>
                    )}
                  </button>
                  <button className="btn btn-light-custom" type="button" onClick={() => fileInput.current?.click()}>
                    <i className="bi bi-camera me-1" /> BIB dari Foto
                  </button>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="d-none"
                    onChange={(changeEvent) => readUploadedBib(changeEvent.target.files?.[0])}
                  />
                  <button className="btn btn-light-custom" type="button" onClick={reset}>
                    <i className="bi bi-arrow-counterclockwise me-1" /> Reset
                  </button>
                </form>

                <div className="ocr-panel">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="badge-soft">
                      <i className="bi bi-cpu me-1" /> OCR Engine: Tesseract.js + Google Vision
                    </span>
                    <span className={`ocr-status${status.tone ? ` ${status.tone}` : ''}`}>
                      {status.text || `Indeks OCR siap untuk ${formatNumber(ocrIndexed)} foto. Klik "Scan OCR" untuk memindai ulang nomor dada di browser.`}
                    </span>
                  </div>
                  {progress && (
                    <div className="progress ocr-progress mt-2">
                      <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${progress.percent}%` }}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress.percent}
                      >
                        {progress.label}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="photo-result-bar">
            <p className="mb-0 text-slate">
              {digitsOnly(query) === ''
                ? `Menampilkan ${formatNumber(photos.length)} foto`
                : filtered.length > 0
                  ? `Ditemukan ${formatNumber(filtered.length)} foto untuk nomor dada ${digitsOnly(query)}`
                  : `Tidak ada foto untuk nomor dada ${digitsOnly(query)}`}
            </p>
            <span className="badge-soft">
              <i className="bi bi-images me-1" /> {formatNumber(displayCount)} foto <span className="text-slate">/</span>{' '}
              {formatNumber(event.bib_count)} BIB
            </span>
          </div>

          {filtered.length === 0 ? (
            <EmptyBox
              icon="bi-search"
              title="Tidak ada foto yang cocok"
              description="Coba scan OCR ulang, unggah foto BIB yang lebih jelas, atau pastikan nomor dada yang dimasukkan benar."
            />
          ) : (
            <div className="row g-4">
              {filtered.map((photo) => (
                <div className="col-sm-6 col-lg-4" key={photo.id}>
                  <article className="photo-card">
                    <button type="button" className="photo-thumb" onClick={() => setActivePhoto(photo)}>
                      <img
                        src={asset(photo.file)}
                        alt={`Foto BIB ${photo.bib} - ${event.name}`}
                        loading="lazy"
                      />
                      <span className="photo-bib-badge">BIB {photo.bib}</span>
                      <span className="photo-zoom">
                        <i className="bi bi-arrows-fullscreen" />
                      </span>
                    </button>
                    <div className="photo-card-body">
                      <div className="photo-card-info">
                        <span className="photo-time">
                          <i className="bi bi-clock" /> {photo.captured_at}
                        </span>
                        <span className="photo-cat">{photo.category}</span>
                      </div>
                      <div className="photo-card-footer">
                        <span className={`ocr-badge${effectiveBib(photo) ? ' is-live' : ''}`}>
                          <i className="bi bi-upc-scan" /> OCR {formatDecimal(photo.ocr_confidence)}%
                        </span>
                        <a
                          className="photo-download"
                          href={asset(photo.file)}
                          download={`bib-${photo.bib}.jpg`}
                          title="Download foto"
                        >
                          <i className="bi bi-download" />
                        </a>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {activePhoto && (
        <div
          className="rt-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`Foto BIB ${activePhoto.bib}`}
          onClick={(clickEvent) => {
            if (clickEvent.target === clickEvent.currentTarget) {
              setActivePhoto(null);
            }
          }}
        >
          <div className="rt-modal">
            <div className="rt-modal-header">
              <h5 className="mb-0">
                BIB {activePhoto.bib} &mdash; {event.name}
              </h5>
              <button type="button" className="btn-close" aria-label="Tutup" onClick={() => setActivePhoto(null)} />
            </div>
            <div className="rt-modal-body">
              <img src={asset(activePhoto.file)} alt={`Foto BIB ${activePhoto.bib}`} />
            </div>
            <div className="rt-modal-footer">
              <span className="text-slate">
                {[activePhoto.category, activePhoto.captured_at].filter(Boolean).join(' · ')}
              </span>
              <a
                className="btn btn-primary btn-sm-custom"
                href={asset(activePhoto.file)}
                download={`bib-${activePhoto.bib}.jpg`}
              >
                <i className="bi bi-download me-1" /> Download Foto
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
