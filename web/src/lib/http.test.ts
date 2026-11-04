// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, OFFLINE_ERROR_MESSAGE, api, isApiUnavailable } from './http';

function envelopeResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  } as unknown as Response;
}

function htmlResponse(status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    }
  } as unknown as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('api() on static hosting', () => {
  it('flags the SPA shell (HTML 200) as API unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(200)));

    const error = await api('/auth/session').catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(isApiUnavailable(error)).toBe(true);
    expect((error as ApiError).message).toContain(OFFLINE_ERROR_MESSAGE);
  });

  it('flags a 405 on POST to the SPA rewrite as API unavailable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => htmlResponse(405)));

    const error = await api('/auth/login', { method: 'POST', body: { username: 'a', password: 'b' } }).catch(
      (caught: unknown) => caught
    );

    expect(isApiUnavailable(error)).toBe(true);
    expect((error as ApiError).status).toBe(405);
    expect((error as ApiError).message).toContain(OFFLINE_ERROR_MESSAGE);
  });

  it('flags network failures as API unavailable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch');
      })
    );

    const error = await api('/auth/session').catch((caught: unknown) => caught);

    expect(isApiUnavailable(error)).toBe(true);
    expect((error as ApiError).status).toBe(0);
    expect((error as ApiError).message).toContain(OFFLINE_ERROR_MESSAGE);
  });

  it('keeps real JSON errors (401) as normal API errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        envelopeResponse(
          { data: null, error: { message: 'Username atau password salah, atau akun tidak aktif.' } },
          401
        )
      )
    );

    const error = await api('/auth/login', { method: 'POST', body: {} }).catch((caught: unknown) => caught);

    expect(isApiUnavailable(error)).toBe(false);
    expect((error as ApiError).status).toBe(401);
    expect((error as ApiError).message).toContain('Username atau password salah');
  });

  it('returns the envelope data for a healthy API', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () =>
        envelopeResponse({
          data: { has_admin: true, admin: { id: 1, username: 'admin', display_name: 'Admin' }, csrf_token: 'tok' }
        })
      )
    );

    const data = await api<{ has_admin: boolean }>('/auth/session');

    expect(data.has_admin).toBe(true);
  });
});
