import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api, errorMessage } from '../lib/http';
import { AdminError, AdminPageHeader, AdminSkeleton, FormSection } from './AdminUI';
import type { SettingsPayload } from '../types';

type FieldType = 'text' | 'email' | 'url' | 'textarea';

interface FieldDef {
  key: string;
  label: string;
  type?: FieldType;
  hint?: string;
  placeholder?: string;
}

const GROUPS: Array<{ title: string; description: string; fields: FieldDef[] }> = [
  {
    title: 'Identitas situs',
    description: 'Nama dan tagline yang tampil di navbar, footer, dan metadata.',
    fields: [
      { key: 'site_name', label: 'Nama situs' },
      { key: 'tagline', label: 'Tagline' }
    ]
  },
  {
    title: 'Kontak',
    description: 'Dipakai tombol WhatsApp, footer, dan halaman kontak.',
    fields: [
      { key: 'whatsapp', label: 'Nomor WhatsApp', hint: 'Format internasional tanpa +, contoh 62812...' },
      { key: 'email', label: 'Email kontak', type: 'email' },
      { key: 'address', label: 'Alamat', type: 'textarea' }
    ]
  },
  {
    title: 'Media sosial',
    description: 'Tautan lengkap, termasuk https://.',
    fields: [
      { key: 'instagram', label: 'Instagram URL', type: 'url', placeholder: 'https://instagram.com/...' },
      { key: 'facebook', label: 'Facebook URL', type: 'url', placeholder: 'https://facebook.com/...' },
      { key: 'youtube', label: 'YouTube URL', type: 'url', placeholder: 'https://youtube.com/...' },
      { key: 'tiktok', label: 'TikTok URL', type: 'url', placeholder: 'https://tiktok.com/@...' }
    ]
  },
  {
    title: 'SEO & maintenance',
    description: 'Deskripsi default mesin pencari dan pengumuman sementara di situs.',
    fields: [
      { key: 'seo_description', label: 'Deskripsi SEO', type: 'textarea' },
      { key: 'maintenance_notice', label: 'Pesan maintenance', type: 'textarea' }
    ]
  }
];

export default function AdminSettings() {
  const { data, loading, error, reload } = useApi<SettingsPayload>('/admin/settings');
  const toast = useToast();
  const [form, setForm] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (data) {
      setForm(data.settings);
    }
  }, [data]);

  const initial = data?.settings;
  const dirty = useMemo(() => {
    if (!initial) {
      return false;
    }

    const keys = new Set([...Object.keys(initial), ...Object.keys(form)]);

    for (const key of keys) {
      if ((initial[key] || '') !== (form[key] || '')) {
        return true;
      }
    }

    return false;
  }, [initial, form]);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);

    try {
      await api('/admin/settings', { method: 'PUT', body: form });
      toast.success('Pengaturan disimpan.');
      reload();
    } catch (cause) {
      toast.error(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    if (initial) {
      setForm(initial);
    }
  };

  if (loading) {
    return (
      <>
        <AdminPageHeader title="Pengaturan Situs" subtitle="Identitas, kontak, dan SEO default yang dipakai situs publik." />
        <AdminSkeleton rows={8} />
      </>
    );
  }

  if (error || !data) {
    return <AdminError message={error || 'Pengaturan tidak tersedia.'} onRetry={reload} />;
  }

  const setValue = (key: string, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  return (
    <>
      <AdminPageHeader
        title="Pengaturan Situs"
        subtitle="Identitas, kontak, dan SEO default yang dipakai situs publik."
      />

      <form className="rt-admin-card" onSubmit={onSubmit}>
        {GROUPS.map((group) => (
          <FormSection key={group.title} title={group.title} description={group.description}>
            <div className="row g-3">
              {group.fields.map((field) => (
                <div className={field.type === 'textarea' ? 'col-12' : 'col-md-6'} key={field.key}>
                  <label className="form-label" htmlFor={`setting-${field.key}`}>
                    {field.label}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={`setting-${field.key}`}
                      className="form-control"
                      rows={3}
                      placeholder={field.placeholder}
                      value={form[field.key] || ''}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  ) : (
                    <input
                      id={`setting-${field.key}`}
                      type={field.type || 'text'}
                      className="form-control"
                      placeholder={field.placeholder}
                      value={form[field.key] || ''}
                      onChange={(event) => setValue(field.key, event.target.value)}
                    />
                  )}
                  {field.hint ? <small className="text-slate">{field.hint}</small> : null}
                </div>
              ))}
            </div>
          </FormSection>
        ))}

        <div className="rt-adm-savebar">
          <span className={`rt-adm-savebar-state${dirty ? ' is-dirty' : ''}`}>
            <i className={`bi ${dirty ? 'bi-exclamation-circle' : 'bi-check-circle'}`} aria-hidden="true" />
            {dirty ? 'Ada perubahan belum disimpan' : 'Semua perubahan tersimpan'}
          </span>
          <div className="rt-adm-savebar-actions">
            <button className="btn btn-light-custom" type="button" onClick={reset} disabled={!dirty || busy}>
              Kembalikan
            </button>
            <button className="btn btn-primary" type="submit" disabled={busy || !dirty}>
              {busy ? 'Menyimpan...' : 'Simpan pengaturan'}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}
