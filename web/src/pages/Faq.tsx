import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { EmptyBox, PageHeader } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';

export default function Faq() {
  const { t, content } = useI18n();
  const [query, setQuery] = useState('');

  const items = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (term === '') {
      return content.faq;
    }

    return content.faq.filter(
      (item) => item.q.toLowerCase().includes(term) || item.a.toLowerCase().includes(term)
    );
  }, [content.faq, query]);

  return (
    <>
      <PageHeader
        title={t('faq.title')}
        subtitle={t('faq.intro')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('faq.title') }]}
      />

      <section className="section pt-4">
        <div className="container" style={{ maxWidth: 860 }}>
          <div className="list-toolbar">
            <input
              className="form-control"
              type="search"
              value={query}
              placeholder={t('faq.searchPlaceholder')}
              aria-label={t('faq.searchPlaceholder')}
              onChange={(event) => setQuery(event.target.value)}
            />
            <span className="list-toolbar-count">{items.length}</span>
          </div>

          {items.length === 0 ? (
            <EmptyBox icon="bi-search" title={t('common.notFound')} description={t('faq.empty')} />
          ) : (
            items.map((item) => (
              <details className="faq-item" key={item.q}>
                <summary>
                  {item.q}
                  <i className="bi bi-plus-lg" />
                </summary>
                <div className="faq-body">{item.a}</div>
              </details>
            ))
          )}

          <div className="contact-card mt-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h2 className="h6 mb-1">{t('faq.helpTitle')}</h2>
                <p className="mb-0 text-slate small">{t('faq.helpText')}</p>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Link className="btn btn-primary" to="/contact">
                  {t('faq.helpCta')}
                </Link>
                <Link className="btn btn-light-custom" to="/results">
                  {t('footer.results')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
