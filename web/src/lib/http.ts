import { APP } from '../payload';

export class ApiError extends Error {
  status: number;
  fields?: Record<string, string>;

  constructor(message: string, status: number, fields?: Record<string, string>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
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

  const response = await fetch(`${APP.apiUrl}${path}`, {
    method,
    headers,
    body,
    credentials: 'include',
    signal: options.signal
  });

  let envelope: ApiEnvelope<T> | null = null;

  try {
    envelope = (await response.json()) as ApiEnvelope<T>;
  } catch {
    envelope = null;
  }

  if (!response.ok) {
    throw new ApiError(
      envelope?.error?.message || `Request gagal (HTTP ${response.status}).`,
      response.status,
      envelope?.error?.fields
    );
  }

  return envelope?.data as T;
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
