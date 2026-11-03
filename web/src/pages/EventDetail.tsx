import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { Badge, PageHeader, SafeImage } from '../components/ui';
import { formatDate, formatNumber } from '../lib/format';
import { asset } from '../payload';
import { useSettings, whatsappLink } from '../hooks/useSettings';
import { useI18n } from '../i18n/I18nProvider';

interface SummaryAthlete {
  name: string;
  bib: string;
  netTime: string;
  gunTime: string;
}

interface SummaryPodium {
  item: string;
  athletes: SummaryAthlete[];
}

interface EventSummary {
  slug: string;
  name: string;
  title: string;
  date: string | null;
  participants: number;
  finishers: number;
  categories: string[];
  distance: string | null;
  podiums: SummaryPodium[];
}

export default function EventDetail() {
  const { slug = '' } = useParams();
  const { settings } = useSettings();
  const { t, lang, content, events } = useI18n();
  const [summary, setSummary] = useState<EventSummary | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'missing'>('loading');
  const [activeCategory, setActiveCategory] = useState('');

  const event = useMemo(() => events.find((item) => item.slug === slug), [slug, events]);

  useEffect(() => {
    if (!event) {
      setState('missing');
      return;
    }

    const controller = new AbortController();
    setState('loading');
    setSummary(null);

    fetch(`/results/${encodeURIComponent(event.slug)}/summary.json`, {
      signal: controller.signal,
      cache: 'no-store'
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json() as Promise<EventSummary>;
      })
      .then((json) => {
        setSummary(json);
        setActiveCategory(json.podiums?.[0]?.item || '');
        setState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setState('missing');
        }
      });

    return () => controller.abort();
  }, [event]);

  if (!event) {
    return (
      <>
        <PageHeader title={t('event.notFound')} crumbs={[{ label: 'Home', to: '/' }, { label: t('event.notFound') }]} />
        <section className="section pt-0">
          <div className="container text-center">
            <p className="section-subtitle mx-auto">{t('event.notFoundText')}</p>
            <Link className="btn btn-primary" to="/results">
              {t('event.allResults')}
            </Link>
          </div>
        </section>
      </>
    );
  }

  const categories = summary?.categories ?? [];
  const podium = summary?.podiums.find((entry) => entry.item === activeCategory) || summary?.podiums[0];
  const related = events.filter((item) => item.slug !== event.slug).slice(0, 3);

  return (
    <>
      <section className="section-sm">
        <div className="container">
          <div className="event-hero">
            <SafeImage src={asset(event.cover)} alt={event.name} />
            <div className="event-hero-content">
              <div className="d-flex flex-wrap gap-2 mb-3">
                <Badge tone={state === 'ready' ? 'success' : 'neutral'}>
                  {state === 'ready' ? t('event.resultsAvailable') : state === 'loading' ? t('event.loading') : t('event.noResults')}
                </Badge>
                <Badge tone="neutral">
                  <i className="bi bi-geo-alt" /> {event.location}
                </Badge>
                {summary?.date ? (
                  <Badge tone="neutral">
                    <i className="bi bi-calendar3" /> {formatDate(summary.date, lang)}
                  </Badge>
                ) : null}
              </div>
              <h1>{event.name}</h1>
              <p className="mb-0 text-white-50">{t('event.heroText', { event: event.name })}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-0">
        <div className="container">
          <div className="rt-stat-grid mb-4">
            <div className="rt-stat-card">
              <span className="rt-stat-icon">
                <i className="bi bi-people" />
              </span>
              <div>
                <div className="rt-stat-value">{summary ? formatNumber(summary.participants, lang) : '-'}</div>
                <div className="rt-stat-label">{t('event.participants')}</div>
              </div>
            </div>
            <div className="rt-stat-card">
              <span className="rt-stat-icon">
                <i className="bi bi-check2-circle" />
              </span>
              <div>
                <div className="rt-stat-value">{summary ? formatNumber(summary.finishers, lang) : '-'}</div>
                <div className="rt-stat-label">{t('event.finishers')}</div>
              </div>
            </div>
            <div className="rt-stat-card">
              <span className="rt-stat-icon">
                <i className="bi bi-diagram-3" />
              </span>
              <div>
                <div className="rt-stat-value">{summary ? summary.categories.length : '-'}</div>
                <div className="rt-stat-label">{t('event.categories')}</div>
              </div>
            </div>
            <div className="rt-stat-card">
              <span className="rt-stat-icon">
                <i className="bi bi-signpost-split" />
              </span>
              <div>
                <div className="rt-stat-value">{summary?.distance || event.location}</div>
                <div className="rt-stat-label">{t('event.distance')}</div>
              </div>
            </div>
          </div>

          <div className="row g-4">
            <div className="col-lg-7">
              <div className="card-premium h-100">
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                  <h2 className="h5 mb-0">{t('event.podium')}</h2>
                  <Link className="card-link-arrow small" to={`/results/${event.slug}/`}>
                    {t('event.fullResults')} <i className="bi bi-arrow-right" />
                  </Link>
                </div>

                {state === 'loading' ? <p className="mb-0 text-slate">{t('event.loadingResults')}</p> : null}
                {state === 'missing' ? <p className="mb-0 text-slate">{t('event.notPublished')}</p> : null}

                {summary && summary.podiums.length > 0 ? (
                  <>
                    {summary.podiums.length > 1 ? (
                      <div className="quick-filters mb-3" role="group" aria-label={t('event.podium')}>
                        {summary.podiums.map((entry) => (
                          <button
                            key={entry.item}
                            type="button"
                            className={`quick-chip${(podium?.item || '') === entry.item ? ' is-active' : ''}`}
                            onClick={() => setActiveCategory(entry.item)}
                          >
                            {entry.item}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="d-grid gap-2">
                      {(podium?.athletes || []).map((athlete, index) => (
                        <div
                          key={`${athlete.bib}-${athlete.name}`}
                          className="d-flex align-items-center justify-content-between gap-3 p-2 rounded-3"
                          style={{ background: 'var(--n-bg, #f7f9fc)' }}
                        >
                          <div className="d-flex align-items-center gap-3">
                            <span className={`rt-chip ${index === 0 ? 'rt-chip-warning' : 'rt-chip-neutral'}`}>#{index + 1}</span>
                            <div>
                              <strong className="d-block text-navy">{athlete.name}</strong>
                              <small className="text-slate">
                                {podium?.item} &middot; {t('rx.bib')} {athlete.bib || '-'}
                              </small>
                            </div>
                          </div>
                          <strong className="text-navy">{athlete.netTime}</strong>
                        </div>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </div>

            <div className="col-lg-5">
              <div className="card-premium h-100">
                <h2 className="h5">{t('event.info')}</h2>
                <div className="event-meta-grid">
                  <div className="event-meta-item">
                    <span>{t('event.location')}</span>
                    <strong>{event.location}</strong>
                  </div>
                  <div className="event-meta-item">
                    <span>{t('event.category')}</span>
                    <strong>{categories.length > 0 ? categories.join(', ') : '5K & 10K'}</strong>
                  </div>
                  <div className="event-meta-item">
                    <span>{t('event.results')}</span>
                    <strong>{state === 'ready' ? t('event.available') : t('event.missing')}</strong>
                  </div>
                  <div className="event-meta-item">
                    <span>{t('event.photos')}</span>
                    <strong>
                      <Link to="/photos">{t('event.findPhotos')}</Link>
                    </strong>
                  </div>
                </div>
                <a
                  className="btn btn-light-custom w-100 mt-3"
                  href={whatsappLink(settings.whatsapp, t('event.askMessage', { event: event.name }))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <i className="bi bi-whatsapp me-1" /> {t('event.ask')}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <h2 className="section-title text-center">{t('event.processTitle')}</h2>
          <p className="section-subtitle text-center mx-auto" style={{ maxWidth: 640 }}>
            {t('event.processSubtitle')}
          </p>
          <div className="row g-4 mt-1">
            {content.eventProcess.map((step, index) => (
              <div className="col-md-6 col-xxl-3" key={step.title}>
                <Reveal delay={index * 0.08}>
                  <div className="card-premium h-100 text-center">
                    <div className={`icon-box icon-box-${step.tone} mx-auto mb-3`}>
                      <i className={`bi ${step.icon}`} />
                    </div>
                    <h3 className="card-title">{step.title}</h3>
                    <p className="mb-0">{step.body}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 className="section-title">{t('event.related')}</h2>
          <div className="row g-4 mt-1">
            {related.map((item, index) => (
              <div className="col-md-6 col-lg-4" key={item.slug}>
                <Reveal delay={index * 0.08}>
                  <Link to={`/events/${item.slug}`} className="portfolio-card d-block">
                    <SafeImage src={asset(item.cover)} alt={item.name} loading="lazy" />
                    <div className="portfolio-overlay">
                      <span>{item.location}</span>
                      <h5>{item.name}</h5>
                    </div>
                  </Link>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
