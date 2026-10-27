import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/ui';
import { asset } from '../payload';

const LATEST_EVENTS = [
  {
    slug: 'uksw-salatiga-10k',
    name: 'UKSW Salatiga 10K',
    location: 'Salatiga',
    cover: 'assets/images/portfolio/uksw-salatiga-10k.jpg'
  },
  {
    slug: 'jember-10k',
    name: 'Jember 10K',
    location: 'Jember',
    cover: 'assets/images/portfolio/Jember-10K.jpg'
  },
  {
    slug: 'tni-run-2026-jakarta',
    name: 'TNI Run 2026 Jakarta',
    location: 'Jakarta',
    cover: 'assets/images/portfolio/tni-run-2026-jakarta.jpg'
  }
];

const SERVICES = [
  {
    icon: 'bi-upc-scan',
    tone: 'primary',
    title: 'RFID Timing System',
    body: 'Teknologi RFID untuk mencatat waktu peserta secara otomatis dan real-time dengan hasil yang akurat dan minim human error.'
  },
  {
    icon: 'bi-trophy',
    tone: 'secondary',
    title: 'Race Result Management',
    body: 'Pengolahan data hasil lomba, klasifikasi kategori, hingga hasil online dan PDF yang cepat, rapi, dan mudah diakses.'
  },
  {
    icon: 'bi-stopwatch',
    tone: 'success',
    title: 'Event Timing Support',
    body: 'Dukungan tim operasional mulai dari survey lokasi, setup, testing, operator timing, hingga troubleshooting saat race.'
  },
  {
    icon: 'bi-sliders',
    tone: 'primary',
    title: 'Custom Timing Solutions',
    body: 'Solusi timing yang fleksibel dan scalable untuk fun run, trail run, city run, hingga event hybrid sesuai kebutuhan Anda.'
  }
];

const PROCESS = [
  { number: '01', title: 'Prepare', body: 'Kami mempersiapkan kebutuhan timing, data peserta, perangkat, dan sistem sesuai karakteristik event.' },
  { number: '02', title: 'Setup', body: 'Perangkat RFID timing dipasang dan diuji untuk memastikan sistem siap digunakan sebelum race dimulai.' },
  { number: '03', title: 'Timing', body: 'Waktu peserta dicatat secara otomatis dan real-time selama race dengan sistem timing yang akurat.' },
  { number: '04', title: 'Results', body: 'Data timing diproses menjadi hasil lomba yang akurat, cepat, transparan, dan siap dipublikasikan.' }
];

const STATS = [
  { value: '11+', label: 'Event Terselesaikan' },
  { value: '2+', label: 'Tahun Pengalaman Event' },
  { value: '100%', label: 'Event Terlaksana' },
  { value: '8+', label: 'Kota Penyelenggaraan' }
];

export default function Home() {
  return (
    <>
      <header className="hero">
        <div className="container">
          <div className="row align-items-center gy-5">
            <div className="col-lg-6 hero-content">
              <h1 className="mb-4">
                Timing lomba <span className="text-primary-custom">akurat</span> dengan teknologi profesional.
              </h1>
              <p className="fs-5 mb-4" style={{ maxWidth: 540 }}>
                Solusi Race Timing &amp; Event Technology untuk berbagai event lari, dari fun run hingga race profesional.
              </p>
              <div className="d-flex flex-wrap gap-3 mb-4 justify-content-lg-start justify-content-center">
                <a
                  href="https://wa.me/6281249374648"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary btn-lg-custom"
                >
                  Hubungi Kami <i className="bi bi-arrow-right ms-1" />
                </a>
                <a href="/v2/services" className="btn btn-light-custom btn-lg-custom">
                  Lihat Layanan
                </a>
              </div>
            </div>
            <div className="col-lg-6">
              <div className="hero-visual position-relative mx-auto" style={{ maxWidth: 480 }}>
                <div className="hero-mock-card">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex gap-2">
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56', display: 'block' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E', display: 'block' }} />
                      <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F', display: 'block' }} />
                    </div>
                    <span className="badge-soft">Live Timing</span>
                  </div>
                  <div className="mock-bar" style={{ width: '90%' }} />
                  <div className="mock-bar" style={{ width: '65%' }} />
                  <div className="row g-2 my-3">
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ background: 'var(--n-bg-alt)' }}>
                        <i className="bi bi-graph-up-arrow text-primary-custom fs-4" />
                        <div className="fw-bold text-navy mt-2 font-display">01:42:18</div>
                        <small className="text-slate">Waktu Finish</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="p-3 rounded-3" style={{ background: '#F4F0FF' }}>
                        <i className="bi bi-people text-primary-custom fs-4" />
                        <div className="fw-bold text-navy mt-2 font-display">12.4k</div>
                        <small className="text-slate">Peserta</small>
                      </div>
                    </div>
                  </div>
                  <div
                    className="mock-bar"
                    style={{ width: '100%', height: 70, borderRadius: 10, background: 'linear-gradient(90deg, var(--n-bg-alt), #F4F0FF)' }}
                  />
                </div>
                <div className="hero-float-badge badge-1 d-none d-sm-flex">
                  <div className="icon-box icon-box-success" style={{ width: 36, height: 36, borderRadius: 10, fontSize: '1.1rem' }}>
                    <i className="bi bi-check-lg" />
                  </div>
                  <div>
                    Hasil Akurat
                    <br />
                    <small className="text-slate fw-normal">Setiap pelari. Setiap detik.</small>
                  </div>
                </div>
                <div className="hero-float-badge badge-2 d-none d-sm-flex">
                  <div className="icon-box icon-box-primary" style={{ width: 36, height: 36, borderRadius: 10, fontSize: '1.1rem' }}>
                    <i className="bi bi-lightning-charge-fill" />
                  </div>
                  <div>
                    Hasil Real-Time
                    <br />
                    <small className="text-slate fw-normal">Cepat &amp; terpercaya</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="stats-strip py-5 bg-white">
        <div className="container">
          <div className="row text-center g-4">
            {STATS.map((stat, index) => (
              <div className="col-6 col-md-3 stat-item" key={stat.label}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="stat-number">{stat.value}</div>
                  <div className="stat-label">{stat.label}</div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHeading
            title="Latest event"
            action={
              <a href="/v2/results" className="card-link-arrow">
                All Event Results <i className="bi bi-arrow-right" />
              </a>
            }
          />
          <div className="row g-4">
            {LATEST_EVENTS.map((event, index) => (
              <div className="col-md-6 col-lg-4" key={event.slug}>
                <Reveal delay={index * 0.08}>
                  <a href={`https://racetap.id/results/${event.slug}/`} className="portfolio-card d-block">
                    <img src={asset(event.cover)} alt={event.name} />
                    <div className="portfolio-overlay">
                      <span>{event.location}</span>
                      <h5>{event.name}</h5>
                    </div>
                  </a>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading
            title="Professional Timing System for Running Events"
            subtitle="Kami menyediakan solusi timing system yang akurat, cepat, dan terpercaya untuk berbagai event lari, mulai dari fun run, charity run, hingga race profesional berskala nasional."
            action={
              <a href="/v2/services" className="card-link-arrow">
                View all services <i className="bi bi-arrow-right" />
              </a>
            }
          />
          <div className="row g-4">
            {SERVICES.map((service, index) => (
              <div className="col-md-6 col-lg-3" key={service.title}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="card-premium">
                    <div className={`icon-box icon-box-${service.tone} mb-4`}>
                      <i className={`bi ${service.icon}`} />
                    </div>
                    <h3 className="card-title">{service.title}</h3>
                    <p className="mb-3">{service.body}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading
            center
            title="Professional timing from start to finish"
            subtitle="Kami menangani proses timing secara profesional, mulai dari persiapan sebelum race hingga hasil lomba siap dipublikasikan."
          />
          <div className="row g-4">
            {PROCESS.map((step, index) => (
              <div className="col-md-6 col-lg-3" key={step.number}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="process-step">
                    <span className="process-number">{step.number}</span>
                    <h3 className="card-title">{step.title}</h3>
                    <p>{step.body}</p>
                  </div>
                </Reveal>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection />
    </>
  );
}
