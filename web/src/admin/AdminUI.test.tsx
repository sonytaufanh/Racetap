// @vitest-environment jsdom
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminError } from './AdminUI';
import { OFFLINE_ERROR_MESSAGE } from '../lib/http';

describe('AdminError', () => {
  it('renders the static-mode panel when the API is unavailable', () => {
    const html = renderToStaticMarkup(<AdminError message={OFFLINE_ERROR_MESSAGE} onRetry={() => undefined} />);

    expect(html).toContain('Mode statis');
    expect(html).not.toContain('Data gagal dimuat');
  });

  it('renders the raw message for real API failures', () => {
    const html = renderToStaticMarkup(<AdminError message="Request gagal (HTTP 500)." />);

    expect(html).toContain('Data gagal dimuat');
    expect(html).toContain('Request gagal (HTTP 500).');
  });
});
