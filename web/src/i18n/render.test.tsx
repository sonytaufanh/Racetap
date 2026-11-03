// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { I18nProvider, useI18n } from './I18nProvider';

function Probe() {
  const { t, lang, content } = useI18n();

  return (
    <div>
      <span data-testid="lang">{lang}</span>
      <span data-testid="cta">{t('home.hero.cta')}</span>
      <span data-testid="selected">{t('photo.selectedCount', { count: 3 })}</span>
      <span data-testid="service">{content.services[0].title}</span>
    </div>
  );
}

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('defaults to Indonesian without a stored preference', () => {
    Object.defineProperty(window.navigator, 'language', { value: 'id-ID', configurable: true });
    const html = renderToStaticMarkup(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(html).toContain('Hubungi Kami');
    expect(html).toContain('RFID Timing System');
  });

  it('renders English when the stored language is en', () => {
    window.localStorage.setItem('racetap-lang', 'en');
    const html = renderToStaticMarkup(
      <I18nProvider>
        <Probe />
      </I18nProvider>
    );

    expect(html).toContain('Contact us');
    expect(html).toContain('3 selected');
  });

  it('falls back to the default dictionary outside a provider', () => {
    const html = renderToStaticMarkup(<Probe />);

    expect(html).toContain('Hubungi Kami');
  });
});
