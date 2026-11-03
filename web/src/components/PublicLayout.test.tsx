// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { PublicLayout } from './PublicLayout';
import { ToastProvider } from './Toast';
import { I18nProvider } from '../i18n/I18nProvider';

function render(lang: 'id' | 'en' = 'id') {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('racetap-lang', lang);
  }

  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/']}>
      <I18nProvider>
        <ToastProvider>
          <PublicLayout>
            <div>content</div>
          </PublicLayout>
        </ToastProvider>
      </I18nProvider>
    </MemoryRouter>
  );
}

describe('PublicLayout navigation', () => {
  it('keeps the primary navigation links', () => {
    const html = render();

    for (const href of ['/', '/about', '/services', '/results', '/photos', '/contact']) {
      expect(html, `missing nav link ${href}`).toContain(`href="${href}"`);
    }

    expect(html).toContain('nav-link-custom');
    expect(html).toContain('navbar-toggler');
  });

  it('translates the navigation labels', () => {
    const id = render('id');
    const en = render('en');

    expect(id).toContain('>Tentang<');
    expect(id).toContain('>Layanan<');
    expect(id).toContain('>Hasil<');

    expect(en).toContain('>About<');
    expect(en).toContain('>Services<');
    expect(en).toContain('>Results<');
  });

  it('exposes language, search, theme and WhatsApp actions', () => {
    const html = render();

    expect(html).toContain('lang-toggle');
    expect(html).toContain('aria-label="Cari event atau pelari"');
    expect(html).toContain('theme-toggle');
    expect(html).toContain('wa.me');
    expect(html).toContain('social-whatsapp');
    expect(html).toContain('social-instagram');
    expect(html).toContain('social-tiktok');
  });
});
