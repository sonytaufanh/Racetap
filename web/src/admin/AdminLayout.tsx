import { useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/http';
import { Loading } from '../components/ui';
import { useAdmin } from './AdminContext';

export default function AdminLayout() {
  const { session, loading, setSession, refresh } = useAdmin();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  if (loading && !session) {
    return <Loading label="Memeriksa sesi admin..." />;
  }

  if (!session?.admin) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = async () => {
    setLoggingOut(true);
    setError('');

    try {
      await api('/auth/logout', { method: 'POST' });
      setSession(null);
      await refresh();
      navigate('/admin/login', { replace: true });
    } catch (logoutError) {
      setError(errorMessage(logoutError));
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <div className="rt-admin">
      <aside className="rt-admin-sidebar">
        <Link to="/admin/races" className="fw-bold fs-5 mb-4 text-white text-decoration-none">
          RaceTap<span style={{ color: 'var(--n-primary)' }}>.</span> Admin
        </Link>
        <NavLink to="/admin/races" className={({ isActive }) => (isActive ? 'active' : '')}>
          <i className="bi bi-stopwatch" /> Races
        </NavLink>
        <NavLink to="/admin/photos" className={({ isActive }) => (isActive ? 'active' : '')}>
          <i className="bi bi-images" /> Photos
        </NavLink>
        <a href="/v2" target="_blank" rel="noopener noreferrer">
          <i className="bi bi-box-arrow-up-right" /> Lihat situs
        </a>
        <div className="mt-auto pt-4 small" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <div className="mb-2">{session.admin.display_name}</div>
          <button className="btn btn-sm btn-outline-light w-100" type="button" onClick={logout} disabled={loggingOut}>
            {loggingOut ? 'Keluar...' : 'Logout'}
          </button>
        </div>
      </aside>
      <main className="rt-admin-main">
        {error && <div className="alert alert-danger py-2">{error}</div>}
        <Outlet />
      </main>
    </div>
  );
}
