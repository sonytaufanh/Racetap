// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { ErrorBox, PageHeader, SafeImage } from './ui';
import { OFFLINE_ERROR_MESSAGE } from '../lib/http';

function render(header: JSX.Element) {
  return renderToStaticMarkup(<MemoryRouter>{header}</MemoryRouter>);
}

describe('PageHeader', () => {
  it('renders a compact header with breadcrumb, title and subtitle', () => {
    const html = render(
      <PageHeader
        title="Layanan Kami"
        subtitle="Solusi timing untuk setiap event."
        eyebrow="Layanan"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Layanan Kami' }]}
      />
    );

    expect(html).toContain('class="page-header"');
    expect(html).toContain('page-header-row');
    expect(html).toContain('page-header-subtitle');
    expect(html).toContain('page-header-eyebrow');
    expect(html).toContain('breadcrumb-custom');
    expect(html).toContain('href="/"');
    expect(html).toContain('Layanan Kami');
  });

  it('renders actions next to the copy', () => {
    const html = render(
      <PageHeader
        title="Kontak"
        actions={<a className="btn btn-light-custom" href="/contact">Hubungi</a>}
      />
    );

    expect(html).toContain('page-header-actions');
    expect(html).toContain('btn-light-custom');
  });

  it('keeps backwards compatible children', () => {
    const html = render(<PageHeader title="Photos"><div data-testid="extra">stats</div></PageHeader>);

    expect(html).toContain('page-header-extra');
    expect(html).toContain('stats');
  });
});

describe('SafeImage', () => {
  it('renders a normal image with its attributes', () => {
    const html = renderToStaticMarkup(
      <SafeImage src="/portfolio/ahy-run-2026.webp" alt="AHY Run" loading="lazy" />
    );

    expect(html).toContain('<img');
    expect(html).toContain('src="/portfolio/ahy-run-2026.webp"');
    expect(html).toContain('alt="AHY Run"');
    expect(html).toContain('loading="lazy"');
  });
});

describe('ErrorBox', () => {
  it('explains the static deployment instead of showing a raw HTTP error', () => {
    const html = renderToStaticMarkup(<ErrorBox message={OFFLINE_ERROR_MESSAGE} onRetry={() => undefined} />);

    expect(html).toContain('Data belum tersedia');
    expect(html).not.toContain('Backend API tidak tersedia');
  });

  it('keeps the retry UI for real API errors', () => {
    const html = render(<ErrorBox message="Request gagal (HTTP 500)." onRetry={() => undefined} />);

    expect(html).toContain('Data gagal dimuat');
    expect(html).toContain('Request gagal (HTTP 500).');
    expect(html).toContain('Coba lagi');
  });
});