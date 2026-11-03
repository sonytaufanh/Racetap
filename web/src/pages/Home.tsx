import { Link } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { QuickResultSearch } from '../components/QuickResultSearch';
import { Reveal } from '../components/Reveal';
import { SafeImage, SectionHeading } from '../components/ui';
import { asset } from '../payload';
import { useSettings, whatsappLink } from '../hooks/useSettings';
import { useI18n } from '../i18n/I18nProvider';

export default function Home() {
  const { settings } = useSettings();
  const { t, content, events } = useI18n();
  const latestEvents = events.filter((event) => event.latest);

  return (
    <>
      <header className="hero">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-lg-6 hero-content">
              <h1 className="mb-4">
                {t('home.hero.title1')} <span className="text-primary-custom">{t('home.hero.title2')}</span>{' '}
                {t('home.hero.title3')}
              </h1>
              <p className="fs-5 mb-4" style={{ maxWidth: 540 }}>
                {t('home.hero.text')}
              </p>
              <div className="d-flex flex-wrap gap-3 mb-4 justify-content-lg-start justify-content-center">
                <a
                  href={whatsappLink(settings.whatsapp, t('cta.message'))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg-custom"
                >
                  {t('home.hero.cta')} <i className="bi bi-arrow-right ms-1" />
                </a>
                <Link to="/services" className="btn btn-light-custom btn-lg-custom">
                  {t('home.hero.secondary')}
                </Link>
              </div>
              <QuickResultSearch />
            </div>
            <div className="col-lg-6">
              <div className="hero-visual position-relative mx-auto" style={{ maxWidth: 480 }}>
                <div className="hero-mock-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56', display: 'block' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', display: 'block' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F', display: 'block' }} />
                    </div>
                    <span className="badge-soft">{t('home.mock.live')}</span>
                  </div>
                  <div className="mock-bar" style={{ width: '90%' }} />
                  <div className="mock-bar" style={{ width: '65%' }} />
                  <div className="row g-2 my-3">
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ background: 'var(--n-bg-alt)' }}>
                        <i className="bi bi-graph-up-arrow text-primary-custom fs-4" />
                        <div className="fw-bold text-navy mt-2 font-display">01:42:18</div>
                        <small className="text-slate">{t('home.mock.finish')}</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ background: 'var(--n-bg-alt)' }}>
                        <i className="bi bi-people text-primary-custom fs-4" />
                        <div className="fw-bold text-navy mt-2 font-display">12.4k</div>
                        <small className="text-slate">{t('home.mock.participants')}</small>
                      </div>
                    </div>
                  </div>
                  <div
                    className="mock-bar"
                    style={{
                      width: '100%',
                      height: 70,
                      borderRadius: 10,
                      background: 'linear-gradient(90deg, var(--n-bg-alt), var(--n-border))'
                    }}
                  />
                </div>
                <div className="hero-float-badge badge-1 d-none d-sm-flex">
                  <div className="icon-box icon-box-success" style={{ width: 36, height: 36, borderRadius: 10, fontSize: '1.1rem' }}>
                    <i className="bi bi-check-lg" />
                  </div>
                  <div>
                    {t('home.mock.accurate')}
                    <br />
                    <small className="text-slate fw-normal">{t('home.mock.accurateText')}</small>
                  </div>
                </div>
                <div className="hero-float-badge badge-2 d-none d-sm-flex">
                  <div className="icon-box icon-box-primary" style={{ width: 36, height: 36, borderRadius: 10, fontSize: '1.1rem' }}>
                    <i className="bi bi-lightning-charge-fill" />
                  </div>
                  <div>
                    {t('home.mock.realtime')}
                    <br />
                    <small className="text-slate fw-normal">{t('home.mock.realtimeText')}</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="stats-strip py-5 bg-white">
        <div className="container">
          <div className="row text-center g-4">
            {content.stats.map((stat, index) => (
              <div className="col-6 col-md-3 stat-item" key={stat.label}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="stat-number">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            title={t('home.latest.title')}
            action={
              <Link to="/results" className="card-link-arrow">
                {t('home.latest.action')} <i className="bi bi-arrow-right" />
              </Link>
            }
          />
          <div className="row g-4">
            {latestEvents.map((event, index) => (
              <div className="col-md-6 col-lg-4" key={event.slug}>
                <Reveal delay={index * 0.08}>
                  <Link to={`/events/${event.slug}`} className="portfolio-card d-block">
                    <SafeImage src={asset(event.cover)} alt={event.name} />
                    <div className="portfolio-overlay">
                      <span>{event.location}</span>
                      <h5>{event.name}</h5>
                    </div>
                  </Link>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading
            title={t('home.services.title')}
            subtitle={t('home.services.subtitle')}
            action={
              <Link to="/services" className="card-link-arrow">
                {t('home.services.action')} <i className="bi bi-arrow-right" />
              </Link>
            }
          />
          <div className="row g-4">
            {content.services.map((service, index) => (
              <div className="col-md-6 col-xxl-3" key={service.title}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="card-premium h-100">
                    <div className={`icon-box icon-box-${service.tone} mb-4`}>
                      <i className={`bi ${service.icon}`} />
                    </div>
                    <h3 className="card-title">{service.title}</h3>
                    <p className="mb-0">{service.body}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading center title={t('home.process.title')} subtitle={t('home.process.subtitle')} />
          <div className="row g-4">
            {content.process.map((step, index) => (
              <div className="col-md-6 col-xxl-3" key={step.number}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="process-step">
                    <span className="process-number">{step.number}</span>
                    <h3 className="card-title">{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading center title={t('home.partners.title')} subtitle={t('home.partners.subtitle')} />
          <div className="partner-strip">
            {content.partners.map((partner) => (
              <span className="partner-pill" key={partner}>
                {partner}
              </span>
            ))}
          </div>

          <div className="row g-4 mt-4">
            {content.testimonials.map((item, index) => (
              <div className="col-md-6 col-lg-4" key={item.author}>
                <Reveal delay={index * 0.08}>
                  <div className="testimonial-card">
                    <div className="mb-3 text-primary-custom">
                      {Array.from({ length: 5 }).map((_, star) => (
                        <i className="bi bi-star-fill me-1" key={star} />
                      ))}
                    </div>
                    <p className="quote">&ldquo;{item.quote}&rdquo;</p>
                    <div className="author">{item.author}</div>
                    <small className="text-slate">{item.role}</small>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <div className="row g-4 align-items-start">
            <div className="col-lg-4">
              <span className="eyebrow">FAQ</span>
              <h2 className="section-title">{t('home.faq.title')}</h2>
              <p className="section-subtitle">{t('home.faq.subtitle')}</p>
              <div className="d-flex gap-2 flex-wrap">
                <Link className="btn btn-primary" to="/faq">
                  {t('home.faq.all')}
                </Link>
                <Link className="btn btn-light-custom" to="/contact">
                  {t('home.faq.contact')}
                </Link>
              </div>
            </div>
            <div className="col-lg-8">
              {content.faqTeaser.map((item) => (
                <details className="faq-item" key={item.q}>
                  <summary>
                    {item.q}
                    <i className="bi bi-plus-lg" />
                  </summary>
                  <div className="faq-body">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
