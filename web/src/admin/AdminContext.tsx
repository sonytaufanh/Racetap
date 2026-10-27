import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, errorMessage, setCsrfToken } from '../lib/http';
import type { SessionPayload } from '../types';

interface AdminContextValue {
  session: SessionPayload | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<SessionPayload | null>;
  setSession: (session: SessionPayload | null) => void;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const applySession = useCallback((next: SessionPayload | null) => {
    setSessionState(next);
    setCsrfToken(next?.csrf_token || null);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const next = await api<SessionPayload>('/auth/session');
      applySession(next);
      setError('');
      return next;
    } catch (refreshError) {
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
    () => ({ session, loading, error, refresh, setSession: applySession }),
    [session, loading, error, refresh, applySession]
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
