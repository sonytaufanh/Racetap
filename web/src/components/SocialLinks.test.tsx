// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SocialLinks } from './SocialLinks';
import { DEFAULT_SETTINGS, type SiteSettings } from '../hooks/useSettings';

function render(overrides: Partial<SiteSettings> = {}) {
  return renderToStaticMarkup(<SocialLinks settings={{ ...DEFAULT_SETTINGS, ...overrides }} />);
}

describe('SocialLinks', () => {
  it('renders every brand including Instagram and TikTok', () => {
    const html = render();

    for (const brand of ['whatsapp', 'instagram', 'tiktok', 'youtube', 'facebook']) {
      expect(html, `missing ${brand}`).toContain(`social-${brand}`);
      expect(html).toContain('<svg');
    }

    expect(html).toContain('aria-label="WhatsApp"');
    expect(html).toContain('aria-label="Instagram"');
    expect(html).toContain('aria-label="TikTok"');
  });

  it('uses the configured profile URLs', () => {
    const html = render({
      instagram: 'https://www.instagram.com/racetap.id/',
      tiktok: 'https://www.tiktok.com/@racetap.id',
      youtube: 'https://www.youtube.com/@racetap'
    });

    expect(html).toContain('https://www.instagram.com/racetap.id/');
    expect(html).toContain('https://www.tiktok.com/@racetap.id');
    expect(html).toContain('https://www.youtube.com/@racetap');
  });

  it('opens links in a new tab and falls back to the platform home', () => {
    const html = render();

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('https://www.instagram.com/');
    expect(html).toContain('https://www.tiktok.com/');
    expect(html).toContain('https://wa.me/6281249374648');
  });
});
