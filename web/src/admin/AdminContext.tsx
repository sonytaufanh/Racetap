import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, api, errorMessage, isApiUnavailable, setCsrfToken } from '../lib/http';
import { readLocalAccount, readLocalSession } from './localAuth';
import type { SessionPayload } from '../types';

interface AdminContextValue {
  session: SessionPayload | null;
  loading: boolean;
  error: string;
  /**
   * True when the JSON API is unreachable (static Vercel deployment) and the
   * admin session is verified locally in the browser instead of by PHP.
   */
  offline: boolean;
  refresh: () => Promise<SessionPayload | null>;
  setSession: (session: SessionPayload | null) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [offline, setOffline] = useState(false);

  const applySession = useCallback((next: SessionPayload | null) => {
    setSessionState(next);
    setCsrfToken(next?.csrf_token || null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const next = await api<SessionPayload>('/auth/session');

      if (!next || typeof next.has_admin !== 'boolean') {
        throw new ApiError('Respons sesi API tidak valid.', 200, undefined, true);
      }

      applySession(next);
      setOffline(false);
      setError('');
      return next;
    } catch (refreshError) {
      if (isApiUnavailable(refreshError)) {
        const account = readLocalAccount();
        const local = account ? readLocalSession() : null;
        const payload: SessionPayload = {
          admin: local?.admin ?? null,
          has_admin: account !== null,
          csrf_token: ''
        };

        applySession(payload);
        setOffline(true);
        setError('');
        return payload;
      }

      setError(errorMessage(refreshError));
      return null;
    } finally {
      setLoading(false);
    }
  }, [applySession]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ session, loading, error, offline, refresh, setSession: applySession }),
    [session, loading, error, offline, refresh, applySession]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);

  if (!context) {
    throw new Error('useAdmin must be used inside AdminProvider');
  }

  return context;
}
