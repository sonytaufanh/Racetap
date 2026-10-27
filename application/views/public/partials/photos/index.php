<?php
$total_events = isset($stats['events']) ? (int) $stats['events'] : 0;
$total_photos = isset($stats['photos']) ? (int) $stats['photos'] : 0;
$total_bibs = isset($stats['bibs']) ? (int) $stats['bibs'] : 0;
$total_indexed = isset($stats['ocr_indexed']) ? (int) $stats['ocr_indexed'] : 0;
?>
<header class="page-header">
  <div class="container">
    <h1 class="mb-3">Race Photos</h1>
    <div class="breadcrumb-custom">
      <a href="<?= base_url()?>">Home</a> <span>/</span> <span class="active">Photos</span>
    </div>
  </div>
</header>

<section class="section pb-0">
  <div class="container">
    <div class="row align-items-center gy-4">
      <div class="col-lg-7">
        <span class="eyebrow">Race Documentation</span>
        <h2 class="section-title">Temukan foto Anda dari nomor dada</h2>
        <p class="section-subtitle mb-0">Pilih event, lalu cari foto menggunakan nomor dada (BIB). Setiap foto sudah melalui proses OCR sehingga nomor dada dapat dikenali dan dicari secara otomatis.</p>
      </div>
      <div class="col-lg-5">
        <div class="photo-stats">
          <div class="photo-stat">
            <span class="photo-stat-value"><?= number_format($total_events) ?></span>
            <span class="photo-stat-label">Event</span>
          </div>
          <div class="photo-stat">
            <span class="photo-stat-value"><?= number_format($total_photos) ?></span>
            <span class="photo-stat-label">Foto</span>
          </div>
          <div class="photo-stat">
            <span class="photo-stat-value"><?= number_format($total_bibs) ?></span>
            <span class="photo-stat-label">BIB terindeks</span>
          </div>
          <div class="photo-stat">
            <span class="photo-stat-value"><?= number_format($total_indexed) ?></span>
            <span class="photo-stat-label">OCR ready</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section pt-4">
  <div class="container">
    <?php if (empty($events)): ?>
      <div class="photo-empty">
        <i class="bi bi-images"></i>
        <h4>Belum ada album foto</h4>
        <p class="mb-0">Data seed foto belum tersedia.</p>
      </div>
    <?php else: ?>
      <div class="row g-4">
        <?php foreach ($events as $event): ?>
          <div class="col-md-6 col-lg-4 reveal">
            <a href="<?= site_url('photos/' . rawurlencode($event['slug'])) ?>" class="portfolio-card photo-event-card d-block">
              <img src="<?= base_url($event['cover']) ?>" alt="<?= html_escape($event['name']) ?>" loading="lazy">
              <div class="photo-event-chip">
                <i class="bi bi-images"></i> <?= number_format((int) $event['photo_count']) ?> Foto
              </div>
              <div class="portfolio-overlay">
                <span><?= html_escape($event['location']) ?> &middot; <?= date('d M Y', strtotime($event['event_date'])) ?></span>
                <h5><?= html_escape($event['name']) ?></h5>
                <div class="photo-event-meta">
                  <span class="photo-event-meta-item"><i class="bi bi-upc-scan"></i> <?= number_format((int) $event['bib_count']) ?> BIB</span>
                  <span class="photo-event-meta-item"><i class="bi bi-cpu"></i> OCR ready</span>
                </div>
              </div>
            </a>
          </div>
        <?php endforeach; ?>
      </div>
    <?php endif; ?>
  </div>
</section>
