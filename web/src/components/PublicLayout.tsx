import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useSettings, whatsappLink } from '../hooks/useSettings';
import { useI18n } from '../i18n/I18nProvider';
import { ThemeToggle } from './ThemeToggle';
import { SocialLinks } from './SocialLinks';
import { LanguageToggle } from './LanguageToggle';
import { SearchDialog } from './SearchDialog';
import { useToast } from './Toast';

function Navbar({ onSearch }: { onSearch: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const { t } = useI18n();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => setOpen(false);

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/about', label: t('nav.about') },
    { to: '/services', label: t('nav.services') },
    { to: '/results', label: t('nav.results') },
    { to: '/photos', label: t('nav.photos') },
    { to: '/contact', label: t('nav.contact') }
  ];

  const actions = (
    <div className="navbar-actions">
      <LanguageToggle />
      <button
        type="button"
        className="btn btn-light-custom btn-sm-custom theme-toggle"
        onClick={() => {
          closeMenu();
          onSearch();
        }}
        aria-label={t('nav.search')}
        title={t('nav.search')}
      >
        <i className="bi bi-search" />
      </button>
      <ThemeToggle />
      <a
        href={whatsappLink(settings.whatsapp, t('cta.message'))}
        target="_blank"
        rel="noopener noreferrer"
        className="btn btn-primary btn-sm-custom navbar-wa"
      >
        <i className="bi bi-whatsapp" />
        <span className="d-none d-sm-inline ms-1">{t('nav.whatsapp')}</span>
      </a>
    </div>
  );

  return (
    <nav className={`navbar navbar-expand-lg navbar-nexora fixed-top${scrolled ? ' scrolled' : ''}${open ? ' menu-open' : ''}`}>
      <div className="container">
        <Link className="navbar-brand navbar-brand-custom d-inline-flex align-items-center" to="/" onClick={closeMenu}>
          <img src="/logo-racetap.png" alt="Logo Racetap" className="logo-racetap" />
        </Link>

        <button
          className={`navbar-toggler navbar-toggler-custom d-lg-none${open ? ' active' : ''}`}
          type="button"
          aria-controls="mainNav"
          aria-expanded={open}
          aria-label="Toggle navigation"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>

        <div className={`collapse navbar-collapse${open ? ' show' : ''}`} id="mainNav">
          <ul className="navbar-nav mx-lg-auto align-items-lg-center gap-lg-1 my-3 my-lg-0">
            {links.map((link) => (
              <li className="nav-item" key={link.to}>
                <NavLink
                  to={link.to}
                  end={link.end}
                  onClick={closeMenu}
                  className={({ isActive }) => `nav-link nav-link-custom${isActive ? ' active' : ''}`}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          {actions}
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const { settings } = useSettings();
  const { t } = useI18n();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const year = new Date().getFullYear();

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    setEmail('');
    toast.success(t('footer.subscribed'));
  };

  return (
    <footer className="footer-nexora">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-4 col-md-6">
            <Link className="navbar-brand-custom d-inline-block mb-3" to="/" style={{ color: '#fff' }}>
              RaceTap<span style={{ color: 'var(--n-primary)' }}>.</span>
            </Link>
            <p className="text-white-50 mb-0" style={{ maxWidth: 340 }}>
              {t('footer.tagline')}
            </p>
            <SocialLinks settings={settings} className="footer-brand-socials" />
          </div>
          <div className="col-lg-2 col-md-6 col-6">
            <h6>{t('footer.company')}</h6>
            <Link to="/about">{t('footer.about')}</Link>
            <Link to="/services">{t('footer.services')}</Link>
            <Link to="/contact">{t('footer.contact')}</Link>
            <Link to="/faq">{t('footer.faq')}</Link>
          </div>
          <div className="col-lg-2 col-md-6 col-6">
            <h6>{t('footer.links')}</h6>
            <Link to="/results">{t('footer.results')}</Link>
            <Link to="/photos">{t('footer.photos')}</Link>
            <Link to="/clients">{t('footer.clients')}</Link>
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
          </div>
          <div className="col-lg-4 col-md-6">
            <h6>{t('footer.info')}</h6>
            <p className="text-white-50 mb-3">{t('footer.infoText')}</p>
            <form className="d-flex gap-2" onSubmit={onSubmit}>
              <input
                type="email"
                className="form-control"
                placeholder={t('footer.emailPlaceholder')}
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
              />
              <button className="btn btn-primary flex-shrink-0" type="submit" aria-label={t('footer.info')}>
                <i className="bi bi-send" />
              </button>
            </form>
            <small className="d-block mt-3 text-white-50">{settings.email}</small>
            <small className="d-block text-white-50">{settings.address}</small>
          </div>
        </div>

        <div className="footer-bottom">
          <p className="mb-0">
            &copy; {year} RaceTap.id. {t('footer.rights')}
          </p>
          <div className="footer-bottom-links">
            <Link to="/privacy">{t('footer.privacy')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <button
      className={`back-to-top${visible ? ' show' : ''}`}
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <i className="bi bi-arrow-up" />
    </button>
  );
}

export function CTASection() {
  const { settings } = useSettings();
  const { t } = useI18n();

  return (
    <section className="section">
      <div className="container">
        <div className="cta-section reveal is-visible">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h2 className="mb-2">{t('cta.title')}</h2>
              <p className="mb-0 fs-5">{t('cta.text')}</p>
            </div>
            <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">
              <a
                href={whatsappLink(settings.whatsapp, t('cta.message'))}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg-custom"
              >
                {t('cta.button')} <i className="bi bi-arrow-right ms-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false);
  const { settings } = useSettings();

  return (
    <>
      <a href="#main-content" className="skip-link">
        Lewati ke konten / Skip to content
      </a>
      <Navbar onSearch={() => setSearchOpen(true)} />
      {settings.maintenance_notice ? (
        <div className="maintenance-strip" role="status">
          <i className="bi bi-info-circle me-1" />
          {settings.maintenance_notice}
        </div>
      ) : null}
      <main id="main-content">{children}</main>
      <Footer />
      <BackToTop />
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
