import type { AdminUser, SessionPayload } from '../types';

/**
 * Offline (static hosting) admin auth.
 *
 * The Vercel deployment ships the frontend without the PHP API, so when the
 * API is unavailable the CMS falls back to an account + session stored in the
 * browser. This only unlocks the CMS shell for preview/demo purposes: real
 * data lives behind the API and is never exposed by this module.
 */

const ACCOUNT_KEY = 'racetap-admin-offline-account';
const SESSION_KEY = 'racetap-admin-offline-session';
const SALT = 'racetap-offline-v1';

export interface LocalAdminAccount {
  username: string;
  display_name: string;
  password_hash: string;
}

export type OfflineLoginResult =
  | { ok: true; session: SessionPayload }
  | { ok: false; reason: 'no-account' | 'invalid' };

function localStore(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function fallbackHash(value: string): string {
  let hash = 5381;

  for (let index = 0; index < value.length; index += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(index);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** SHA-256 when the browser exposes WebCrypto (all secure contexts); djb2 otherwise. */
export async function hashPassword(password: string): Promise<string> {
  const value = `${SALT}:${password}`;

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));

    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  return fallbackHash(value);
}

export function readLocalAccount(): LocalAdminAccount | null {
  const store = localStore();

  if (!store) {
    return null;
  }

  try {
    const raw = store.getItem(ACCOUNT_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<LocalAdminAccount>;

    if (typeof parsed.username !== 'string' || typeof parsed.password_hash !== 'string') {
      return null;
    }

    return {
      username: parsed.username,
      display_name:
        typeof parsed.display_name === 'string' && parsed.display_name !== '' ? parsed.display_name : parsed.username,
      password_hash: parsed.password_hash
    };
  } catch {
    return null;
  }
}

export function saveLocalAccount(account: LocalAdminAccount): void {
  const store = localStore();

  if (store) {
    store.setItem(ACCOUNT_KEY, JSON.stringify(account));
  }
}

export function readLocalSession(): SessionPayload | null {
  const store = sessionStore();

  if (!store) {
    return null;
  }

  try {
    const raw = store.getItem(SESSION_KEY);

    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<SessionPayload>;
    const admin = parsed.admin as AdminUser | null | undefined;

    if (!admin || typeof admin.username !== 'string') {
      return null;
    }

    return {
      admin,
      has_admin: parsed.has_admin !== false,
      csrf_token: typeof parsed.csrf_token === 'string' ? parsed.csrf_token : ''
    };
  } catch {
    return null;
  }
}

export function startLocalSession(account: LocalAdminAccount): SessionPayload {
  const session: SessionPayload = {
    admin: {
      id: 0,
      username: account.username,
      display_name: account.display_name,
      role: 'superadmin'
    },
    has_admin: true,
    csrf_token: ''
  };

  const store = sessionStore();

  if (store) {
    store.setItem(SESSION_KEY, JSON.stringify(session));
  }

  return session;
}

export function endLocalSession(): void {
  const store = sessionStore();

  if (store) {
    store.removeItem(SESSION_KEY);
  }
}

export async function offlineLogin(username: string, password: string): Promise<OfflineLoginResult> {
  const account = readLocalAccount();

  if (!account) {
    return { ok: false, reason: 'no-account' };
  }

  if (account.username !== username.trim()) {
    return { ok: false, reason: 'invalid' };
  }

  const hash = await hashPassword(password);

  if (hash !== account.password_hash) {
    return { ok: false, reason: 'invalid' };
  }

  return { ok: true, session: startLocalSession(account) };
}
