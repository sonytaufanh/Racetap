import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, errorMessage } from '../lib/http';
import type { AdminUser } from '../types';
import { useAdmin } from './AdminContext';

export default function Login() {
  const { session, loading, setSession } = useAdmin();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && session?.admin) {
    return <Navigate to="/admin/races" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const data = await api<{ admin: AdminUser; csrf_token: string }>('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      setSession({ admin: data.admin, has_admin: true, csrf_token: data.csrf_token });
      navigate('/admin/races', { replace: true });
    } catch (loginError) {
      setError(errorMessage(loginError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rt-auth">
      <div className="rt-auth-card">
        <h1 className="h4 mb-1">Login Admin</h1>
        <p className="text-slate mb-4">Masuk untuk mengelola race dan foto.</p>

        {session && !session.has_admin && (
          <div className="alert alert-info py-2 small">
            Belum ada akun admin. <Link to="/admin/setup">Buat akun pertama</Link>.
          </div>
        )}

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

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
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              autoComplete="current-password"
              maxLength={200}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <button className="btn btn-primary w-100" type="submit" disabled={busy}>
            {busy ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <p className="mt-3 mb-0 small text-slate">
          <Link to="/">Kembali ke situs</Link>
        </p>
      </div>
    </div>
  );
}
