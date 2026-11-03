import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import KioskApp from './KioskApp';
import type { KioskPayload } from './types';

const payload: KioskPayload = {
  mode: 'kiosk',
  configUrl: 'setting-bibcheck.json',
  assetBase: './'
};

describe('KioskApp', () => {
  it('renders the standby screen before the config is loaded', () => {
    const html = renderToStaticMarkup(<KioskApp payload={payload} />);

    expect(html).toContain('rt-kiosk');
    expect(html).toContain('text-layer');
    expect(html).toContain('data-db-keys="0"');
  });

  it('hides the overlay until a scan happens', () => {
    const html = renderToStaticMarkup(<KioskApp payload={payload} />);

    expect(html).toContain('class="overlay"');
    expect(html).toContain('display:none');
  });

  it('falls back to the standby background', () => {
    const html = renderToStaticMarkup(<KioskApp payload={payload} />);

    expect(html).toContain('background-image:url(&quot;./bg.png&quot;)');
  });
});
