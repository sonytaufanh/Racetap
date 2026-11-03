import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { EmptyBox, ErrorBox, Loading, SafeImage } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { formatDate, formatDecimal, formatNumber, normalizeBib } from '../lib/format';
import { photoMatches } from '../lib/bib';
import { APP, asset } from '../payload';
import { useI18n } from '../i18n/I18nProvider';
import type { Photo, PhotoEventPayload } from '../types';

export default function PhotoEvent() {
  const { slug = '' } = useParams();
  const [searchParams] = useSearchParams();
  const { data, loading, error, reload } = useApi<PhotoEventPayload>(slug ? `/photos/events/${encodeURIComponent(slug)}` : null);
  const { t, lang } = useI18n();

  const [query, setQuery] = useState(() => normalizeBib(searchParams.get('bib')));
  const [selected, setSelected] = useState<Record<number, true>>({});
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    const needle = normalizeBib(query);

    if (needle) {
      next.set('bib', needle);
    } else {
      next.delete('bib');
    }

    const serialized = next.toString();
    window.history.replaceState({}, '', `${window.location.pathname}${serialized ? `?${serialized}` : ''}`);
  }, [query, searchParams]);

  useEffect(() => {
    setSelected({});
  }, [slug]);

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

  const filtered = useMemo(() => {
    const needle = normalizeBib(query);

    if (!needle) {
      return photos;
    }

    return photos.filter((photo) => photoMatches(photo, needle));
  }, [photos, query]);

  const selectedIds = useMemo(() => Object.keys(selected).map(Number), [selected]);
  const allSelected = filtered.length > 0 && filtered.every((photo) => selected[photo.id]);

  const togglePhoto = (id: number) => {
    setSelected((previous) => {
      const next = { ...previous };

      if (next[id]) {
        delete next[id];
      } else {
        next[id] = true;
      }

      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelected({});
      return;
    }

    const next: Record<number, true> = {};
    filtered.forEach((photo) => {
      next[photo.id] = true;
    });
    setSelected(next);
  };

  const downloadSelected = () => {
    if (selectedIds.length === 0) {
      return;
    }

    window.location.href = `${APP.apiUrl}/photos/events/${encodeURIComponent(slug)}/download?ids=${selectedIds.join(',')}`;
  };

  if (loading && !data) {
    return (
      <section className="section">
        <div className="container">
          <Loading label={t('common.loading')} />
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
  const displayCount = normalizeBib(query) === '' ? photos.length : filtered.length;

  return (
    <>
      <header className="page-header photo-page-header">
        <div className="container">
          <h1 className="mb-3">{event.name}</h1>
          <div className="breadcrumb-custom">
            <Link to="/">Home</Link> <span>/</span> <Link to="/photos">Photos</Link> <span>/</span>
            <span className="active">{event.name}</span>
          </div>
          <div className="photo-hero-meta">
            <span className="photo-hero-chip">
              <i className="bi bi-geo-alt" /> {event.location}
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-calendar3" /> {formatDate(event.event_date, lang)}
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-images" /> {formatNumber(event.photo_count, lang)} {t('photos.photos')}
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-upc-scan" /> {formatNumber(event.bib_count, lang)} BIB
            </span>
            <span className="photo-hero-chip">
              <i className="bi bi-cpu" /> {formatNumber(ocrIndexed, lang)} {t('photos.ocr')}
            </span>
          </div>
        </div>
      </header>

      <section className="section pb-0">
        <div className="container">
          <div className="photo-toolbar">
            <div className="row g-4 align-items-center">
              <div className="col-lg-5">
                <span className="eyebrow">{t('photo.eyebrow')}</span>
                <h2 className="section-title h3 mb-2">{t('photo.heading')}</h2>
                <p className="mb-1 text-slate">{t('photo.intro')}</p>
                <small className="text-slate d-block">
                  <i className="bi bi-info-circle me-1" /> {t('photo.ocrNote')}
                </small>
              </div>
              <div className="col-lg-7">
                <form className="photo-search-form" onSubmit={(submitEvent) => submitEvent.preventDefault()}>
                  <div className="photo-search-input">
                    <i className="bi bi-upc-scan" />
                    <input
                      type="search"
                      inputMode="text"
                      autoComplete="off"
                      value={query}
                      placeholder={t('photo.placeholder')}
                      aria-label="BIB"
                      onChange={(changeEvent) => setQuery(normalizeBib(changeEvent.target.value))}
                    />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    <i className="bi bi-search me-1" /> {t('photo.search')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="photo-result-bar">
            <p className="mb-0 text-slate">
              {normalizeBib(query) === ''
                ? t('photo.showing', { count: formatNumber(photos.length, lang) })
                : filtered.length > 0
                  ? t('photo.found', { count: formatNumber(filtered.length, lang), bib: normalizeBib(query) })
                  : t('photo.notFound', { bib: normalizeBib(query) })}
            </p>
            <div className="photo-bulk">
              <button type="button" className="btn btn-sm btn-light-custom" onClick={toggleAll} disabled={filtered.length === 0}>
                <i className="bi bi-check2-square me-1" /> {allSelected ? t('photo.clearSelection') : t('photo.selectAll')}
              </button>
              <span className="photo-selected-count">{t('photo.selectedCount', { count: selectedIds.length })}</span>
              <button className="btn btn-sm btn-primary" type="button" onClick={downloadSelected} disabled={selectedIds.length === 0}>
                <i className="bi bi-file-zip me-1" /> {t('photo.downloadZip')}
              </button>
              <span className="badge-soft">
                <i className="bi bi-images me-1" /> {formatNumber(displayCount, lang)} {t('photos.photos')}
              </span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <EmptyBox icon="bi-search" title={t('photo.emptyMatchTitle')} description={t('photo.emptyMatchText')} />
          ) : (
            <div className="row g-4">
              {filtered.map((photo) => (
                <div className="col-sm-6 col-lg-4" key={photo.id}>
                  <article className={`photo-card${selected[photo.id] ? ' is-selected' : ''}`}>
                    <label className="photo-select" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={Boolean(selected[photo.id])}
                        onChange={() => togglePhoto(photo.id)}
                        aria-label={`${t('photo.selectAll')} ${photo.bib}`}
                      />
                    </label>
                    <button type="button" className="photo-thumb" onClick={() => setActivePhoto(photo)}>
                      <SafeImage src={asset(photo.file)} alt={`Foto BIB ${photo.bib} - ${event.name}`} loading="lazy" />
                      <span className="photo-bib-badge">BIB {photo.bib || '-'}</span>
                      <span className="photo-zoom">
                        <i className="bi bi-arrows-fullscreen" />
                      </span>
                    </button>
                    <div className="photo-card-body">
                      <div className="photo-card-info">
                        <span className="photo-time">
                          <i className="bi bi-clock" /> {photo.captured_at || '-'}
                        </span>
                        <span className="photo-cat">{photo.category}</span>
                      </div>
                      <div className="photo-card-footer">
                        <span className={`ocr-badge${photo.ocr_source ? ' is-live' : ''}`}>
                          <i className="bi bi-upc-scan" /> OCR {formatDecimal(photo.ocr_confidence)}%
                        </span>
                        <a
                          className="photo-download"
                          href={asset(photo.file)}
                          download={`bib-${photo.bib || photo.id}.jpg`}
                          title={t('photo.download')}
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
                BIB {activePhoto.bib || '-'} &mdash; {event.name}
              </h5>
              <button type="button" className="btn-close" aria-label={t('common.close')} onClick={() => setActivePhoto(null)} />
            </div>
            <div className="rt-modal-body">
              <SafeImage src={asset(activePhoto.file)} alt={`Foto BIB ${activePhoto.bib}`} />
            </div>
            <div className="rt-modal-footer">
              <span className="text-slate">
                {[activePhoto.category, activePhoto.captured_at].filter(Boolean).join(' · ')}
              </span>
              <a
                className="btn btn-primary btn-sm-custom"
                href={asset(activePhoto.file)}
                download={`bib-${activePhoto.bib || activePhoto.id}.jpg`}
              >
                <i className="bi bi-download me-1" /> {t('photo.download')}
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
