import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { PageHeader, SectionHeading } from '../components/ui';
import { asset } from '../payload';
import { useI18n } from '../i18n/I18nProvider';

export default function About() {
  const { t, content } = useI18n();

  return (
    <>
      <PageHeader
        title={t('about.title')}
        subtitle={t('about.p1')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('about.title') }]}
      />

      <section className="section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <Reveal>
                <img
                  src={asset('assets/images/racetap.png')}
                  className="rounded-img w-100"
                  alt={t('about.imageAlt')}
                  style={{ aspectRatio: '5 / 4', objectFit: 'cover' }}
                />
              </Reveal>
            </div>
            <div className="col-lg-6">
              <Reveal>
                <h2 className="section-title">{t('about.heading')}</h2>
                <p className="section-subtitle mb-3">{t('about.p1')}</p>
                <p className="mb-4">{t('about.p2')}</p>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box icon-box-primary">
                        <i className="bi bi-calendar-check" />
                      </div>
                      <div>
                        <strong className="text-navy d-block">{t('about.raceTiming')}</strong>
                        <small className="text-slate">{t('about.raceTimingText')}</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box icon-box-success">
                        <i className="bi bi-globe" />
                      </div>
                      <div>
                        <strong className="text-navy d-block">{t('about.digital')}</strong>
                        <small className="text-slate">{t('about.digitalText')}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading center title={t('about.valuesTitle')} />
          <div className="row g-4">
            {content.aboutValues.map((value, index) => (
              <div className="col-md-6 col-xxl-3" key={value.title}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="card-premium text-center">
                    <div className={`icon-box icon-box-${value.tone} mx-auto mb-3`}>
                      <i className={`bi ${value.icon}`} />
                    </div>
                    <h3 className="card-title">{value.title}</h3>
                    <p>{value.body}</p>
                  </div>
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
