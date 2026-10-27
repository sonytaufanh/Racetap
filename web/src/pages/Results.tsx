import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { PageHeader } from '../components/ui';
import { asset } from '../payload';

const EVENTS = [
  { slug: 'dahana-run-2026', name: 'Dahana Run 2026', location: 'Subang', cover: 'assets/images/portfolio/dahana-run-2026.webp' },
  { slug: 'ahy-run-2026', name: 'AHY RUN 2026', location: 'Semarang', cover: 'assets/images/portfolio/ahy run 2026.webp' },
  {
    slug: 'monkey-forest-ubud-run-2026',
    name: 'Monkey Forest Ubud Run 2026',
    location: 'Bali',
    cover: 'assets/images/portfolio/Monkey-Forest-Ubud-Run-2026.webp'
  },
  { slug: 'uksw-salatiga-10k', name: 'UKSW Salatiga 10K', location: 'Salatiga', cover: 'assets/images/portfolio/uksw-salatiga-10k.jpg' },
  { slug: 'jember-10k', name: 'Jember 10K', location: 'Jember', cover: 'assets/images/portfolio/Jember-10K.jpg' },
  {
    slug: 'tni-run-2026-jakarta',
    name: 'TNI Run 2026 Jakarta',
    location: 'Jakarta',
    cover: 'assets/images/portfolio/tni-run-2026-jakarta.jpg'
  },
  {
    slug: 'tni-run-2026-yogyakarta',
    name: 'TNI Run 2026 Yogyakarta',
    location: 'Yogyakarta',
    cover: 'assets/images/portfolio/tni-run-2026-yogyakarta.jpg'
  },
  { slug: 'sarkororun-v2', name: 'Sarkororun V2', location: 'Purworejo', cover: 'assets/images/portfolio/Sarkororun-v2.jpg' },
  {
    slug: 'rupiah-borobudur-playon-2026',
    name: 'Rupiah Borobudur Playon 2026',
    location: 'Magelang',
    cover: 'assets/images/portfolio/Rupiah-borobudur-playon-2026.jpeg'
  },
  { slug: 'unnes-run-2026', name: 'Unnes Run 2026', location: 'Semarang', cover: 'assets/images/portfolio/unnes-run-2026.jpeg' },
  {
    slug: 'Dogathlon-3.0-Dog-Obstacle-Run',
    name: 'Dogathlon 3.0',
    location: 'Bandung',
    cover: 'assets/images/portfolio/DOGATHLON-3.0-DOG-OBSTACLE-RUN.jpeg'
  },
  { slug: 'ungarun-10k-2026', name: 'Ungarun 10K 2026', location: 'Semarang', cover: 'assets/images/portfolio/Ungarun10k-2026.jpg' },
  { slug: 'chick-n-run-2026', name: 'Chick n Run 2026', location: 'Kebumen', cover: 'assets/images/portfolio/chick-n-run-2026-1116.jpg' },
  { slug: 'yia-grow-run-2026', name: 'YIA Grow Run 2026', location: 'Yogyakarta', cover: 'assets/images/portfolio/YIA-Grow-Run-2026.jpeg' },
  {
    slug: 'road-to-jogja10k',
    name: 'Road to Yogyakarta 10K',
    location: 'Yogyakarta',
    cover: 'assets/images/portfolio/Road-to-Jogja10K.jpeg'
  }
];

export default function Results() {
  return (
    <>
      <PageHeader title="Race Results" crumbs={[{ label: 'Home', to: '/' }, { label: 'Results' }]} />

      <section className="section pb-0">
        <div className="container">
          <p className="section-subtitle mb-0">
            Kumpulan hasil resmi event lari yang telah ditangani Racetap. Pilih event untuk melihat hasil lengkap, waktu
            tempuh, dan peringkat pelari.
          </p>
        </div>
      </section>

      <section className="section pt-4">
        <div className="container">
          <div className="row g-4">
            {EVENTS.map((event, index) => (
              <div className="col-md-6 col-lg-4" key={event.slug}>
                <Reveal delay={(index % 4) * 0.08}>
                  <a href={`https://racetap.id/results/${event.slug}/`} className="portfolio-card d-block">
                    <img src={asset(event.cover)} alt={event.name} loading="lazy" />
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

      <CTASection />
    </>
  );
}
