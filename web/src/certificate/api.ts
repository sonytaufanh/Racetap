import { api } from '../lib/http';
import { APP } from '../payload';
import type { Participant } from '../results/types';
import type {
  CertificateConfig,
  CertificateEventPayload,
  CertificateEventRow,
  CertificateSample
} from './types';

/**
 * Origin-relative folder that holds an event's published artifacts.
 *
 * The editor must not use the absolute `template_url` the API returns: in
 * development the admin runs on the Vite origin while the API answers with the
 * PHP origin, so the image would be cross-origin (the PHP dev server sends no
 * CORS headers), the load would fail and the canvas would come up blank. Only
 * the path part of the configured base URL is kept, which is same-origin by
 * construction and still works for subdirectory installs; Vite maps
 * `/results-dev/...` back onto `results/<slug>/` on disk.
 */
export function resultsAssetBase(slug: string): string {
  if (import.meta.env.DEV) {
    return `/results-dev/${encodeURIComponent(slug)}/`;
  }

  return `${sitePath()}results/${encodeURIComponent(slug)}/`;
}

/** Path part of APP.baseUrl, always starting and ending with a slash. */
function sitePath(): string {
  const raw = APP.baseUrl || '/';

  try {
    const parsed = new URL(raw, 'http://localhost/');
    const path = parsed.pathname || '/';

    return path.endsWith('/') ? path : `${path}/`;
  } catch {
    return '/';
  }
}

export function certificateAssetUrl(slug: string, file: string | null): string | null {
  if (!file) {
    return null;
  }

  return `${resultsAssetBase(slug)}${encodeURI(file)}`;
}

export interface CertificateListPayload {
  events: CertificateEventRow[];
}

export function listCertificates(): Promise<CertificateListPayload> {
  return api<CertificateListPayload>('/admin/certificates');
}

export function getCertificate(slug: string): Promise<CertificateEventPayload> {
  return api<CertificateEventPayload>(`/admin/certificates/${encodeURIComponent(slug)}`);
}

export function saveCertificate(slug: string, config: CertificateConfig): Promise<CertificateEventPayload> {
  return api<CertificateEventPayload>(`/admin/certificates/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    body: config
  });
}

export interface CertificateTemplatePayload extends CertificateEventPayload {
  template: string;
  width: number;
  height: number;
}

export function uploadCertificateTemplate(slug: string, file: File): Promise<CertificateTemplatePayload> {
  const form = new FormData();
  form.append('template', file);

  return api<CertificateTemplatePayload>(`/admin/certificates/${encodeURIComponent(slug)}/template`, {
    method: 'POST',
    form
  });
}

export function deleteCertificate(slug: string): Promise<{ deleted: boolean; removed: string[] }> {
  return api<{ deleted: boolean; removed: string[] }>(`/admin/certificates/${encodeURIComponent(slug)}`, {
    method: 'DELETE'
  });
}

export function getCertificateSample(slug: string, limit = 60): Promise<CertificateSample> {
  return api<CertificateSample>(
    `/admin/certificates/${encodeURIComponent(slug)}/sample?limit=${encodeURIComponent(String(limit))}`
  );
}

export interface PublicCertificate {
  config: CertificateConfig;
  templateUrl: string | null;
}

/**
 * True when this participant can download a certificate hosted by Racetap
 * instead of being sent to the timing provider.
 */
export function canIssueCertificate(
  certificate: PublicCertificate | null,
  participant: Participant
): boolean {
  if (!certificate || !certificate.config.enabled || certificate.config.template === null) {
    return false;
  }

  if (!certificate.config.onlyFinishers) {
    return true;
  }

  return participant.finisher === 1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Shape check so a hand-edited certificate.json can never break the viewer. */
export function parsePublicCertificate(raw: unknown): CertificateConfig | null {
  if (!isRecord(raw) || !Array.isArray(raw.fields)) {
    return null;
  }

  const width = Number(raw.width);
  const height = Number(raw.height);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return null;
  }

  return raw as unknown as CertificateConfig;
}

/**
 * Loads results/<slug>/certificate.json next to data.json. Any failure (404,
 * offline, malformed) simply means "this event has no host certificate" and the
 * viewer falls back to the timing provider link.
 */
export async function loadPublicCertificate(
  assetBase: string,
  signal?: AbortSignal
): Promise<PublicCertificate | null> {
  if (typeof fetch !== 'function') {
    return null;
  }

  try {
    const response = await fetch(`${assetBase}certificate.json`, {
      signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      return null;
    }

    // Missing files fall through to the SPA shell (HTTP 200 text/html), so the
    // content type has to be checked before trusting the body.
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('json')) {
      return null;
    }

    const config = parsePublicCertificate(await response.json());

    if (!config || !config.enabled) {
      return null;
    }

    return {
      config,
      templateUrl: config.template ? `${assetBase}${encodeURI(config.template)}` : null
    };
  } catch {
    return null;
  }
}
