import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { PageHeader, SectionHeading } from '../components/ui';

const SERVICES = [
  {
    icon: 'bi-upc-scan',
    tone: 'primary',
    title: 'RFID Timing System',
    body: 'Kami menggunakan teknologi RFID (Radio Frequency Identification) untuk mencatat waktu peserta secara otomatis dan real-time. Layanan meliputi chip RFID (bib / shoe tag), timing mat di start, split, dan finish, pencatatan waktu, serta backup data untuk menghindari kehilangan hasil.'
  },
  {
    icon: 'bi-trophy',
    tone: 'secondary',
    title: 'Race Result Management',
    body: 'Kami mengelola seluruh proses data hasil lomba agar siap digunakan oleh organizer dan peserta: pengolahan data, klasifikasi kategori (overall, age group, gender), hasil online dan PDF, serta export data untuk sponsor atau media.'
  },
  {
    icon: 'bi-stopwatch',
    tone: 'success',
    title: 'Event Timing Support',
    body: 'Kami tidak hanya menyediakan alat, tetapi juga tim operasional di lapangan: survey lokasi dan layout race, setup dan testing sistem, operator timing saat race, serta troubleshooting selama event berlangsung.'
  },
  {
    icon: 'bi-sliders',
    tone: 'primary',
    title: 'Custom Timing Solutions',
    body: 'Setiap event unik. Kami menyesuaikan sistem sesuai kebutuhan Anda: fun run komunitas, trail run, city run, hingga event hybrid dengan result online. Fleksibel, scalable, dan siap didiskusikan.'
  }
];

const HIGHLIGHTS = ['Akurat', 'Minim human error', 'Cocok untuk event skala kecil hingga besar'];

export default function Services() {
  return (
    <>
      <PageHeader title="Our Services" crumbs={[{ label: 'Home', to: '/' }, { label: 'Services' }]} />

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
              <div className="col-md-6" key={service.title}>
                <Reveal delay={(index % 2) * 0.08}>
                  <div className="card-premium h-100">
                    <div className={`icon-box icon-box-${service.tone} mb-4`}>
                      <i className={`bi ${service.icon}`} />
                    </div>
                    <h3 className="card-title">{service.title}</h3>
                    <p className="mb-3">{service.body}</p>
                    {index === 0 && (
                      <ul className="list-check mb-0">
                        {HIGHLIGHTS.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    )}
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
