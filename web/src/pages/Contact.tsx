import { useState, type FormEvent } from 'react';
import { PageHeader } from '../components/ui';
import { useToast } from '../components/Toast';
import { useSettings, whatsappLink } from '../hooks/useSettings';
import { api, errorMessage } from '../lib/http';
import { useI18n } from '../i18n/I18nProvider';

interface FormState {
  name: string;
  email: string;
  phone: string;
  event_name: string;
  message: string;
  website: string;
}

const EMPTY: FormState = {
  name: '',
  email: '',
  phone: '',
  event_name: '',
  message: '',
  website: ''
};

export default function Contact() {
  const { settings } = useSettings();
  const { t } = useI18n();
  const toast = useToast();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const update = (key: keyof FormState, value: string) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setErrors({});

    try {
      await api('/leads', { method: 'POST', body: form });
      setForm(EMPTY);
      toast.success(t('contact.success'));
    } catch (cause) {
      const message = errorMessage(cause);
      setErrors({ form: message });
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        title={t('contact.title')}
        subtitle={t('contact.intro')}
        crumbs={[{ label: 'Home', to: '/' }, { label: t('contact.title') }]}
      />

      <section className="section pt-0">
        <div className="container">
          <div className="row g-4">
            <div className="col-lg-5">
              <div className="contact-card h-100">
                <h2 className="h5 mb-3">{t('contact.heading')}</h2>
                <p className="text-slate">{t('contact.intro')}</p>

                <ul className="contact-list mt-4">
                  <li>
                    <span className="icon-box icon-box-primary" style={{ width: 40, height: 40 }}>
                      <i className="bi bi-whatsapp" />
                    </span>
                    <div>
                      <strong className="d-block text-navy">{t('contact.whatsapp')}</strong>
                      <a href={whatsappLink(settings.whatsapp)} target="_blank" rel="noreferrer">
                        +{settings.whatsapp}
                      </a>
                    </div>
                  </li>
                  <li>
                    <span className="icon-box icon-box-success" style={{ width: 40, height: 40 }}>
                      <i className="bi bi-envelope" />
                    </span>
                    <div>
                      <strong className="d-block text-navy">{t('contact.email')}</strong>
                      <a href={`mailto:${settings.email}`}>{settings.email}</a>
                    </div>
                  </li>
                  <li>
                    <span className="icon-box icon-box-secondary" style={{ width: 40, height: 40 }}>
                      <i className="bi bi-geo-alt" />
                    </span>
                    <div>
                      <strong className="d-block text-navy">{t('contact.address')}</strong>
                      <span className="text-slate">{settings.address}</span>
                    </div>
                  </li>
                </ul>

                <div className="mt-4">
                  <iframe
                    title={t('contact.mapTitle')}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(settings.address)}&output=embed`}
                    style={{ width: '100%', height: 220, border: 0, borderRadius: 12 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            </div>

            <div className="col-lg-7">
              <div className="contact-card h-100">
                <h2 className="h5 mb-3">{t('contact.formTitle')}</h2>

                {errors.form ? <div className="alert alert-danger py-2">{errors.form}</div> : null}

                <form className="row g-3" onSubmit={onSubmit} noValidate>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="contact-name">
                      {t('contact.name')}
                    </label>
                    <input
                      id="contact-name"
                      className="form-control"
                      required
                      maxLength={160}
                      value={form.name}
                      onChange={(event) => update('name', event.target.value)}
                    />
                    {errors.name ? <small className="text-danger">{errors.name}</small> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="contact-email">
                      {t('contact.emailLabel')}
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className="form-control"
                      required
                      maxLength={190}
                      value={form.email}
                      onChange={(event) => update('email', event.target.value)}
                    />
                    {errors.email ? <small className="text-danger">{errors.email}</small> : null}
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="contact-phone">
                      {t('contact.phone')}
                    </label>
                    <input
                      id="contact-phone"
                      className="form-control"
                      maxLength={40}
                      value={form.phone}
                      onChange={(event) => update('phone', event.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label" htmlFor="contact-event">
                      {t('contact.event')}
                    </label>
                    <input
                      id="contact-event"
                      className="form-control"
                      maxLength={190}
                      value={form.event_name}
                      onChange={(event) => update('event_name', event.target.value)}
                    />
                  </div>
                  <div className="col-12">
                    <label className="form-label" htmlFor="contact-message">
                      {t('contact.message')}
                    </label>
                    <textarea
                      id="contact-message"
                      className="form-control"
                      rows={5}
                      required
                      minLength={10}
                      value={form.message}
                      onChange={(event) => update('message', event.target.value)}
                    />
                    {errors.message ? <small className="text-danger">{errors.message}</small> : null}
                  </div>

                  <div className="d-none" aria-hidden="true">
                    <label htmlFor="contact-website">Website</label>
                    <input
                      id="contact-website"
                      tabIndex={-1}
                      autoComplete="off"
                      value={form.website}
                      onChange={(event) => update('website', event.target.value)}
                    />
                  </div>

                  <div className="col-12 d-flex gap-2 flex-wrap">
                    <button className="btn btn-primary btn-lg-custom" type="submit" disabled={busy}>
                      {busy ? t('contact.sending') : t('contact.send')}
                    </button>
                    <a
                      className="btn btn-light-custom btn-lg-custom"
                      href={whatsappLink(settings.whatsapp, t('cta.message'))}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <i className="bi bi-whatsapp me-1" /> {t('contact.whatsapp')}
                    </a>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
