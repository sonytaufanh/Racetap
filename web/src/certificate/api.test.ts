// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  canIssueCertificate,
  certificateAssetUrl,
  loadPublicCertificate,
  parsePublicCertificate,
  resultsAssetBase
} from './api';
import type { CertificateConfig } from './types';
import type { Participant } from '../results/types';

const participant = { finisher: 1 } as Participant;
const nonFinisher = { finisher: -3 } as Participant;

function config(overrides: Partial<CertificateConfig> = {}): CertificateConfig {
  return {
    version: 1,
    slug: 'jember-10k',
    enabled: true,
    onlyFinishers: true,
    template: 'certificate.png',
    width: 2100,
    height: 1480,
    background: '#ffffff',
    eventName: 'Jember 10K',
    eventDate: '2026-08-17',
    pdf: { size: 'template' },
    fields: [],
    ...overrides
  };
}

describe('resultsAssetBase', () => {
  /**
   * The editor must request the artwork from its own origin. Using the absolute
   * template_url from the API made the image cross-origin behind the Vite dev
   * server, so `crossOrigin='anonymous'` failed and the canvas stayed blank.
   */
  it('returns an origin-relative base ending in the encoded slug', () => {
    const base = resultsAssetBase('Dogathlon-3.0-Dog-Obstacle-Run');

    expect(base.startsWith('/')).toBe(true);
    expect(base.endsWith('/Dogathlon-3.0-Dog-Obstacle-Run/')).toBe(true);
    expect(base).not.toContain('http://');
    expect(base).not.toContain('https://');
  });

  it('builds the template URL inside that base and encodes the file name', () => {
    const base = resultsAssetBase('jember-10k');

    expect(certificateAssetUrl('jember-10k', 'certificate.webp')).toBe(`${base}certificate.webp`);
    expect(certificateAssetUrl('jember-10k', 'certificate copy.png')).toBe(`${base}certificate%20copy.png`);
  });

  it('returns null when the event has no template', () => {
    expect(certificateAssetUrl('jember-10k', null)).toBeNull();
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('canIssueCertificate', () => {
  it('requires an enabled config with an uploaded template', () => {
    expect(canIssueCertificate(null, participant)).toBe(false);
    expect(canIssueCertificate({ config: config({ enabled: false }), templateUrl: 'x' }, participant)).toBe(false);
    expect(canIssueCertificate({ config: config({ template: null }), templateUrl: null }, participant)).toBe(false);
  });

  it('limits finishers when onlyFinishers is set', () => {
    const hosted = { config: config(), templateUrl: 'certificate.png' };

    expect(canIssueCertificate(hosted, participant)).toBe(true);
    expect(canIssueCertificate(hosted, nonFinisher)).toBe(false);
    expect(canIssueCertificate({ config: config({ onlyFinishers: false }), templateUrl: 'x' }, nonFinisher)).toBe(true);
  });
});

describe('parsePublicCertificate', () => {
  it('accepts a well formed payload', () => {
    expect(parsePublicCertificate(config())).not.toBeNull();
  });

  it('rejects malformed payloads so the viewer can fall back', () => {
    expect(parsePublicCertificate(null)).toBeNull();
    expect(parsePublicCertificate('nope')).toBeNull();
    expect(parsePublicCertificate({ width: 100, height: 100 })).toBeNull();
    expect(parsePublicCertificate({ width: 0, height: 100, fields: [] })).toBeNull();
    expect(parsePublicCertificate({ width: 100, height: 100, fields: 'x' })).toBeNull();
  });
});

describe('loadPublicCertificate', () => {
  const jsonResponse = (body: unknown) => ({
    ok: true,
    headers: { get: () => 'application/json; charset=utf-8' },
    json: async () => body
  });

  it('builds the template URL relative to the results folder', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(config({ template: 'certificate.webp' }))));

    const loaded = await loadPublicCertificate('/results/jember-10k/');

    expect(loaded?.templateUrl).toBe('/results/jember-10k/certificate.webp');
  });

  it('returns null when the event has no certificate file', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, headers: { get: () => '' }, json: async () => ({}) })));

    expect(await loadPublicCertificate('./')).toBeNull();
  });

  it('ignores the SPA shell served for a missing static file', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        headers: { get: () => 'text/html; charset=UTF-8' },
        json: async () => {
          throw new Error('not json');
        }
      }))
    );

    expect(await loadPublicCertificate('./')).toBeNull();
  });

  it('returns null when the certificate is disabled', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(config({ enabled: false }))));

    expect(await loadPublicCertificate('./')).toBeNull();
  });

  it('never throws when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new Error('offline');
    }));

    expect(await loadPublicCertificate('./')).toBeNull();
  });
});
