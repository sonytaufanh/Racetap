import { PageHeader } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

export function Privacy() {
  return <LegalPage page="privacy" />;
}

export function Terms() {
  return <LegalPage page="terms" />;
}

function LegalPage({ page }: { page: 'privacy' | 'terms' }) {
  const { t, content } = useI18n();
  const doc = content.legal[page];

  return (
    <>
      <PageHeader
        title={t(page === 'privacy' ? 'legal.privacy' : 'legal.terms')}
        subtitle={doc.updated}
        crumbs={[{ label: 'Home', to: '/' }, { label: doc.title }]}
      />
      <section className="section pt-4">
        <div className="container" style={{ maxWidth: 860 }}>
          {doc.sections.map((section) => (
            <div className="mb-4" key={section.heading}>
              <h2 className="h5">{section.heading}</h2>
              <p className="mb-0">{section.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
