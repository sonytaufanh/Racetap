// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminProvider } from './AdminContext';
import Login from './Login';
import { hashPassword, saveLocalAccount } from './localAuth';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/** Static hosting answers every unknown route with the SPA shell (HTML). */
function htmlResponse(): Response {
  return {
    ok: true,
    status: 200,
    json: async () => {
      throw new SyntaxError('Unexpected token < in JSON');
    }
  } as unknown as Response;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

function setValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

  setter?.call(input, value);
  input.dispatchEvent(new window.Event('input', { bubbles: true }));
}

async function submitLogin(container: HTMLElement, username: string, password: string): Promise<void> {
  const usernameInput = container.querySelector<HTMLInputElement>('#username');
  const passwordInput = container.querySelector<HTMLInputElement>('#password');

  expect(usernameInput).not.toBeNull();
  expect(passwordInput).not.toBeNull();

  act(() => {
    setValue(usernameInput!, username);
    setValue(passwordInput!, password);
  });

  const form = container.querySelector('form');

  expect(form).not.toBeNull();

  await act(async () => {
    form!.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  });

  await flush();
}

describe('Login on a static deployment (no API)', () => {
  let container: HTMLDivElement;
  let root: Root;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();

    fetchMock = vi.fn(async () => htmlResponse());
    vi.stubGlobal('fetch', fetchMock);

    saveLocalAccount({
      username: 'admin',
      display_name: 'Super Admin',
      password_hash: await hashPassword('rahasia123')
    });

    container = document.createElement('div');
    document.body.appendChild(container);

    root = createRoot(container);

    act(() => {
      root.render(
        <MemoryRouter initialEntries={['/admin/login']}>
          <AdminProvider>
            <Routes>
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<div>dashboard-ok</div>} />
            </Routes>
          </AdminProvider>
        </MemoryRouter>
      );
    });

    await flush();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('hides the HTTP 405 and signs in with the local account', async () => {
    expect(container.textContent).toContain('Mode statis');

    await submitLogin(container, 'admin', 'rahasia123');

    expect(container.textContent).toContain('dashboard-ok');
    // Only the boot session probe hits the network; the login itself never
    // posts to the static host (that used to return HTTP 405).
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects a wrong password without leaving the login page', async () => {
    await submitLogin(container, 'admin', 'salah-sekali');

    expect(container.textContent).toContain('Username atau password salah');
    expect(container.textContent).not.toContain('dashboard-ok');
  });
});
