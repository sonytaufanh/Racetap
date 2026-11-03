import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { EmptyBox, PageHeader, SafeImage } from '../components/ui';
import { asset } from '../payload';
import { useI18n } from '../i18n/I18nProvider';

type SortKey = 'latest' | 'name';

export default function Results() {
  const { t, events: siteEvents } = useI18n();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortKey>('latest');

  const events = useMemo(() => {
    const term = query.trim().toLowerCase();
    const list = siteEvents.filter(
      (event) => term === '' || event.name.toLowerCase().includes(term) || event.location.toLowerCase().includes(term)
    );

    if (sort === 'name') {
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    }

    return list;
  }, [query, sort, siteEvents]);

  return (
    <>
      <PageHeader
        title={t('results.title')}
        subtitle={t('results.intro')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('results.title') }]}
      />

      <section className="section pt-4">
        <div className="container">
          <div className="list-toolbar">
            <input
              className="form-control"
              type="search"
              value={query}
              placeholder={t('results.searchPlaceholder')}
              aria-label={t('results.searchPlaceholder')}
              onChange={(event) => setQuery(event.target.value)}
            />
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <select
                className="form-select"
                value={sort}
                aria-label={t('results.sortLatest')}
                onChange={(event) => setSort(event.target.value as SortKey)}
              >
                <option value="latest">{t('results.sortLatest')}</option>
                <option value="name">{t('results.sortName')}</option>
              </select>
              <span className="list-toolbar-count">{t('results.count', { count: events.length })}</span>
            </div>
          </div>

          {events.length === 0 ? (
            <EmptyBox icon="bi-search" title={t('common.notFound')} description={t('results.empty')} />
          ) : (
            <div className="row g-4">
              {events.map((event, index) => (
                <div className="col-md-6 col-lg-4" key={event.slug}>
                  <Reveal delay={(index % 4) * 0.08}>
                    <div className="portfolio-card d-block">
                      <a href={`/results/${event.slug}/`} className="d-block text-reset text-decoration-none">
                        <SafeImage src={asset(event.cover)} alt={event.name} loading="lazy" />
                        <div className="portfolio-overlay">
                          <span>{event.location}</span>
                          <h5>{event.name}</h5>
                        </div>
                      </a>
                      <Link className="portfolio-info-link" to={`/events/${event.slug}`}>
                        <i className="bi bi-info-circle" /> {t('results.info')}
                      </Link>
                    </div>
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
