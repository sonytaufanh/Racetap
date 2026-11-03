import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { PageHeader, SectionHeading } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

export default function Services() {
  const { t, content } = useI18n();

  return (
    <>
      <PageHeader
        title={t('services.title')}
        subtitle={t('services.subtitle')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('services.title') }]}
      />

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading title={t('services.heading')} subtitle={t('services.subtitle')} />
          <div className="row g-4">
            {content.services.map((service, index) => (
              <div className="col-md-6" key={service.title}>
                <Reveal delay={(index % 2) * 0.08}>
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

          <div className="row g-3 mt-1">
            {content.serviceHighlights.map((item) => (
              <div className="col-md-4" key={item}>
                <div className="service-highlight">
                  <i className="bi bi-check-circle-fill" />
                  {item}
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
