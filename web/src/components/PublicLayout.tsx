import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { asset } from '../payload';

const NAV_ITEMS = [
  { to: '/', label: 'Home', end: true },
  { to: '/about', label: 'About' },
  { to: '/services', label: 'Services' },
  { to: '/photos', label: 'Photos' },
  { to: '/results', label: 'Results' }
];

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    onScroll();

    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const closeMenu = () => {
    const menu = document.getElementById('mainNav');
    const toggler = document.querySelector('.navbar-toggler-custom');

    if (menu?.classList.contains('show')) {
      menu.classList.remove('show');
      toggler?.classList.remove('active');
    }
  };

  return (
    <nav className={`navbar navbar-expand-lg navbar-nexora fixed-top${scrolled ? ' scrolled' : ''}`}>
      <div className="container">
        <Link className="navbar-brand navbar-brand-custom d-inline-flex align-items-center" to="/">
          <img src={asset('assets/images/logo-racetap.png')} alt="Logo Racetap" className="logo-racetap" />
        </Link>
        <button
          className="navbar-toggler navbar-toggler-custom"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNav"
          aria-controls="mainNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
          onClick={() => document.querySelector('.navbar-toggler-custom')?.classList.toggle('active')}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
        <div className="collapse navbar-collapse" id="mainNav">
          <ul className="navbar-nav ms-auto align-items-lg-center gap-1 mt-3 mt-lg-0">
            {NAV_ITEMS.map((item) => (
              <li className="nav-item" key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  onClick={closeMenu}
                  className={({ isActive }) => `nav-link nav2${isActive ? ' active' : ''}`}
                >
                  {item.label}
                </NavLink>
              </li>
            ))}
            <li className="nav-item ms-lg-2 mt-2 mt-lg-0">
              <a
                href="https://wa.me/6281249374648"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-sm-custom w-100"
              >
                WhatsApp
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

function Footer() {
  const [message, setMessage] = useState('');

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    setMessage('Terima kasih, email Anda tercatat.');
    form.reset();
  };

  return (
    <footer className="footer-nexora">
      <div className="container">
        <div className="row gy-4">
          <div className="col-lg-4 col-md-6">
            <Link className="navbar-brand-custom d-inline-block mb-3" to="/" style={{ color: '#fff' }}>
              RaceTap<span style={{ color: 'var(--n-primary)' }}>.</span>
            </Link>
            <p className="text-white-50 mb-4" style={{ maxWidth: 320 }}>
              Solusi professional race timing dan event technology untuk berbagai event olahraga dengan hasil yang akurat
              dan terpercaya.
            </p>
            <div className="d-flex gap-2">
              <a href="#" className="social-icon" aria-label="Twitter">
                <i className="bi bi-twitter-x" />
              </a>
              <a href="#" className="social-icon" aria-label="LinkedIn">
                <i className="bi bi-linkedin" />
              </a>
              <a href="#" className="social-icon" aria-label="Dribbble">
                <i className="bi bi-dribbble" />
              </a>
              <a href="#" className="social-icon" aria-label="Instagram">
                <i className="bi bi-instagram" />
              </a>
            </div>
          </div>
          <div className="col-lg-2 col-md-6 col-6">
            <h6>Perusahaan</h6>
            <Link to="/about">Tentang Kami</Link>
            <Link to="/services">Layanan</Link>
            <Link to="/results">Results</Link>
            <Link to="/photos">Photos</Link>
          </div>
          <div className="col-lg-2 col-md-6 col-6">
            <h6>Layanan</h6>
            <Link to="/services">RFID Timing System</Link>
            <Link to="/services">Race Result Management</Link>
            <Link to="/services">Event Timing Support</Link>
            <Link to="/services">Custom Timing Solutions</Link>
            <Link to="/services">Event Technology</Link>
          </div>
          <div className="col-lg-4 col-md-6">
            <h6>Dapatkan Informasi</h6>
            <p className="text-white-50 mb-3">Dapatkan informasi terbaru seputar layanan dan teknologi RaceTap.id.</p>
            <form className="d-flex gap-2" onSubmit={onSubmit}>
              <input
                type="email"
                className="form-control"
                placeholder="Email Anda"
                required
                style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.12)', color: '#fff' }}
              />
              <button className="btn btn-primary flex-shrink-0" type="submit" aria-label="Kirim email">
                <i className="bi bi-send" />
              </button>
            </form>
            {message && <small className="d-block mt-2 text-white-50">{message}</small>}
          </div>
        </div>
        <div className="footer-bottom d-flex flex-column flex-md-row justify-content-between align-items-center gap-2 text-center text-md-start">
          <p className="mb-0">&copy; 2026 RaceTap.id. Hak cipta dilindungi.</p>
          <div className="d-flex gap-4">
            <a href="#">Kebijakan Privasi</a>
            <a href="#">Syarat &amp; Ketentuan</a>
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
      aria-label="Kembali ke atas"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
    >
      <i className="bi bi-arrow-up" />
    </button>
  );
}

export function CTASection() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-section reveal is-visible">
          <div className="row align-items-center">
            <div className="col-lg-8">
              <h2 className="mb-2">Siap membuat event Anda lebih profesional?</h2>
              <p className="mb-0 fs-5">Konsultasikan kebutuhan timing event Anda bersama RaceTap.id.</p>
            </div>
            <div className="col-lg-4 text-lg-end mt-4 mt-lg-0">
              <a
                href="https://wa.me/6281249374648"
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary btn-lg-custom"
              >
                Whatsapp <i className="bi bi-arrow-right ms-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      <main>{children}</main>
      <Footer />
      <BackToTop />
    </>
  );
}
