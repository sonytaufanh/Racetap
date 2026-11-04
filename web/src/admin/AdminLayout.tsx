import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api, errorMessage, isApiUnavailable } from '../lib/http';
import { Loading } from '../components/ui';
import { useConfirm } from './AdminUI';
import { useAdmin } from './AdminContext';
import { endLocalSession } from './localAuth';

interface NavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  superadmin?: boolean;
}

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: 'Operasional',
    items: [
      { to: '/admin', label: 'Dashboard', icon: 'bi-speedometer2', end: true },
      { to: '/admin/races', label: 'Races', icon: 'bi-stopwatch' },
      { to: '/admin/sertifikat', label: 'Sertifikat', icon: 'bi-award' },
      { to: '/admin/photos', label: 'Photos', icon: 'bi-images' },
      { to: '/admin/leads', label: 'Pesan', icon: 'bi-envelope-paper' }
    ]
  },
  {
    label: 'Sistem',
    items: [
      { to: '/admin/audit', label: 'Audit Log', icon: 'bi-clock-history' },
      { to: '/admin/settings', label: 'Pengaturan', icon: 'bi-sliders' },
      { to: '/admin/users', label: 'Pengguna', icon: 'bi-people', superadmin: true }
    ]
  }
];

function currentTitle(pathname: string): string {
  const items = NAV_GROUPS.flatMap((group) => group.items)
    .filter((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)))
    .sort((a, b) => b.to.length - a.to.length);

  return items[0]?.label || 'Admin';
}

export default function AdminLayout() {
  const { session, loading, setSession, refresh, offline } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [navOpen, setNavOpen] = useState(false);
  const { confirm, dialog } = useConfirm();

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNavOpen(false);
      }
    };

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [navOpen]);

  if (loading && !session) {
    return <Loading label="Memeriksa sesi admin..." />;
  }

  if (!session?.admin) {
    return <Navigate to="/admin/login" replace />;
  }

  const logout = async () => {
    setError('');

    if (offline) {
      endLocalSession();
      setSession(null);
      navigate('/admin/login', { replace: true });
      return;
    }

    try {
      await api('/auth/logout', { method: 'POST' });
      setSession(null);
      await refresh();
      navigate('/admin/login', { replace: true });
    } catch (logoutError) {
      if (isApiUnavailable(logoutError)) {
        setSession(null);
        navigate('/admin/login', { replace: true });
        return;
      }

      setError(errorMessage(logoutError));
    }
  };

  const askLogout = () =>
    confirm({
      title: 'Logout',
      message: 'Keluar dari sesi admin sekarang?',
      confirmLabel: 'Logout',
      tone: 'primary',
      onConfirm: logout
    });

  const isSuperadmin = (session.admin.role || 'admin') === 'superadmin';
  const initial = (session.admin.display_name || session.admin.username || '?').trim().charAt(0);

  return (
    <div className={`rt-admin${navOpen ? ' is-nav-open' : ''}`}>
      <a className="rt-adm-skip" href="#admin-main">
        Lewati ke konten
      </a>

      <aside className="rt-admin-sidebar" id="admin-nav" aria-label="Navigasi admin">
        <Link to="/admin" className="rt-adm-brand" aria-label="RaceTap Admin — dashboard">
          <span className="rt-adm-brand-mark" aria-hidden="true">
            RT
          </span>
          <span className="rt-adm-brand-text">
            <strong>RaceTap</strong>
            <small>Admin CMS</small>
          </span>
        </Link>

        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.superadmin || isSuperadmin);

          if (items.length === 0) {
            return null;
          }

          return (
            <nav className="rt-adm-nav" key={group.label} aria-label={group.label}>
              <span className="rt-adm-nav-label">{group.label}</span>
              {items.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end}>
                  <i className={`bi ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          );
        })}

        <nav className="rt-adm-nav" aria-label="Situs">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <i className="bi bi-box-arrow-up-right" aria-hidden="true" />
            <span>Lihat situs</span>
          </a>
        </nav>

        <div className="rt-adm-user">
          <div className="rt-adm-user-card">
            <div className="rt-adm-user-id">
              <span className="rt-adm-avatar" aria-hidden="true">
                {initial}
              </span>
              <span className="rt-adm-user-name">
                <strong title={session.admin.display_name}>{session.admin.display_name}</strong>
                <small>{session.admin.role || 'admin'}</small>
              </span>
            </div>
            <div className="rt-adm-user-actions">
              <button className="btn btn-sm btn-outline-light" type="button" onClick={askLogout}>
                <i className="bi bi-box-arrow-right me-1" aria-hidden="true" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>

      <button
        type="button"
        className="rt-adm-nav-backdrop"
        aria-label="Tutup navigasi"
        tabIndex={navOpen ? 0 : -1}
        onClick={() => setNavOpen(false)}
      />

      <div className="rt-adm-shell">
        <header className="rt-adm-topbar">
          <button
            type="button"
            className="rt-adm-nav-toggle"
            aria-label={navOpen ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={navOpen}
            aria-controls="admin-nav"
            onClick={() => setNavOpen((previous) => !previous)}
          >
            <i className={`bi ${navOpen ? 'bi-x-lg' : 'bi-list'}`} aria-hidden="true" />
          </button>
          <span className="rt-adm-topbar-title">{currentTitle(location.pathname)}</span>
        </header>

        <main className="rt-admin-main" id="admin-main">
          <div className="rt-adm-main-inner">
            {offline ? (
              <div className="alert alert-warning py-2" role="status">
                <i className="bi bi-hdd-network me-1" aria-hidden="true" />
                Mode statis: backend CMS tidak tersedia di deployment ini. Sesi admin diverifikasi lokal; data dari API
                tidak akan termuat.
              </div>
            ) : null}
            {error ? (
              <div className="alert alert-danger py-2" role="alert">
                {error}
              </div>
            ) : null}
            <Outlet />
          </div>
        </main>
      </div>

      {dialog}
    </div>
  );
}
