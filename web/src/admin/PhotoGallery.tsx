import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Modal } from '../components/Modal';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { formatNumber } from '../lib/format';
import { DEFAULT_OCR_RULE } from '../lib/bib';
import { publicUrl } from '../payload';
import {
  createPhotoOcrWorker,
  prepareImageForOcr,
  readPhotoOcrResult,
  type OcrLogMessage,
  type PhotoOcrWorker
} from '../lib/tesseractOcr';
import {
  ActionGroup,
  AdminEmpty,
  AdminError,
  AdminPageHeader,
  AdminSkeleton,
  SearchField,
  useConfirm
} from './AdminUI';
import type {
  OcrBatchResponse,
  OcrModeInfo,
  OcrPhotoResponse,
  OcrSubmitResponse,
  Photo,
  PhotoEventDetail,
  UploadResponse
} from '../types';

type Filter = 'all' | 'with-bib' | 'no-bib' | 'ocr-pending';

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'with-bib', label: 'Punya BIB' },
  { value: 'no-bib', label: 'Tanpa BIB' },
  { value: 'ocr-pending', label: 'OCR pending' }
];

const FALLBACK_MODE: OcrModeInfo = {
  mode: 'browser',
  engine: 'tesseract',
  label: 'Tesseract (browser)',
  available: {}
};

interface OcrRun {
  running: boolean;
  mode: 'server' | 'browser';
  engine: string;
  label: string;
  total: number;
  done: number;
  fileProgress: number;
  currentFile: string;
  stage: string;
  startedAt: number;
  cancelled: boolean;
  indexed: number;
  multi: number;
  errors: number;
}

interface LightboxState {
  photo: Photo;
  bibs: string[];
  newBib: string;
}

export default function AdminPhotoGallery() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useApi<PhotoEventDetail>(id ? `/admin/photos/events/${id}` : null);
  const toast = useToast();
  const { confirm, dialog } = useConfirm();

  const [files, setFiles] = useState<FileList | null>(null);
  const [filePreviews, setFilePreviews] = useState<Array<{ name: string; url: string }>>([]);
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [selected, setSelected] = useState<Record<number, true>>({});
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const [ocrRun, setOcrRun] = useState<OcrRun | null>(null);
  const [, setTick] = useState(0);
  const dropRef = useRef<HTMLDivElement | null>(null);
  const cancelRef = useRef(false);
  const workerRef = useRef<PhotoOcrWorker | null>(null);

  const mode: OcrModeInfo = data?.ocr ?? FALLBACK_MODE;
  const ocrRule = data?.ocr_rule ?? DEFAULT_OCR_RULE;
  const knownBibs = data?.known_bibs ?? [];

  useEffect(() => {
    if (ocrRun?.running) {
      const timer = window.setInterval(() => setTick((value) => value + 1), 1000);
      return () => window.clearInterval(timer);
    }

    return undefined;
  }, [ocrRun?.running]);

  useEffect(() => {
    if (!files || files.length === 0) {
      setFilePreviews([]);
      return undefined;
    }

    const previews = Array.from(files).map((file) => ({ name: file.name, url: URL.createObjectURL(file) }));
    setFilePreviews(previews);

    return () => {
      previews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [files]);

  const visible = useMemo(() => {
    const photos = data?.photos ?? [];
    const term = search.trim().toLowerCase();

    return photos.filter((photo) => {
      if (filter === 'with-bib' && !photo.bib) return false;
      if (filter === 'no-bib' && photo.bib) return false;
      if (filter === 'ocr-pending' && photo.ocr_indexed_at) return false;

      if (term === '') {
        return true;
      }

      return (
        String(photo.bib).toLowerCase().includes(term) ||
        String(photo.ocr_text).toLowerCase().includes(term) ||
        String(photo.category).toLowerCase().includes(term) ||
        (photo.bibs || []).some((bib) => String(bib).toLowerCase().includes(term))
      );
    });
  }, [data, filter, search]);

  const selectedIds = Object.keys(selected).map(Number);

  const upload = async () => {
    if (!files || files.length === 0) {
      setProblem('Pilih minimal satu foto.');
      return;
    }

    setBusy(true);
    setProblem('');

    try {
      const payload = new FormData();

      Array.from(files).forEach((file) => payload.append('files[]', file));

      const result = await api<UploadResponse>(`/admin/photos/events/${id}/photos`, { method: 'POST', form: payload });

      toast.success(`${result.created} foto diunggah.`);

      if (result.errors.length) {
        setProblem(result.errors.join(' | '));
      }

      setFiles(null);
      reload();

      if (result.created > 0 && result.photos && result.photos.length > 0) {
        void startOcr(false, result.photos);
      }
    } catch (uploadError) {
      setProblem(errorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  };

  const startOcr = async (force: boolean, subset?: Photo[]) => {
    if (ocrRun?.running) {
      return;
    }

    const queue = (subset || (data?.photos ?? [])).filter((photo) => force || !photo.ocr_indexed_at);

    if (queue.length === 0) {
      toast.info('Semua foto sudah terindeks. Gunakan "Scan ulang" untuk memaksa pemindaian ulang.');
      return;
    }

    cancelRef.current = false;

    setOcrRun({
      running: true,
      mode: mode.mode,
      engine: mode.engine,
      label: mode.label,
      total: queue.length,
      done: 0,
      fileProgress: 0,
      currentFile: '',
      stage: mode.mode === 'server' ? 'Memulai batch server...' : 'Memuat mesin OCR...',
      startedAt: Date.now(),
      cancelled: false,
      indexed: 0,
      multi: 0,
      errors: 0
    });

    setOcrBusy(true);

    try {
      if (mode.mode === 'server') {
        if (subset) {
          await runServerPhotoScan(queue);
        } else {
          await runServerScan(force, queue.length);
        }
      } else {
        await runBrowserScan(queue);
      }
    } catch (scanError) {
      toast.error(errorMessage(scanError));
    } finally {
      workerRef.current = null;
      setOcrBusy(false);
      setOcrRun((previous) =>
        previous
          ? {
              ...previous,
              running: false,
              fileProgress: 0,
              stage: cancelRef.current ? 'Dibatalkan' : 'Selesai',
              currentFile: ''
            }
          : previous
      );

      if (queue.length > 0) {
        reload();
      }
    }
  };

  /**
   * Server-side scan. `force` must reach the endpoint: without it the server
   * keeps returning the first batch (the endpoint never marks a photo indexed
   * in force mode), which made "Scan ulang" loop forever.
   *
   * Two independent stop conditions guard against that regressing:
   *   - and empty batch ends the loop;
   *   - a two-strike check on `remaining` ends it even if the server keeps
   *     reporting progress, so a stuck scan can never spin indefinitely.
   */
  const runServerScan = async (force: boolean, total: number) => {
    let done = 0;
    let indexed = 0;
    let multi = 0;
    let errors = 0;
    let batch = 1;
    // Force mode re-reads the same rows, so the client walks the event with a
    // cursor (`seen`) and ends when the server reports an empty slice.
    let seen = 0;
    let lastRemaining = Number.POSITIVE_INFINITY;
    let stalled = 0;
    const ceiling = force ? total : Number.POSITIVE_INFINITY;

    while (!cancelRef.current) {
      const result = await api<OcrBatchResponse>(`/admin/photos/events/${id}/ocr`, {
        method: 'POST',
        body: { force, seen }
      });

      done += result.processed;
      indexed += result.indexed;
      multi += result.multi;
      errors += result.errors.length;
      seen = typeof result.seen === 'number' && result.seen > seen ? result.seen : seen + result.processed;

      const remaining = Math.max(0, Number(result.remaining) || 0);

      if (remaining >= lastRemaining) {
        stalled += 1;
      } else {
        stalled = 0;
      }

      lastRemaining = remaining;

      setOcrRun((previous) =>
        previous
          ? {
              ...previous,
              done: Math.min(done, ceiling),
              indexed,
              multi,
              errors,
              total: ceiling,
              fileProgress: 0,
              stage: `Batch ${batch} · ${result.label || previous.label}`
            }
          : previous
      );

      batch += 1;

      // An empty slice is the definitive end of the queue in both modes.
      if (result.processed === 0 || seen >= total || remaining === 0) {
        break;
      }

      // Safety net: never spin if the server stops making progress.
      if (stalled >= 3) {
        toast.error('Pemindaian dihentikan: server tidak mengurangi sisa foto. Periksa layanan OCR lalu coba lagi.');
        break;
      }
    }

    if (indexed > 0) {
      toast.success(`OCR selesai. ${indexed} BIB terindeks${multi > 0 ? ` · ${multi} multi-BIB` : ''}.`);
    } else if (errors > 0 && done > 0) {
      toast.error(`${done} foto diproses, ${errors} error.`);
    }
  };

  const runServerPhotoScan = async (photos: Photo[]) => {
    let done = 0;
    let indexed = 0;
    let multi = 0;
    let errors = 0;

    for (const photo of photos) {
      if (cancelRef.current) {
        break;
      }

      setOcrRun((previous) =>
        previous
          ? {
              ...previous,
              currentFile: photo.file.split('/').pop() || '',
              stage: `Memproses ${done + 1}/${photos.length}`
            }
          : previous
      );

      try {
        const result = await api<OcrPhotoResponse>(`/admin/photos/photos/${photo.id}/ocr`, { method: 'POST' });
        const bibs = result.result.bibs || [];

        done += 1;
        indexed += bibs.length > 0 ? 1 : 0;
        multi += bibs.length > 1 ? 1 : 0;
      } catch {
        done += 1;
        errors += 1;
      }

      setOcrRun((previous) => (previous ? { ...previous, done, indexed, multi, errors } : previous));
    }

    if (indexed > 0) {
      toast.success(`OCR selesai. ${indexed} BIB terindeks${multi > 0 ? ` · ${multi} multi-BIB` : ''}.`);
    } else if (errors > 0 && done > 0) {
      toast.error(`${done} foto diproses, ${errors} error.`);
    }
  };

  const runBrowserScan = async (photos: Photo[]) => {
    setOcrRun((previous) => (previous ? { ...previous, stage: 'Memuat model Tesseract...' } : previous));

    const worker = await createPhotoOcrWorker(({ status, progress }: OcrLogMessage) => {
      setOcrRun((previous) =>
        previous
          ? {
              ...previous,
              stage: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Membaca',
              fileProgress: progress
            }
          : previous
      );
    }, ocrRule);

    workerRef.current = worker;

    let done = 0;
    let indexed = 0;
    let multi = 0;
    let errors = 0;

    for (const photo of photos) {
      if (cancelRef.current) {
        break;
      }

      setOcrRun((previous) =>
        previous
          ? { ...previous, currentFile: photo.file.split('/').pop() || '', stage: 'Membaca teks', fileProgress: 0 }
          : previous
      );

      await new Promise((resolve) => setTimeout(resolve, 0));

      try {
        const source = await prepareImageForOcr(publicUrl(photo.file));
        const raw = await worker.recognize(source);
        const result = readPhotoOcrResult(raw.data, ocrRule, knownBibs);

        const saved = await api<OcrSubmitResponse>(`/admin/photos/photos/${photo.id}/ocr-result`, {
          method: 'POST',
          body: {
            engine: 'tesseract',
            text: result.text,
            confidence: result.confidence,
            words: result.words
          }
        });

        done += 1;
        indexed += saved.result.bibs.length > 0 ? 1 : 0;
        multi += saved.result.bibs.length > 1 ? 1 : 0;

        setOcrRun((previous) =>
          previous ? { ...previous, done, indexed, multi, fileProgress: 1 } : previous
        );
      } catch (scanError) {
        errors += 1;
        console.warn('OCR gagal untuk foto ' + photo.id, scanError);
        setOcrRun((previous) => (previous ? { ...previous, done: previous.done + 1, errors } : previous));
      }
    }

    await worker.terminate().catch(() => undefined);
    workerRef.current = null;

    if (indexed > 0) {
      toast.success(`OCR selesai. ${indexed} BIB terindeks${multi > 0 ? ` · ${multi} multi-BIB` : ''}.`);
    } else if (errors > 0 && done > 0) {
      toast.error(`${done} foto diproses, ${errors} error.`);
    }
  };

  const cancelOcr = () => {
    cancelRef.current = true;
    workerRef.current?.terminate().catch(() => undefined);
    setOcrRun((previous) => (previous ? { ...previous, stage: 'Menghentikan...' } : previous));
  };

  const ocrPercent = (() => {
    if (!ocrRun || ocrRun.total <= 0) {
      return 0;
    }

    // Guard against a runaway counter so the bar reflects real progress.
    const processed = Math.min(ocrRun.done, ocrRun.total);
    const ratio = (processed + (ocrRun.running ? ocrRun.fileProgress : 0)) / ocrRun.total;

    return Math.min(100, Math.round(ratio * 100));
  })();

  const ocrElapsed = ocrRun ? Math.max(0, Math.round((Date.now() - ocrRun.startedAt) / 1000)) : 0;

  const removePhoto = (photoId: number) =>
    confirm({
      title: 'Hapus foto',
      message: 'Foto ini akan dihapus permanen. Lanjutkan?',
      confirmLabel: 'Hapus foto',
      onConfirm: async () => {
        try {
          await api(`/admin/photos/photos/${photoId}`, { method: 'DELETE' });
          toast.success('Foto dihapus.');
          reload();
        } catch (deleteError) {
          toast.error(errorMessage(deleteError));
        }
      }
    });

  const toggleSelected = (photoId: number) => {
    setSelected((previous) => {
      const next = { ...previous };

      if (next[photoId]) {
        delete next[photoId];
      } else {
        next[photoId] = true;
      }

      return next;
    });
  };

  const selectAllVisible = () => {
    const allSelected = visible.every((photo) => selected[photo.id]);

    if (allSelected) {
      setSelected({});
      return;
    }

    const next: Record<number, true> = {};
    visible.forEach((photo) => {
      next[photo.id] = true;
    });
    setSelected(next);
  };

  const bulkOcrSelected = () => {
    const photos = visible.filter((photo) => selected[photo.id]);

    if (photos.length === 0) {
      return;
    }

    void startOcr(false, photos);
  };

  const bulkDelete = () =>
    confirm({
      title: 'Hapus foto terpilih',
      message: `${selectedIds.length} foto akan dihapus permanen. Lanjutkan?`,
      confirmLabel: 'Hapus foto',
      onConfirm: async () => {
        setBusy(true);

        try {
          for (const photoId of selectedIds) {
            await api(`/admin/photos/photos/${photoId}`, { method: 'DELETE' });
          }

          toast.success(`${selectedIds.length} foto dihapus.`);
          setSelected({});
          reload();
        } catch (bulkError) {
          setProblem(errorMessage(bulkError));
        } finally {
          setBusy(false);
        }
      }
    });

  const openLightbox = (photo: Photo) => {
    setLightbox({ photo, bibs: photo.bibs || [], newBib: '' });
  };

  const addLightboxBib = () => {
    if (!lightbox || lightbox.newBib.trim() === '') {
      return;
    }

    const bib = lightbox.newBib.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (bib === '') {
      return;
    }

    setLightbox((previous) =>
      previous
        ? {
            ...previous,
            bibs: Array.from(new Set([...previous.bibs, bib])),
            newBib: ''
          }
        : previous
    );
  };

  const removeLightboxBib = (bib: string) => {
    setLightbox((previous) =>
      previous ? { ...previous, bibs: previous.bibs.filter((value) => value !== bib) } : previous
    );
  };

  const saveLightboxBibs = async () => {
    if (!lightbox) {
      return;
    }

    try {
      await api(`/admin/photos/photos/${lightbox.photo.id}`, {
        method: 'PATCH',
        body: { bibs: lightbox.bibs }
      });
      toast.success('BIB diperbarui.');
      setLightbox(null);
      reload();
    } catch (saveError) {
      toast.error(errorMessage(saveError));
    }
  };

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);

    if (event.dataTransfer.files?.length) {
      setFiles(event.dataTransfer.files);
    }
  };

  if (loading && !data) {
    return (
      <>
        <AdminPageHeader title="Memuat galeri..." backTo="/admin/photos" />
        <AdminSkeleton rows={8} />
      </>
    );
  }

  if (!loading && error) {
    return <AdminError message={error} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <AdminPageHeader
        title={data.name}
        backTo="/admin/photos"
        subtitle={
          <>
            {formatNumber(data.photo_count)} foto · {formatNumber(data.bib_count)} BIB ·{' '}
            {formatNumber(data.ocr_indexed)} OCR terindeks · mesin <strong>{mode.label}</strong>
            {' · '}
            <span title="Aturan OCR event ini (diatur di daftar Photos)">
              <i className="bi bi-filter-circle me-1" aria-hidden="true" />
              {ocrRule.digitsOnly ? 'angka' : 'angka & huruf'}
              {ocrRule.digits > 0 ? ` · ${ocrRule.digits} angka` : ' · 3-6 angka'}
            </span>
          </>
        }
        actions={
          <>
            <a className="btn btn-light-custom" href={`/photos/${data.slug}`} target="_blank" rel="noreferrer">
              <i className="bi bi-box-arrow-up-right me-1" aria-hidden="true" /> Halaman publik
            </a>
            <button
              className="btn btn-light-custom"
              type="button"
              onClick={() => startOcr(true)}
              disabled={ocrBusy}
              title="Pindai ulang semua foto, termasuk yang sudah terindeks"
            >
              <i className="bi bi-arrow-repeat me-1" aria-hidden="true" /> Scan ulang
            </button>
            <button className="btn btn-primary" type="button" onClick={() => startOcr(false)} disabled={ocrBusy}>
              <i className="bi bi-cpu me-1" aria-hidden="true" /> Index OCR
            </button>
          </>
        }
      />

      {mode.warning ? (
        <div className="alert alert-danger py-2" role="alert">
          <i className="bi bi-exclamation-octagon me-1" aria-hidden="true" />
          <strong>RapidOCR wajib aktif.</strong> {mode.warning}
        </div>
      ) : null}

      {problem ? (
        <div className="alert alert-warning py-2" role="alert">
          {problem}
        </div>
      ) : null}

      {ocrRun ? (
        <div className="rt-adm-ocr-panel" role="status" aria-live="polite">
          <div className="rt-adm-ocr-head">
            <span className="rt-adm-ocr-engine">
              <i className="bi bi-cpu me-1" aria-hidden="true" /> {ocrRun.label} (otomatis)
            </span>
            <span className="rt-adm-ocr-count">
              {ocrRun.done}/{ocrRun.total} foto · {ocrPercent}%
            </span>
          </div>
          <div className="rt-adm-ocr-bar" role="progressbar" aria-valuenow={ocrPercent} aria-valuemin={0} aria-valuemax={100}>
            <span style={{ width: `${ocrPercent}%` }} />
          </div>
          <div className="rt-adm-ocr-meta">
            <span className="rt-adm-ocr-stage">
              {ocrRun.running ? ocrRun.currentFile || ocrRun.stage : ocrRun.stage}
            </span>
            <span className="rt-adm-ocr-stats">
              {ocrRun.indexed} BIB · {ocrRun.multi} multi · {ocrRun.errors} error · {ocrElapsed}s
            </span>
            {ocrRun.running ? (
              <button className="btn btn-sm btn-outline-danger" type="button" onClick={cancelOcr}>
                <i className="bi bi-x-circle me-1" aria-hidden="true" /> Batal
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rt-admin-card mb-4">
        <h2 className="h6 mb-3">Unggah foto</h2>
        <div
          ref={dropRef}
          className={`rt-dropzone${dragging ? ' is-dragging' : ''}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <i className="bi bi-cloud-arrow-up" aria-hidden="true" />
          <p className="mb-1">
            {files && files.length > 0 ? `${files.length} file siap diunggah` : 'Tarik & lepas foto di sini'}
          </p>
          <small className="text-slate">atau pilih file di bawah (JPG, PNG, WEBP)</small>
          <input
            id="uploadFiles"
            type="file"
            className="form-control"
            multiple
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setFiles(event.target.files)}
          />
        </div>

        {filePreviews.length > 0 ? (
          <div className="rt-adm-upload-preview" aria-label="Pratinjau foto terpilih">
            {filePreviews.slice(0, 12).map((item, index) => (
              <img key={`${item.name}-${index}`} src={item.url} alt={item.name} loading="lazy" />
            ))}
            {filePreviews.length > 12 ? (
              <span className="rt-badge off align-self-center">+{filePreviews.length - 12}</span>
            ) : null}
          </div>
        ) : null}

        <div className="rt-adm-upload-actions">
          <button className="btn btn-primary" type="button" onClick={upload} disabled={busy}>
            <i className="bi bi-cloud-arrow-up me-1" aria-hidden="true" />
            {busy ? 'Mengunggah...' : 'Unggah'}
          </button>
        </div>
        <p className="rt-adm-upload-note">
          Foto disimpan di assets/uploads dan di-resize otomatis ke maksimal 1600 px. Nomor BIB dideteksi otomatis setelah unggah.
        </p>
      </div>

      <div className="rt-admin-card">
        <div className="rt-adm-filters">
          <SearchField value={search} onChange={setSearch} placeholder="Cari BIB, teks OCR, kategori" label="Cari foto" />
          <select className="form-select" value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
            {FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <span className="rt-adm-count">
            {formatNumber(visible.length)} dari {formatNumber(data.photos.length)} foto
          </span>
          <button className="btn btn-sm btn-light-custom ms-auto" type="button" onClick={selectAllVisible}>
            {visible.length > 0 && visible.every((photo) => selected[photo.id]) ? 'Batal pilih' : 'Pilih semua'}
          </button>
          <span className="rt-adm-count">{selectedIds.length} dipilih</span>
        </div>

        {selectedIds.length > 0 ? (
          <div className="rt-bulk-bar is-sticky">
            <button className="btn btn-sm btn-light-custom" type="button" onClick={bulkOcrSelected} disabled={ocrBusy}>
              <i className="bi bi-cpu me-1" aria-hidden="true" /> OCR terpilih
            </button>
            <button className="btn btn-sm btn-outline-danger" type="button" onClick={bulkDelete} disabled={busy}>
              <i className="bi bi-trash3 me-1" aria-hidden="true" /> Hapus terpilih
            </button>
            <button className="btn btn-sm btn-light-custom" type="button" onClick={() => setSelected({})}>
              Bersihkan
            </button>
          </div>
        ) : null}

        {visible.length === 0 ? (
          <AdminEmpty
            icon="bi-images"
            title="Tidak ada foto"
            description={
              data.photos.length === 0
                ? 'Unggah foto pertama untuk event ini.'
                : 'Tidak ada foto yang cocok dengan filter saat ini.'
            }
          />
        ) : (
          <div className="rt-photo-admin-grid">
            {visible.map((photo) => {
              const bibCount = (photo.bibs || []).length;

              return (
                <div className={`rt-photo-admin${selected[photo.id] ? ' is-selected' : ''}`} key={photo.id}>
                  <button type="button" className="rt-photo-open" onClick={() => openLightbox(photo)} aria-label="Perbesar dan edit BIB">
                    <img src={publicUrl(photo.file)} alt={`Foto ${photo.bib || photo.id}`} loading="lazy" />
                  </button>
                  <label className="rt-adm-photo-select">
                    <input
                      type="checkbox"
                      checked={Boolean(selected[photo.id])}
                      onChange={() => toggleSelected(photo.id)}
                      aria-label={`Pilih foto ${photo.bib || photo.id}`}
                    />
                  </label>
                  <div className="rt-adm-photo-foot">
                    <div className="rt-adm-photo-bibs">
                      {bibCount > 0 ? (
                        <span className="rt-badge ok">{bibCount} BIB</span>
                      ) : (
                        <span className="rt-badge off">no BIB</span>
                      )}
                    </div>
                    <div className="rt-adm-photo-ocr">
                      <span className="rt-badge off">{photo.ocr_source || 'manual'}</span>
                      <span className="rt-badge off">{photo.ocr_confidence.toFixed(1)}%</span>
                    </div>
                    <ActionGroup>
                      <button
                        className="btn btn-sm btn-light-custom"
                        type="button"
                        onClick={() => startOcr(false, [photo])}
                        disabled={ocrBusy}
                      >
                        <i className="bi bi-cpu me-1" aria-hidden="true" /> OCR
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        aria-label="Hapus foto"
                        title="Hapus foto"
                      >
                        <i className="bi bi-trash3" aria-hidden="true" />
                      </button>
                    </ActionGroup>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal
        open={Boolean(lightbox)}
        title={lightbox ? `Foto ${lightbox.photo.bib || lightbox.photo.id}` : ''}
        onClose={() => setLightbox(null)}
        size="lg"
        footer={
          <div className="rt-adm-dialog-actions">
            <button type="button" className="btn btn-light-custom" onClick={() => setLightbox(null)}>
              Tutup
            </button>
            <button type="button" className="btn btn-primary" onClick={() => void saveLightboxBibs()}>
              Simpan BIB
            </button>
          </div>
        }
      >
        {lightbox ? (
          <div className="rt-adm-lightbox-editor">
            <div className="rt-adm-lightbox-image">
              <img src={publicUrl(lightbox.photo.file)} alt={`Foto ${lightbox.photo.bib || lightbox.photo.id}`} />
            </div>

            <div className="rt-adm-lightbox-detail">
              <div className="rt-adm-lightbox-section">
                <label className="form-label">BIB terdeteksi / terkait</label>
                <div className="rt-adm-bib-chips">
                  {lightbox.bibs.length === 0 ? (
                    <span className="text-slate small">Belum ada BIB. Tambah manual di bawah.</span>
                  ) : (
                    lightbox.bibs.map((bib) => (
                      <span className="rt-chip rt-chip-neutral" key={bib}>
                        {bib}
                        <button
                          type="button"
                          className="rt-adm-bib-remove"
                          aria-label={`Hapus BIB ${bib}`}
                          onClick={() => removeLightboxBib(bib)}
                        >
                          <i className="bi bi-x" aria-hidden="true" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                <div className="rt-adm-bib-add">
                  <input
                    className="form-control"
                    placeholder="Tambah BIB, contoh 1024 atau MH2001"
                    value={lightbox.newBib}
                    onChange={(event) =>
                      setLightbox((previous) =>
                        previous ? { ...previous, newBib: event.target.value } : previous
                      )
                    }
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addLightboxBib();
                      }
                    }}
                  />
                  <button type="button" className="btn btn-light-custom" onClick={addLightboxBib}>
                    <i className="bi bi-plus-lg" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="rt-adm-lightbox-section">
                <label className="form-label">Teks OCR</label>
                <p className="rt-adm-lightbox-text">{lightbox.photo.ocr_text || '-'}</p>
                <div className="d-flex flex-wrap gap-2">
                  <span className="rt-badge off">{lightbox.photo.ocr_source || 'manual'}</span>
                  <span className="rt-badge off">confidence {lightbox.photo.ocr_confidence.toFixed(1)}%</span>
                </div>
              </div>

              <a className="btn btn-light-custom btn-sm" href={publicUrl(lightbox.photo.file)} download={`bib-${lightbox.photo.bib || lightbox.photo.id}.jpg`}>
                <i className="bi bi-download me-1" aria-hidden="true" /> Unduh foto
              </a>
            </div>
          </div>
        ) : null}
      </Modal>

      {dialog}
    </>
  );
}
