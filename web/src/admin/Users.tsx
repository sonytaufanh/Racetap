import { useMemo, useState, type FormEvent } from 'react';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { ApiError, api, errorMessage } from '../lib/http';
import { formatDate } from '../lib/format';
import { Modal } from '../components/Modal';
import { useAdmin } from './AdminContext';
import {
  AdminError,
  AdminPageHeader,
  AdminSkeleton,
  PasswordField,
  SearchField,
  useConfirm
} from './AdminUI';
import type { AdminUserRecord, UsersPayload } from '../types';

interface FormState {
  display_name: string;
  username: string;
  password: string;
  role: string;
}

const EMPTY: FormState = { display_name: '', username: '', password: '', role: 'operator' };

function roleTone(role: string): string {
  if (role === 'superadmin') return 'rt-chip-warning';
  if (role === 'admin') return 'rt-chip-success';
  return 'rt-chip-neutral';
}

export default function AdminUsers() {
  const { data, loading, error, reload } = useApi<UsersPayload>('/admin/users');
  const toast = useToast();
  const { confirm, dialog } = useConfirm();
  const { session } = useAdmin();
  const currentUserId = session?.admin?.id ?? null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const [query, setQuery] = useState('');
  const [resetTarget, setResetTarget] = useState<AdminUserRecord | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const filteredUsers = useMemo(() => {
    const term = query.trim().toLowerCase();

    if (term === '') {
      return data?.users ?? [];
    }

    return (data?.users ?? []).filter(
      (user) =>
        user.display_name.toLowerCase().includes(term) ||
        user.username.toLowerCase().includes(term) ||
        user.role.toLowerCase().includes(term)
    );
  }, [data, query]);

  const update = (key: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const onCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setProblem('');

    try {
      await api('/admin/users/create', { method: 'POST', body: form });
      setForm(EMPTY);
      toast.success('Pengguna dibuat.');
      reload();
    } catch (cause) {
      const message = errorMessage(cause);
      setProblem(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  const patch = async (user: AdminUserRecord, body: Record<string, unknown>) => {
    try {
      await api(`/admin/users/${user.id}`, { method: 'PATCH', body });
      toast.success('Pengguna diperbarui.');
      reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    }
  };

  const remove = (user: AdminUserRecord) =>
    confirm({
      title: 'Hapus pengguna',
      message: (
        <>
          Hapus pengguna <strong>{user.username}</strong> ({user.display_name})?
        </>
      ),
      confirmLabel: 'Hapus pengguna',
      onConfirm: async () => {
        try {
          await api(`/admin/users/${user.id}`, { method: 'DELETE' });
          toast.success('Pengguna dihapus.');
          reload();
        } catch (cause) {
          toast.error(errorMessage(cause));
        }
      }
    });

  const openReset = (user: AdminUserRecord) => {
    setResetTarget(user);
    setNewPassword('');
  };

  const submitReset = async () => {
    if (!resetTarget || newPassword.length < 8) {
      return;
    }

    setResetBusy(true);

    try {
      await api(`/admin/users/${resetTarget.id}`, { method: 'PATCH', body: { password: newPassword } });
      toast.success(`Password ${resetTarget.username} diperbarui.`);
      setResetTarget(null);
      setNewPassword('');
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setResetBusy(false);
    }
  };

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Pengguna Admin" subtitle="Kelola akses admin, operator, dan superadmin." />
        <AdminSkeleton rows={5} />
      </>
    );
  }

  if (error) {
    const forbidden = error.includes('superadmin');
    return <AdminError message={forbidden ? 'Halaman ini hanya untuk superadmin.' : error} onRetry={forbidden ? undefined : reload} />;
  }

  if (!data) {
    return <AdminError message="Data pengguna tidak tersedia." onRetry={reload} />;
  }

  return (
    <>
      <AdminPageHeader title="Pengguna Admin" subtitle="Kelola akses admin, operator, dan superadmin." />

      <div className="rt-admin-card mb-4">
        <h2 className="h6 mb-3">Tambah pengguna</h2>
        {problem ? (
          <div className="alert alert-danger py-2" role="alert">
            {problem}
          </div>
        ) : null}
        <form className="row g-3" onSubmit={onCreate}>
          <div className="col-md-4">
            <label className="form-label" htmlFor="user-name">
              Nama tampilan
            </label>
            <input
              id="user-name"
              className="form-control"
              required
              value={form.display_name}
              onChange={(event) => update('display_name', event.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="user-username">
              Username
            </label>
            <input
              id="user-username"
              className="form-control"
              required
              value={form.username}
              onChange={(event) => update('username', event.target.value)}
            />
          </div>
          <div className="col-md-3">
            <label className="form-label" htmlFor="user-password">
              Password
            </label>
            <input
              id="user-password"
              type="password"
              className="form-control"
              required
              minLength={8}
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
            />
          </div>
          <div className="col-md-2">
            <label className="form-label" htmlFor="user-role">
              Role
            </label>
            <select id="user-role" className="form-select" value={form.role} onChange={(event) => update('role', event.target.value)}>
              {data.roles.map((role) => (
                <option key={role} value={role}>
                  {role}
                </option>
              ))}
            </select>
          </div>
          <div className="col-12">
            <button className="btn btn-primary" type="submit" disabled={busy}>
              {busy ? 'Menyimpan...' : 'Tambah pengguna'}
            </button>
          </div>
        </form>
      </div>

      <div className="rt-admin-card">
        <div className="rt-adm-filters">
          <h2 className="h6 mb-0 me-auto">Daftar pengguna</h2>
          <SearchField value={query} onChange={setQuery} placeholder="Cari nama, username, atau role" label="Cari pengguna" />
          <span className="rt-adm-count">{filteredUsers.length} pengguna</span>
        </div>

        <div className="table-responsive">
          <table className="rt-table rt-table--stack">
            <thead>
              <tr>
                <th scope="col">Nama</th>
                <th scope="col">Username</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Login terakhir</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td data-label="Nama">
                    <strong>{user.display_name}</strong>
                    {user.id === currentUserId ? (
                      <span className="rt-chip rt-chip-neutral ms-2">Anda</span>
                    ) : null}
                  </td>
                  <td data-label="Username" className="small text-slate">
                    {user.username}
                  </td>
                  <td data-label="Role">
                    <div className="d-flex align-items-center gap-2">
                      <span className={`rt-chip ${roleTone(user.role)}`}>{user.role}</span>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: 130 }}
                        value={user.role}
                        aria-label={`Ubah role ${user.username}`}
                        onChange={(event) => void patch(user, { role: event.target.value })}
                      >
                        {data.roles.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td data-label="Status">
                    <span className={`rt-badge ${user.is_active ? 'ok' : 'off'}`}>
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td data-label="Login terakhir" className="small text-slate">
                    {user.last_login_at ? formatDate(user.last_login_at) : '-'}
                  </td>
                  <td data-label="Aksi">
                    <div className="rt-adm-actions">
                      <button
                        className="btn btn-sm btn-light-custom"
                        type="button"
                        onClick={() => void patch(user, { is_active: user.is_active ? 0 : 1 })}
                      >
                        {user.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button className="btn btn-sm btn-light-custom" type="button" onClick={() => openReset(user)}>
                        <i className="bi bi-key me-1" aria-hidden="true" /> Reset password
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        type="button"
                        disabled={user.id === currentUserId}
                        title={user.id === currentUserId ? 'Tidak bisa menghapus akun sendiri' : undefined}
                        onClick={() => remove(user)}
                      >
                        <i className="bi bi-trash3" aria-hidden="true" /> Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={Boolean(resetTarget)}
        title={resetTarget ? `Reset password: ${resetTarget.username}` : ''}
        onClose={() => setResetTarget(null)}
        size="sm"
        footer={
          <div className="rt-adm-dialog-actions">
            <button type="button" className="btn btn-light-custom" onClick={() => setResetTarget(null)} disabled={resetBusy}>
              Batal
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void submitReset()}
              disabled={resetBusy || newPassword.length < 8}
            >
              {resetBusy ? 'Menyimpan...' : 'Simpan password'}
            </button>
          </div>
        }
      >
        <p className="text-slate small mb-3">
          Masukkan password baru untuk <strong>{resetTarget?.username}</strong>. Minimal 8 karakter.
        </p>
        {resetTarget ? (
          <PasswordField
            id="reset-password"
            label="Password baru"
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            minLength={8}
            autoFocus
          />
        ) : null}
      </Modal>

      {dialog}
    </>
  );
}

export function isForbidden(error: unknown): boolean {
  return error instanceof ApiError && error.status === 403;
}
