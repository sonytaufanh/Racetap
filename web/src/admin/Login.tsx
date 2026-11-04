import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, errorMessage, isApiUnavailable } from '../lib/http';
import type { AdminUser } from '../types';
import { PasswordField } from './AdminUI';
import { useAdmin } from './AdminContext';
import { offlineLogin } from './localAuth';

export default function Login() {
  const { session, loading, setSession, offline } = useAdmin();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && session?.admin) {
    return <Navigate to="/admin" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      if (offline) {
        const result = await offlineLogin(username, password);

        if (result.ok) {
          setSession(result.session);
          navigate('/admin', { replace: true });
        } else if (result.reason === 'no-account') {
          setError('Belum ada akun admin lokal. Buat akun pertama lewat halaman setup.');
        } else {
          setError('Username atau password salah.');
        }

        return;
      }

      const data = await api<{ admin: AdminUser; csrf_token: string }>('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      setSession({ admin: data.admin, has_admin: true, csrf_token: data.csrf_token });
      navigate('/admin', { replace: true });
    } catch (loginError) {
      if (isApiUnavailable(loginError)) {
        const result = await offlineLogin(username, password);

        if (result.ok) {
          setSession(result.session);
          navigate('/admin', { replace: true });
          return;
        }

        setError(
          result.reason === 'no-account'
            ? 'Backend API tidak tersedia di deployment ini. Buat akun admin lokal lewat halaman setup.'
            : 'Backend API tidak tersedia dan kredensial lokal tidak cocok.'
        );
        return;
      }

      setError(errorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rt-auth">
      <div className="rt-auth-shell">
        <aside className="rt-auth-aside">
          <Link to="/admin" className="rt-adm-brand">
            <span className="rt-adm-brand-mark" aria-hidden="true">
              RT
            </span>
            <span className="rt-adm-brand-text">
              <strong>RaceTap</strong>
              <small>Admin CMS</small>
            </span>
          </Link>
          <div>
            <h2>Kelola race, foto &amp; hasil dalam satu dasbor.</h2>
            <p>Sinkronisasi Feibot, galeri foto dengan OCR BIB otomatis, dan publikasi hasil per event.</p>
            <ul className="rt-auth-points">
              <li>
                <i className="bi bi-check-circle-fill" aria-hidden="true" /> Sinkronisasi hasil otomatis
              </li>
              <li>
                <i className="bi bi-check-circle-fill" aria-hidden="true" /> OCR nomor dada (Vision / Tesseract)
              </li>
              <li>
                <i className="bi bi-check-circle-fill" aria-hidden="true" /> Audit log lengkap
              </li>
            </ul>
          </div>
          <div className="rt-auth-aside-foot">RaceTap · Event Technology</div>
        </aside>

        <div className="rt-auth-card">
          <h1>Login Admin</h1>
          <p className="rt-adm-sub">Masuk untuk mengelola race dan foto.</p>

          {offline ? (
            <div className="alert alert-warning py-2 small" role="status">
              <i className="bi bi-hdd-network me-1" aria-hidden="true" />
              Mode statis: backend CMS tidak terdeteksi di deployment ini. Login diverifikasi lokal di browser.
            </div>
          ) : null}

          {session && !session.has_admin ? (
            <div className="alert alert-info py-2 small" role="alert">
              Belum ada akun admin. <Link to="/admin/setup">Buat akun pertama</Link>.
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          ) : null}

          <form onSubmit={onSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                className="form-control"
                autoComplete="username"
                maxLength={80}
                required
                autoFocus
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
            </div>
            <PasswordField
              id="password"
              label="Password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
              required
              minLength={undefined}
            />
            <button className="btn btn-primary w-100" type="submit" disabled={busy}>
              {busy ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="rt-auth-links">
            <Link to="/">Kembali ke situs</Link>
            {session && !session.has_admin ? <Link to="/admin/setup">Setup akun</Link> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
