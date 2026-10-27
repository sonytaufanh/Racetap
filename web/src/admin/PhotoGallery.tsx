import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBox, Loading } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { formatNumber } from '../lib/format';
import { asset } from '../payload';
import type { OcrBatchResponse, OcrPhotoResponse, PhotoEventDetail, UploadResponse } from '../types';

interface EditState {
  bib: string;
  category: string;
  captured_at: string;
}

export default function AdminPhotoGallery() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useApi<PhotoEventDetail>(id ? `/admin/photos/events/${id}` : null);

  const [edits, setEdits] = useState<Record<number, EditState>>({});
  const [files, setFiles] = useState<FileList | null>(null);
  const [bib, setBib] = useState('');
  const [category, setCategory] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');

  useEffect(() => {
    if (!data) {
      return;
    }

    const next: Record<number, EditState> = {};

    data.photos.forEach((photo) => {
      next[photo.id] = {
        bib: photo.bib,
        category: photo.category,
        captured_at: photo.captured_at
      };
    });

    setEdits(next);
  }, [data]);

  const upload = async () => {
    if (!files || files.length === 0) {
      setProblem('Pilih minimal satu foto.');
      return;
    }

    setBusy(true);
    setNotice('');
    setProblem('');

    try {
      const payload = new FormData();

      Array.from(files).forEach((file) => payload.append('files[]', file));

      if (bib) {
        payload.append('bib', bib);
      }

      if (category) {
        payload.append('category', category);
      }

      if (capturedAt) {
        payload.append('captured_at', capturedAt);
      }

      const result = await api<UploadResponse>(`/admin/photos/events/${id}/photos`, { method: 'POST', form: payload });

      setNotice(`${result.created} foto diunggah.${result.errors.length ? ` ${result.errors.length} gagal.` : ''}`);
      setProblem(result.errors.join(' | '));
      setFiles(null);
      setBib('');
      reload();
    } catch (uploadError) {
      setProblem(errorMessage(uploadError));
    } finally {
      setBusy(false);
    }
  };

  const savePhoto = async (photoId: number) => {
    const edit = edits[photoId];

    if (!edit) {
      return;
    }

    setProblem('');
    setNotice('');

    try {
      await api(`/admin/photos/photos/${photoId}`, { method: 'PATCH', body: edit });
      setNotice('Foto diperbarui.');
      reload();
    } catch (saveError) {
      setProblem(errorMessage(saveError));
    }
  };

  const removePhoto = async (photoId: number) => {
    if (!window.confirm('Hapus foto ini?')) {
      return;
    }

    try {
      await api(`/admin/photos/photos/${photoId}`, { method: 'DELETE' });
      setNotice('Foto dihapus.');
      reload();
    } catch (deleteError) {
      setProblem(errorMessage(deleteError));
    }
  };

  const ocrPhoto = async (photoId: number) => {
    setOcrBusy(true);
    setNotice('');
    setProblem('');

    try {
      const result = await api<OcrPhotoResponse>(`/admin/photos/photos/${photoId}/ocr`, { method: 'POST' });
      setNotice(
        result.result.bib
          ? `OCR Vision: BIB ${result.result.bib} (${result.result.confidence.toFixed(1)}%).`
          : 'Vision tidak menemukan nomor dada.'
      );
      reload();
    } catch (ocrError) {
      setProblem(errorMessage(ocrError));
    } finally {
      setOcrBusy(false);
    }
  };

  const ocrEvent = async () => {
    setOcrBusy(true);
    setNotice('');
    setProblem('');

    let processed = 0;
    let indexed = 0;
    let rounds = 0;

    try {
      while (rounds < 10) {
        const result = await api<OcrBatchResponse>(`/admin/photos/events/${id}/ocr`, { method: 'POST', body: {} });
        processed += result.processed;
        indexed += result.indexed;
        rounds += 1;

        if (result.errors.length > 0) {
          setProblem(result.errors.map((item) => `${item.file}: ${item.error}`).join(' | '));
        }

        if (result.remaining === 0 || result.processed === 0) {
          break;
        }
      }

      setNotice(`OCR Vision selesai. ${processed} foto diproses, ${indexed} BIB terindeks.`);
      reload();
    } catch (ocrError) {
      setProblem(errorMessage(ocrError));
    } finally {
      setOcrBusy(false);
    }
  };

  if (loading && !data) {
    return <Loading label="Memuat galeri..." />;
  }

  if (!loading && error) {
    return <ErrorBox message={error} onRetry={reload} />;
  }

  if (!data) {
    return null;
  }

  return (
    <>
      <div className="rt-admin-toolbar">
        <div>
          <Link to="/admin/photos" className="small text-slate">
            <i className="bi bi-arrow-left me-1" /> Kembali ke Photos
          </Link>
          <h1 className="h4 mb-1 mt-1">{data.name}</h1>
          <p className="mb-0 text-slate">
            {formatNumber(data.photo_count)} foto · {formatNumber(data.bib_count)} BIB · {formatNumber(data.ocr_indexed)} OCR indexed
          </p>
        </div>
        <div className="d-flex gap-2">
          <a className="btn btn-light-custom" href={`/v2/photos/${data.slug}`} target="_blank" rel="noreferrer">
            <i className="bi bi-box-arrow-up-right me-1" /> Halaman publik
          </a>
          <button className="btn btn-primary" type="button" onClick={ocrEvent} disabled={ocrBusy}>
            {ocrBusy ? 'Memproses OCR...' : 'Index OCR (Vision)'}
          </button>
        </div>
      </div>

      {notice && <div className="alert alert-success py-2">{notice}</div>}
      {problem && <div className="alert alert-warning py-2">{problem}</div>}

      <div className="rt-admin-card mb-4">
        <h2 className="h6 mb-3">Unggah foto</h2>
        <div className="row g-3 align-items-end">
          <div className="col-md-4">
            <label className="form-label" htmlFor="uploadFiles">
              File foto (bisa banyak)
            </label>
            <input
              id="uploadFiles"
              type="file"
              className="form-control"
              multiple
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => setFiles(event.target.files)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label" htmlFor="uploadBib">
              BIB (opsional)
            </label>
            <input id="uploadBib" className="form-control" value={bib} onChange={(event) => setBib(event.target.value)} />
          </div>
          <div className="col-md-2">
            <label className="form-label" htmlFor="uploadCategory">
              Kategori
            </label>
            <input
              id="uploadCategory"
              className="form-control"
              placeholder="10K / 5K"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label" htmlFor="uploadTime">
              Waktu
            </label>
            <input
              id="uploadTime"
              className="form-control"
              placeholder="06:13:19"
              value={capturedAt}
              onChange={(event) => setCapturedAt(event.target.value)}
            />
          </div>
          <div className="col-md-2">
            <button className="btn btn-primary w-100" type="button" onClick={upload} disabled={busy}>
              {busy ? 'Mengunggah...' : 'Unggah'}
            </button>
          </div>
        </div>
        <p className="small text-slate mb-0 mt-2">
          Foto disimpan di assets/uploads dan di-resize otomatis ke maksimal 1600 px. OCR Vision berjalan setelah unggah
          melalui tombol Index OCR.
        </p>
      </div>

      {data.photos.length === 0 ? (
        <div className="rt-admin-card">
          <p className="mb-0 text-slate">Belum ada foto pada event ini.</p>
        </div>
      ) : (
        <div className="rt-photo-admin-grid">
          {data.photos.map((photo) => {
            const edit = edits[photo.id] || { bib: photo.bib, category: photo.category, captured_at: photo.captured_at };

            return (
              <div className="rt-photo-admin" key={photo.id}>
                <img src={asset(photo.file)} alt={`BIB ${photo.bib}`} loading="lazy" />
                <div className="body">
                  <input
                    aria-label="BIB"
                    placeholder="BIB"
                    value={edit.bib}
                    onChange={(event) =>
                      setEdits((previous) => ({ ...previous, [photo.id]: { ...edit, bib: event.target.value } }))
                    }
                  />
                  <input
                    aria-label="Kategori"
                    placeholder="Kategori"
                    value={edit.category}
                    onChange={(event) =>
                      setEdits((previous) => ({ ...previous, [photo.id]: { ...edit, category: event.target.value } }))
                    }
                  />
                  <input
                    aria-label="Waktu"
                    placeholder="Waktu"
                    value={edit.captured_at}
                    onChange={(event) =>
                      setEdits((previous) => ({ ...previous, [photo.id]: { ...edit, captured_at: event.target.value } }))
                    }
                  />
                  <div className="d-flex flex-wrap gap-1">
                    <span className="rt-badge off">{photo.ocr_source || 'manual'}</span>
                    <span className="rt-badge off">{photo.ocr_confidence.toFixed(1)}%</span>
                  </div>
                  <div className="d-flex flex-wrap gap-1">
                    <button className="btn btn-sm btn-primary" type="button" onClick={() => savePhoto(photo.id)}>
                      Simpan
                    </button>
                    <button className="btn btn-sm btn-light-custom" type="button" onClick={() => ocrPhoto(photo.id)} disabled={ocrBusy}>
                      OCR
                    </button>
                    <button className="btn btn-sm btn-outline-danger" type="button" onClick={() => removePhoto(photo.id)}>
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
