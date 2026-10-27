import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../lib/http';
import { useAdmin } from './AdminContext';

export default function Setup() {
  const { session, loading } = useAdmin();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  if (!loading && session?.has_admin) {
    return <Navigate to="/admin/login" replace />;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setFields({});

    try {
      await api('/auth/setup', {
        method: 'POST',
        body: {
          display_name: displayName,
          username,
          password,
          password_confirm: confirm
        }
      });

      navigate('/admin/login', { replace: true });
    } catch (setupError) {
      if (setupError instanceof ApiError && setupError.fields) {
        setFields(setupError.fields);
      }

      setError(errorMessage(setupError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rt-auth">
      <div className="rt-auth-card">
        <h1 className="h4 mb-1">Setup Akun Admin</h1>
        <p className="text-slate mb-4">Halaman ini hanya tersedia sebelum akun admin pertama dibuat.</p>

        {error && <div className="alert alert-danger py-2 small">{error}</div>}

        <form onSubmit={onSubmit}>
          <div className="mb-3">
            <label className="form-label" htmlFor="displayName">
              Nama admin
            </label>
            <input
              id="displayName"
              className={`form-control${fields.display_name ? ' is-invalid' : ''}`}
              maxLength={120}
              required
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
            {fields.display_name && <div className="invalid-feedback d-block">{fields.display_name}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              className={`form-control${fields.username ? ' is-invalid' : ''}`}
              minLength={4}
              maxLength={80}
              pattern="[A-Za-z0-9_-]+"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            {fields.username && <div className="invalid-feedback d-block">{fields.username}</div>}
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="password">
              Password (minimal 12 karakter)
            </label>
            <input
              id="password"
              type="password"
              className={`form-control${fields.password ? ' is-invalid' : ''}`}
              minLength={12}
              maxLength={200}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {fields.password && <div className="invalid-feedback d-block">{fields.password}</div>}
          </div>
          <div className="mb-4">
            <label className="form-label" htmlFor="confirm">
              Konfirmasi password
            </label>
            <input
              id="confirm"
              type="password"
              className={`form-control${fields.password_confirm ? ' is-invalid' : ''}`}
              minLength={12}
              maxLength={200}
              required
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {fields.password_confirm && <div className="invalid-feedback d-block">{fields.password_confirm}</div>}
          </div>
          <button className="btn btn-primary w-100" type="submit" disabled={busy}>
            {busy ? 'Membuat akun...' : 'Buat Akun Admin'}
          </button>
        </form>

        <p className="mt-3 mb-0 small text-slate">
          Sudah punya akun? <Link to="/admin/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
