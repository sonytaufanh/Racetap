import { Link } from 'react-router-dom';
import { CTASection } from '../components/PublicLayout';
import { Reveal } from '../components/Reveal';
import { EmptyBox, ErrorBox, Loading, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { formatDate, formatNumber } from '../lib/format';
import { asset } from '../payload';
import type { PhotoListPayload } from '../types';

export default function Photos() {
  const { data, loading, error, reload } = useApi<PhotoListPayload>('/photos/events');

  return (
    <>
      <PageHeader title="Race Photos" crumbs={[{ label: 'Home', to: '/' }, { label: 'Photos' }]} />

      <section className="section pb-0">
        <div className="container">
          <div className="row align-items-center gy-4">
            <div className="col-lg-7">
              <span className="eyebrow">Race Documentation</span>
              <h2 className="section-title">Temukan foto Anda dari nomor dada</h2>
              <p className="section-subtitle mb-0">
                Pilih event, lalu cari foto menggunakan nomor dada (BIB). Setiap foto sudah melalui proses OCR sehingga
                nomor dada dapat dikenali dan dicari secara otomatis.
              </p>
            </div>
            <div className="col-lg-5">
              <div className="photo-stats">
                <div className="photo-stat">
                  <span className="photo-stat-value">{formatNumber(data?.stats.events)}</span>
                  <span className="photo-stat-label">Event</span>
                </div>
                <div className="photo-stat">
                  <span className="photo-stat-value">{formatNumber(data?.stats.photos)}</span>
                  <span className="photo-stat-label">Foto</span>
                </div>
                <div className="photo-stat">
                  <span className="photo-stat-value">{formatNumber(data?.stats.bibs)}</span>
                  <span className="photo-stat-label">BIB terindeks</span>
                </div>
                <div className="photo-stat">
                  <span className="photo-stat-value">{formatNumber(data?.stats.ocr_indexed)}</span>
                  <span className="photo-stat-label">OCR ready</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section pt-4">
        <div className="container">
          {loading && <Loading label="Memuat album foto..." />}

          {!loading && error && <ErrorBox message={error} onRetry={reload} />}

          {!loading && !error && data && data.events.length === 0 && (
            <EmptyBox title="Belum ada album foto" description="Data event foto belum tersedia." />
          )}

          {!loading && !error && data && data.events.length > 0 && (
            <div className="row g-4">
              {data.events.map((event, index) => (
                <div className="col-md-6 col-lg-4" key={event.slug}>
                  <Reveal delay={(index % 4) * 0.08}>
                    <Link to={`/photos/${event.slug}`} className="portfolio-card photo-event-card d-block">
                      <img src={asset(event.cover)} alt={event.name} loading="lazy" />
                      <div className="photo-event-chip">
                        <i className="bi bi-images" /> {formatNumber(event.photo_count)} Foto
                      </div>
                      <div className="portfolio-overlay">
                        <span>
                          {event.location} &middot; {formatDate(event.event_date)}
                        </span>
                        <h5>{event.name}</h5>
                        <div className="photo-event-meta">
                          <span className="photo-event-meta-item">
                            <i className="bi bi-upc-scan" /> {formatNumber(event.bib_count)} BIB
                          </span>
                          <span className="photo-event-meta-item">
                            <i className="bi bi-cpu" /> OCR ready
                          </span>
                        </div>
                      </div>
                    </Link>
                  </Reveal>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <CTASection />
    </>
  );
}
