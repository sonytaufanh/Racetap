import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { EmptyBox, ErrorBox, Loading, PageHeader, SafeImage } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { formatDate, formatNumber } from '../lib/format';
import { publicUrl } from '../payload';
import { useI18n } from '../i18n/I18nProvider';
import type { PhotoListPayload } from '../types';

type SortKey = 'latest' | 'name';

export default function Photos() {
  const { t, lang } = useI18n();
  const { data, loading, error, reload } = useApi<PhotoListPayload>('/photos/events');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('latest');

  const events = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = (data?.events ?? []).filter(
      (event) =>
        term === '' ||
        event.name.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term) ||
        event.slug.toLowerCase().includes(term)
    );

    if (sort === 'name') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, lang));
    }

    return [...list].sort((a, b) => (b.event_date || '').localeCompare(a.event_date || ''));
  }, [data, query, sort, lang]);

  return (
    <>
      <PageHeader
        title={t('photos.title')}
        subtitle={t('photos.intro')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('photos.title') }]}
      />

      <section className="section pt-4">
        <div className="container">
          <div className="list-toolbar">
            <input
              className="form-control"
              type="search"
              value={query}
              placeholder={t('photos.searchPlaceholder')}
              aria-label={t('photos.searchPlaceholder')}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <select
                className="form-select"
                value={sort}
                aria-label={t('photos.sortLabel')}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="latest">{t('photos.sortLatest')}</option>
                <option value="name">{t('photos.sortName')}</option>
              </select>
              <span className="list-toolbar-count">
                {t('results.count', { count: events.length })}
              </span>
            </div>
          </div>

          {loading && <Loading label={t('common.loading')} />}

          {!loading && error && <ErrorBox message={error} onRetry={reload} />}

          {!loading && !error && data && data.events.length === 0 && (
            <EmptyBox title={t('photos.emptyTitle')} description={t('photos.emptyText')} />
          )}

          {!loading && !error && data && data.events.length > 0 && events.length === 0 && (
            <EmptyBox icon="bi-search" title={t('common.notFound')} description={t('photos.emptyFilter')} />
          )}

          {!loading && !error && events.length > 0 && (
            <div className="row g-4">
              {events.map((event, index) => (
                <div className="col-md-6 col-lg-4" key={event.slug}>
                  <Reveal delay={(index % 4) * 0.08}>
                    <Link to={`/photos/${event.slug}`} className="portfolio-card photo-event-card d-block">
                      <SafeImage src={publicUrl(event.cover)} alt={event.name} loading="lazy" />
                      <div className="photo-event-chip">
                        <i className="bi bi-images" /> {t('photos.count', { count: formatNumber(event.photo_count, lang) })}
                      </div>
                      <div className="portfolio-overlay">
                        <span>
                          {event.location} &middot; {formatDate(event.event_date, lang)}
                        </span>
                        <h5>{event.name}</h5>
                        <div className="photo-event-meta">
                          <span className="photo-event-meta-item">
                            <i className="bi bi-upc-scan" /> {t('photos.bibCount', { count: formatNumber(event.bib_count, lang) })}
                          </span>
                          <span className="photo-event-meta-item">
                            <i className="bi bi-cpu" /> {t('photos.ocr')}
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <CTASection />
    </>
  );
}
