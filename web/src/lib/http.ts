import { APP } from '../payload';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;
  /**
   * True when the request never reached a working JSON API (static hosting,
   * HTML fallback, 404/405 from the SPA rewrite, or a network failure). The
   * admin login uses this flag to fall back to the local static-mode session
   * instead of showing a raw HTTP error.
   */
  offline: boolean;

  constructor(message: string, status: number, fields?: Record<string, string>, offline = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
    this.offline = offline;
  }
}

/** True when the API is unreachable / not serving JSON (static deployment). */
export function isApiUnavailable(error: unknown): error is ApiError {
  return error instanceof ApiError && error.offline;
}

const CSRF_KEY = 'racetap-csrf';
let csrfToken = '';

try {
  csrfToken = window.sessionStorage.getItem(CSRF_KEY) || '';
} catch {
  csrfToken = '';
}

export function setCsrfToken(token: string | null): void {
  csrfToken = token || '';

  try {
    if (csrfToken) {
      window.sessionStorage.setItem(CSRF_KEY, csrfToken);
    } else {
      window.sessionStorage.removeItem(CSRF_KEY);
    }
  } catch {
    // Session storage may be blocked; in-memory token still works.
  }
}

export function getCsrfToken(): string {
  return csrfToken;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
}

interface ApiEnvelope<T> {
  data: T;
  error?: { message?: string; fields?: Record<string, string> };
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };

  if (method !== 'GET' && csrfToken) {
    headers['X-CSRF-TOKEN'] = csrfToken;
  }

  let body: BodyInit | undefined;

  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }

  let response: Response;

  try {
    response = await fetch(`${APP.apiUrl}${path}`, {
      method,
      headers,
      body,
      credentials: 'include',
      signal: options.signal
    });
  } catch (fetchError) {
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      throw fetchError;
    }

    throw new ApiError('Backend API tidak terjangkau dari deployment statis ini.', 0, undefined, true);
  }

  let envelope: ApiEnvelope<T> | null = null;

  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  // Static hosting answers every unknown path with the SPA shell (index.html):
  // POSTs get 405, GETs get 200 HTML. Neither carries a JSON envelope, so the
  // caller must treat them as "API unavailable", not as a normal API error.
  if (!envelope) {
    throw new ApiError(`Backend API tidak tersedia (HTTP ${response.status}).`, response.status, undefined, true);
  }

  if (!response.ok) {
    throw new ApiError(
      envelope.error?.message || `Request gagal (HTTP ${response.status}).`,
      response.status,
      envelope.error?.fields
    );
  }

  return envelope.data as T;
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Terjadi kesalahan. Coba lagi.';
}
