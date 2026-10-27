import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { PageHeader, SectionHeading } from '../components/ui';
import { asset } from '../payload';

const VALUES = [
  {
    icon: 'bi-bullseye',
    tone: 'primary',
    title: 'Akurasi dan Ketepatan',
    body: 'Kami mengutamakan pencatatan waktu dan pengolahan hasil lomba yang akurat untuk mendukung penilaian peserta secara objektif.'
  },
  {
    icon: 'bi-chat-square-text',
    tone: 'secondary',
    title: 'Koordinasi yang Jelas',
    body: 'Koordinasi dengan penyelenggara dilakukan secara terarah agar kebutuhan teknis dan pelaksanaan timing berjalan sesuai rencana.'
  },
  {
    icon: 'bi-gem',
    tone: 'success',
    title: 'Layanan Profesional',
    body: 'Setiap tahapan, mulai dari persiapan perangkat hingga publikasi hasil lomba, ditangani dengan memperhatikan kualitas layanan.'
  },
  {
    icon: 'bi-arrow-repeat',
    tone: 'primary',
    title: 'Solusi yang Adaptif',
    body: 'Kami menyediakan solusi timing yang dapat disesuaikan dengan format lomba, jumlah peserta, karakteristik rute, dan kebutuhan penyelenggara.'
  }
];

export default function About() {
  return (
    <>
      <PageHeader
        title="Tentang Racetap"
        crumbs={[{ label: 'Home', to: '/' }, { label: 'Tentang Kami' }]}
      />

      <section className="section">
        <div className="container">
          <div className="row align-items-center g-5">
            <div className="col-lg-6">
              <Reveal>
                <img
                  src={asset('assets/images/racetap.png')}
                  className="rounded-img w-100"
                  alt="Tim Racetap dalam pengembangan layanan timing system"
                  style={{ aspectRatio: '5 / 4', objectFit: 'cover' }}
                />
              </Reveal>
            </div>
            <div className="col-lg-6">
              <Reveal>
                <h2 className="section-title">Teknologi Timing System untuk Pengalaman Lomba yang Lebih Baik</h2>
                <p className="section-subtitle mb-3">
                  Racetap hadir untuk mendukung penyelenggaraan event lari melalui teknologi race timing yang akurat, cepat,
                  dan terpercaya. Kami membantu penyelenggara lomba mengelola pencatatan waktu peserta, pemrosesan hasil
                  lomba, dan publikasi race result secara efisien.
                </p>
                <p className="mb-4">
                  Dengan dukungan teknologi RFID, sistem pengelolaan hasil lomba, serta tim teknis yang berpengalaman, Racetap
                  berkomitmen memberikan solusi timing yang sesuai dengan kebutuhan berbagai event, mulai dari fun run, road
                  race, hingga trail run.
                </p>
                <div className="row g-3">
                  <div className="col-6">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box icon-box-primary">
                        <i className="bi bi-calendar-check" />
                      </div>
                      <div>
                        <strong className="text-navy d-block">Race Timing</strong>
                        <small className="text-slate">Pencatatan waktu akurat</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="d-flex align-items-center gap-3">
                      <div className="icon-box icon-box-success">
                        <i className="bi bi-globe" />
                      </div>
                      <div>
                        <strong className="text-navy d-block">Digital Results</strong>
                        <small className="text-slate">Hasil lomba mudah diakses</small>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-soft">
        <div className="container">
          <SectionHeading center title="Prinsip dalam Setiap Layanan Timing System" />
          <div className="row g-4">
            {VALUES.map((value, index) => (
              <div className="col-md-6 col-lg-3" key={value.title}>
                <Reveal delay={(index % 4) * 0.08}>
                  <div className="card-premium text-center">
                    <div className={`icon-box icon-box-${value.tone} mx-auto mb-3`}>
                      <i className={`bi ${value.icon}`} />
                    </div>
                    <h3 className="card-title">{value.title}</h3>
                    <p>{value.body}</p>
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
