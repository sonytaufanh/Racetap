// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { QuickResultSearch } from './QuickResultSearch';
import { I18nProvider } from '../i18n/I18nProvider';

function render(lang: 'id' | 'en' = 'id') {
  window.localStorage.setItem('racetap-lang', lang);

  return renderToStaticMarkup(
    <MemoryRouter>
      <I18nProvider>
        <QuickResultSearch />
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('QuickResultSearch', () => {
  it('renders the search field with the localized placeholder', () => {
    const html = render('id');

    expect(html).toContain('quick-search');
    expect(html).toContain('Cek hasil lomba');
    expect(html).toContain('placeholder="BIB atau nama pelari"');
    expect(html).toContain('type="search"');
  });

  it('renders English copy when selected', () => {
    const html = render('en');

    expect(html).toContain('Check your race result');
    expect(html).toContain('placeholder="Bib or runner name"');
  });
});
