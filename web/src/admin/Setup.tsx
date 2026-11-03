import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ApiError, api, errorMessage } from '../lib/http';
import { PasswordField } from './AdminUI';
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
            <h2>Buat akun superadmin pertama.</h2>
            <p>Halaman ini hanya tersedia sebelum akun admin pertama dibuat. Setelah itu akses tertutup otomatis.</p>
            <ul className="rt-auth-points">
              <li>
                <i className="bi bi-check-circle-fill" aria-hidden="true" /> Akses penuh ke seluruh CMS
              </li>
              <li>
                <i className="bi bi-check-circle-fill" aria-hidden="true" /> Bisa menambah admin &amp; operator
              </li>
              <li>
                <i className="bi bi-check-circle-fill" aria-hidden="true" /> Password minimal 8 karakter
              </li>
            </ul>
          </div>
          <div className="rt-auth-aside-foot">RaceTap · Event Technology</div>
        </aside>

        <div className="rt-auth-card">
          <h1>Setup Akun Admin</h1>
          <p className="rt-adm-sub">Akun pertama otomatis menjadi superadmin.</p>

          {error ? (
            <div className="alert alert-danger py-2 small" role="alert">
              {error}
            </div>
          ) : null}

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
                autoFocus
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
              {fields.display_name ? <div className="invalid-feedback d-block">{fields.display_name}</div> : null}
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
              {fields.username ? <div className="invalid-feedback d-block">{fields.username}</div> : null}
            </div>
            <PasswordField
              id="password"
              label="Password (minimal 8 karakter)"
              value={password}
              onChange={setPassword}
              minLength={8}
              invalidFeedback={fields.password}
            />
            <PasswordField
              id="confirm"
              label="Konfirmasi password"
              value={confirm}
              onChange={setConfirm}
              minLength={8}
              invalidFeedback={fields.password_confirm}
            />
            <button className="btn btn-primary w-100" type="submit" disabled={busy}>
              {busy ? 'Membuat akun...' : 'Buat Akun Admin'}
            </button>
          </form>

          <div className="rt-auth-links">
            <Link to="/admin/login">Sudah punya akun? Login</Link>
            <Link to="/">Kembali ke situs</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
