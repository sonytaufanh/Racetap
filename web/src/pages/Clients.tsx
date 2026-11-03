import { Link } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { PageHeader, SectionHeading } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

export default function Clients() {
  const { t, content } = useI18n();
  const { testimonials, partners, stats } = content.clients;

  return (
    <>
      <PageHeader
        title={t('clients.title')}
        subtitle={t('clients.subtitle')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('clients.title') }]}
        actions={
          <Link className="btn btn-light-custom" to="/contact">
            <i className="bi bi-envelope me-1" /> {t('home.faq.contact')}
          </Link>
        }
      />

      <section className="section pt-0">
        <div className="container">
          <SectionHeading center title={t('clients.heading')} subtitle={t('clients.subtitle')} />
          <div className="partner-strip mb-5">
            {partners.map((partner) => (
              <span className="partner-pill" key={partner}>
                {partner}
              </span>
            ))}
          </div>

          <div className="row g-4">
            {testimonials.map((item, index) => (
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
          <div className="row g-4 text-center">
            {stats.map((stat) => (
              <div className="col-6 col-md-3" key={stat.label}>
                <div className="rt-stat-card justify-content-center">
                  <div>
                    <div className="rt-stat-value">{stat.value}</div>
                    <div className="rt-stat-label">{stat.label}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
