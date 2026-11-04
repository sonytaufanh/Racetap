// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  endLocalSession,
  hashPassword,
  offlineLogin,
  readLocalAccount,
  readLocalSession,
  saveLocalAccount,
  startLocalSession
} from './localAuth';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
});

describe('offline admin auth', () => {
  it('never stores the plaintext password', async () => {
    saveLocalAccount({ username: 'admin', display_name: 'Admin', password_hash: await hashPassword('rahasia123') });

    const account = readLocalAccount();

    expect(account).not.toBeNull();
    expect(account?.password_hash).not.toContain('rahasia123');
    expect(account?.password_hash.length).toBeGreaterThan(8);
  });

  it('rejects unknown accounts and wrong credentials', async () => {
    expect(await offlineLogin('admin', 'rahasia123')).toEqual({ ok: false, reason: 'no-account' });

    saveLocalAccount({ username: 'admin', display_name: 'Admin', password_hash: await hashPassword('rahasia123') });

    expect(await offlineLogin('admin', 'salah')).toEqual({ ok: false, reason: 'invalid' });
    expect(await offlineLogin('operator', 'rahasia123')).toEqual({ ok: false, reason: 'invalid' });
  });

  it('starts a session on valid credentials and keeps the account after logout', async () => {
    saveLocalAccount({
      username: 'admin',
      display_name: 'Super Admin',
      password_hash: await hashPassword('rahasia123')
    });

    const result = await offlineLogin('admin', 'rahasia123');

    expect(result.ok).toBe(true);

    if (result.ok) {
      expect(result.session.admin?.username).toBe('admin');
      expect(result.session.admin?.display_name).toBe('Super Admin');
      expect(result.session.admin?.role).toBe('superadmin');
      expect(result.session.has_admin).toBe(true);
    }

    expect(readLocalSession()?.admin?.username).toBe('admin');

    endLocalSession();

    expect(readLocalSession()).toBeNull();
    expect(readLocalAccount()).not.toBeNull();
  });

  it('exposes the started session through sessionStorage', async () => {
    saveLocalAccount({ username: 'admin', display_name: 'Admin', password_hash: await hashPassword('rahasia123') });

    const account = readLocalAccount();

    expect(account).not.toBeNull();

    const session = startLocalSession(account!);

    expect(readLocalSession()).toEqual(session);
  });
});
