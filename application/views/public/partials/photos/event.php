<?php
$event_name = isset($event['name']) ? $event['name'] : 'Race Photos';
$event_slug = isset($event['slug']) ? $event['slug'] : '';
$location = isset($event['location']) ? $event['location'] : '';
$event_date = !empty($event['event_date']) ? date('d M Y', strtotime($event['event_date'])) : '';
$photo_total = isset($event['photo_count']) ? (int) $event['photo_count'] : count($photos);
$bib_total = isset($event['bib_count']) ? (int) $event['bib_count'] : 0;
$ocr_total = isset($event['ocr_indexed']) ? (int) $event['ocr_indexed'] : 0;
$match_count = isset($match_count) ? (int) $match_count : $photo_total;
?>
<header class="page-header photo-page-header">
  <div class="container">
    <h1 class="mb-3"><?= html_escape($event_name) ?></h1>
    <div class="breadcrumb-custom">
      <a href="<?= base_url()?>">Home</a> <span>/</span>
      <a href="<?= site_url('photos') ?>">Photos</a> <span>/</span>
      <span class="active"><?= html_escape($event_name) ?></span>
    </div>
    <div class="photo-hero-meta">
      <span class="photo-hero-chip"><i class="bi bi-geo-alt"></i> <?= html_escape($location) ?></span>
      <span class="photo-hero-chip"><i class="bi bi-calendar3"></i> <?= html_escape($event_date) ?></span>
      <span class="photo-hero-chip"><i class="bi bi-images"></i> <?= number_format($photo_total) ?> Foto</span>
      <span class="photo-hero-chip"><i class="bi bi-upc-scan"></i> <?= number_format($bib_total) ?> BIB</span>
      <span class="photo-hero-chip"><i class="bi bi-cpu"></i> <?= number_format($ocr_total) ?> OCR indexed</span>
    </div>
  </div>
</header>

<section class="section pb-0">
  <div class="container">
    <div class="photo-toolbar">
      <div class="row g-4 align-items-center">
        <div class="col-lg-4">
          <span class="eyebrow">Photo Search</span>
          <h2 class="section-title h3 mb-2">Cari foto dengan nomor dada</h2>
          <p class="mb-0 text-slate">Ketik nomor dada (BIB) atau unggah foto BIB Anda. Sistem akan mencocokkan nomor hasil OCR dengan indeks foto event ini.</p>
        </div>
        <div class="col-lg-8">
          <form id="bibForm" class="photo-search-form" method="get" action="<?= site_url('photos/' . rawurlencode($event_slug)) ?>">
            <div class="photo-search-input">
              <i class="bi bi-upc-scan"></i>
              <input id="bibSearch" name="bib" type="search" inputmode="numeric" autocomplete="off" value="<?= html_escape($bib) ?>" placeholder="Masukkan nomor dada, contoh: 1024" aria-label="Nomor dada">
            </div>
            <button class="btn btn-primary" type="submit"><i class="bi bi-search me-1"></i> Cari Foto</button>
            <button class="btn btn-light-custom" type="button" id="ocrScanBtn"><i class="bi bi-magic me-1"></i> Scan OCR</button>
            <label class="btn btn-light-custom mb-0" for="bibUpload" role="button"><i class="bi bi-camera me-1"></i> BIB dari Foto</label>
            <input type="file" id="bibUpload" accept="image/*" class="d-none">
            <a class="btn btn-light-custom" href="<?= site_url('photos/' . rawurlencode($event_slug)) ?>"><i class="bi bi-arrow-counterclockwise me-1"></i> Reset</a>
          </form>

          <div class="ocr-panel">
            <div class="d-flex flex-wrap align-items-center gap-2">
              <span class="badge-soft"><i class="bi bi-cpu me-1"></i> OCR Engine: Tesseract.js</span>
              <span id="ocrStatus" class="ocr-status">Indeks OCR siap untuk <?= number_format($ocr_total) ?> foto. Klik "Scan OCR" untuk memindai ulang nomor dada langsung di browser.</span>
            </div>
            <div class="progress ocr-progress d-none" id="ocrProgressWrap">
              <div class="progress-bar" id="ocrProgressBar" role="progressbar" style="width: 0%" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">0%</div>
            </div>
            <noscript>
              <div class="alert alert-warning mb-0 py-2 small">Aktifkan JavaScript untuk menjalankan scan OCR langsung di browser. Pencarian nomor dada tetap dapat dilakukan menggunakan tombol "Cari Foto".</div>
            </noscript>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section pt-0">
  <div class="container">
    <div class="photo-result-bar">
      <p class="mb-0 text-slate" id="photoResultInfo">
        <?php if ($bib === ''): ?>
          Menampilkan <?= number_format($photo_total) ?> foto
        <?php elseif ($match_count > 0): ?>
          Ditemukan <?= number_format($match_count) ?> foto untuk nomor dada <?= html_escape($bib) ?>
        <?php else: ?>
          Tidak ada foto untuk nomor dada <?= html_escape($bib) ?>
        <?php endif; ?>
      </p>
      <span class="badge-soft"><i class="bi bi-images me-1"></i> <?= number_format($photo_total) ?> foto <span class="text-slate">/</span> <?= number_format($bib_total) ?> BIB</span>
    </div>

    <div class="row g-4" id="photoGrid" data-event="<?= html_escape($event_slug) ?>">
      <?php foreach ($photos as $photo): ?>
        <?php
          $is_match = !empty($photo['matches']);
          $hidden_class = ($bib !== '' && !$is_match) ? ' d-none' : '';
          $photo_src = base_url($photo['file']);
          $photo_bib = isset($photo['bib']) ? $photo['bib'] : '';
          $photo_time = isset($photo['captured_at']) ? $photo['captured_at'] : '';
          $photo_category = isset($photo['category']) ? $photo['category'] : '';
          $photo_conf = isset($photo['ocr_confidence']) ? (float) $photo['ocr_confidence'] : 0;
        ?>
        <div class="col-sm-6 col-lg-4 photo-col<?= $hidden_class ?>"
             data-photo-id="<?= html_escape($photo['id']) ?>"
             data-bib="<?= html_escape($photo_bib) ?>"
             data-ocr="<?= html_escape($photo['ocr_text']) ?>"
             data-captured="<?= html_escape($photo_time) ?>"
             data-category="<?= html_escape($photo_category) ?>"
             data-src="<?= html_escape($photo_src) ?>">
          <article class="photo-card">
            <button type="button" class="photo-thumb" data-bs-toggle="modal" data-bs-target="#photoModal"
                    data-photo-src="<?= html_escape($photo_src) ?>"
                    data-photo-bib="<?= html_escape($photo_bib) ?>"
                    data-photo-time="<?= html_escape($photo_time) ?>"
                    data-photo-category="<?= html_escape($photo_category) ?>"
                    data-photo-name="<?= html_escape($event_name) ?>">
              <img src="<?= html_escape($photo_src) ?>" alt="Foto BIB <?= html_escape($photo_bib) ?> - <?= html_escape($event_name) ?>" loading="lazy">
              <span class="photo-bib-badge">BIB <?= html_escape($photo_bib) ?></span>
              <span class="photo-zoom"><i class="bi bi-arrows-fullscreen"></i></span>
            </button>
            <div class="photo-card-body">
              <div class="photo-card-info">
                <span class="photo-time"><i class="bi bi-clock"></i> <?= html_escape($photo_time) ?></span>
                <span class="photo-cat"><?= html_escape($photo_category) ?></span>
              </div>
              <div class="photo-card-footer">
                <span class="ocr-badge" data-role="ocr-badge"><i class="bi bi-upc-scan"></i> OCR <?= number_format($photo_conf, 1) ?>%</span>
                <a class="photo-download" href="<?= html_escape($photo_src) ?>" download="bib-<?= html_escape($photo_bib) ?>.jpg" title="Download foto"><i class="bi bi-download"></i></a>
              </div>
            </div>
          </article>
        </div>
      <?php endforeach; ?>
    </div>

    <div id="photoEmpty" class="photo-empty <?= ($match_count > 0) ? 'd-none' : '' ?>">
      <i class="bi bi-search"></i>
      <h4>Tidak ada foto yang cocok</h4>
      <p class="mb-0">Coba scan OCR ulang, unggah foto BIB yang lebih jelas, atau pastikan nomor dada yang dimasukkan benar.</p>
    </div>
  </div>
</section>

<div class="modal fade" id="photoModal" tabindex="-1" aria-labelledby="photoModalTitle" aria-hidden="true">
  <div class="modal-dialog modal-xl modal-dialog-centered">
    <div class="modal-content photo-modal">
      <div class="modal-header">
        <h5 class="modal-title" id="photoModalTitle">Foto</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Tutup"></button>
      </div>
      <div class="modal-body">
        <img id="photoModalImage" src="" alt="" class="photo-modal-img">
      </div>
      <div class="modal-footer">
        <span id="photoModalMeta" class="me-auto text-slate"></span>
        <a id="photoModalDownload" class="btn btn-primary btn-sm-custom" href="#" download><i class="bi bi-download me-1"></i> Download Foto</a>
      </div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js"></script>
<script>
(function () {
  'use strict';

  var grid = document.getElementById('photoGrid');
  if (!grid) return;

  var form = document.getElementById('bibForm');
  var input = document.getElementById('bibSearch');
  var resultInfo = document.getElementById('photoResultInfo');
  var empty = document.getElementById('photoEmpty');
  var scanBtn = document.getElementById('ocrScanBtn');
  var upload = document.getElementById('bibUpload');
  var status = document.getElementById('ocrStatus');
  var progressWrap = document.getElementById('ocrProgressWrap');
  var progressBar = document.getElementById('ocrProgressBar');
  var eventSlug = grid.getAttribute('data-event') || '';
  var storageKey = 'racetap-photos-ocr:v1:' + eventSlug;
  var cols = Array.prototype.slice.call(grid.querySelectorAll('.photo-col'));
  var cache = readCache();
  var scanning = false;

  function readCache() {
    try {
      return JSON.parse(window.localStorage.getItem(storageKey) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function saveCache() {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(cache));
    } catch (error) {
      // Storage bisa penuh atau diblokir; pencarian tetap berjalan di sesi ini.
    }
  }

  function digits(value) {
    return String(value || '').replace(/[^0-9]/g, '');
  }

  function setStatus(text, type) {
    if (!status) return;
    status.textContent = text;
    status.className = 'ocr-status' + (type ? ' is-' + type : '');
  }

  function setProgress(percent, text) {
    if (!progressWrap || !progressBar) return;
    var value = Math.max(0, Math.min(100, percent));
    progressWrap.classList.remove('d-none');
    progressBar.style.width = value + '%';
    progressBar.setAttribute('aria-valuenow', Math.round(value));
    progressBar.textContent = text || (Math.round(value) + '%');
  }

  function rebuildSearchIndex() {
    cols.forEach(function (col) {
      var id = col.getAttribute('data-photo-id');
      var live = cache[id] || null;
      var parts = [
        col.getAttribute('data-bib') || '',
        col.getAttribute('data-ocr') || '',
        live && live.bib ? live.bib : ''
      ];
      col.setAttribute('data-search', parts.join(' ').toLowerCase());

      var badge = col.querySelector('[data-role="ocr-badge"]');
      if (badge && live && live.bib) {
        var confidence = live.confidence ? Number(live.confidence).toFixed(1) + '%' : 'live';
        badge.innerHTML = '<i class="bi bi-upc-scan"></i> OCR ' + confidence;
        badge.className = 'ocr-badge is-live';
      }
    });
  }

  function updateUrl(query) {
    if (!window.history || !window.history.replaceState) return;
    try {
      var url = new URL(window.location.href);
      if (query) {
        url.searchParams.set('bib', query);
      } else {
        url.searchParams.delete('bib');
      }
      window.history.replaceState({}, '', url.toString());
    } catch (error) {
      // Abaikan browser lama tanpa URL API.
    }
  }

  function applyFilter() {
    var query = digits(input ? input.value : '');
    var shown = 0;

    cols.forEach(function (col) {
      var haystack = col.getAttribute('data-search') || '';
      var match = query === '' || haystack.indexOf(query) !== -1;
      col.classList.toggle('d-none', !match);
      if (match) shown++;
    });

    if (resultInfo) {
      if (query === '') {
        resultInfo.textContent = 'Menampilkan ' + shown + ' foto';
      } else if (shown > 0) {
        resultInfo.textContent = 'Ditemukan ' + shown + ' foto untuk nomor dada ' + query;
      } else {
        resultInfo.textContent = 'Tidak ada foto untuk nomor dada ' + query;
      }
    }

    if (empty) empty.classList.toggle('d-none', shown !== 0);
    updateUrl(query);
  }

  function collectWords(node, out) {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(function (item) { collectWords(item, out); });
      return;
    }
    if (typeof node !== 'object') return;

    if (Array.isArray(node.words)) {
      node.words.forEach(function (word) {
        if (word && typeof word === 'object' && typeof word.text === 'string') {
          out.push(word);
        } else {
          collectWords(word, out);
        }
      });
    }

    ['blocks', 'paragraphs', 'lines'].forEach(function (key) {
      if (node[key]) collectWords(node[key], out);
    });
  }

  function pickBib(data) {
    var words = [];
    if (Array.isArray(data.words)) words = words.concat(data.words);
    if (data.blocks) collectWords(data.blocks, words);

    var candidates = [];
    words.forEach(function (word) {
      var text = String(word.text || '');
      var bbox = word.bbox || {};
      var area = 0;
      if (typeof bbox.x0 === 'number' && typeof bbox.x1 === 'number' && typeof bbox.y0 === 'number' && typeof bbox.y1 === 'number') {
        area = Math.max(0, bbox.x1 - bbox.x0) * Math.max(0, bbox.y1 - bbox.y0);
      }
      (text.match(/[0-9]{3,6}/g) || []).forEach(function (token) {
        candidates.push({ bib: token, area: area });
      });
    });

    if (!candidates.length) {
      (String(data.text || '').match(/[0-9]{3,6}/g) || []).forEach(function (token) {
        candidates.push({ bib: token, area: 0 });
      });
    }

    candidates.sort(function (a, b) { return b.area - a.area; });

    var tokens = [];
    candidates.forEach(function (candidate) {
      if (tokens.indexOf(candidate.bib) === -1) tokens.push(candidate.bib);
    });

    return {
      bib: candidates.length ? candidates[0].bib : '',
      tokens: tokens
    };
  }

  function getWorker(logger) {
    if (typeof window.Tesseract === 'undefined') {
      return Promise.reject(new Error('Tesseract.js belum termuat. Periksa koneksi internet lalu coba lagi.'));
    }

    return window.Tesseract.createWorker('eng', 1, { logger: logger }).then(function (worker) {
      return worker.setParameters({ tessedit_char_whitelist: '0123456789' }).then(function () {
        return worker;
      }).catch(function () {
        return worker;
      });
    });
  }

  function scanAll() {
    if (scanning) return;
    scanning = true;

    if (scanBtn) {
      scanBtn.disabled = true;
      scanBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span> Memindai...';
    }

    setProgress(2, 'Menyiapkan OCR...');
    setStatus('Mengunduh model OCR dan memindai nomor dada pada foto...', 'busy');

    var total = cols.length;
    var done = 0;
    var workerRef = null;

    getWorker(function (message) {
      if (message && message.status === 'recognizing text' && workerRef) {
        var overall = ((done + (message.progress || 0)) / total) * 100;
        setProgress(overall, 'OCR foto ' + Math.min(done + 1, total) + '/' + total);
      }
    }).then(function (worker) {
      workerRef = worker;
      var chain = Promise.resolve();

      cols.forEach(function (col, index) {
        chain = chain.then(function () {
          var id = col.getAttribute('data-photo-id');
          var src = col.getAttribute('data-src');

          if (!src) {
            done++;
            return;
          }

          setProgress((done / total) * 100, 'Memindai foto ' + (index + 1) + '/' + total + '...');

          return worker.recognize(src).then(function (result) {
            var picked = pickBib(result.data || {});
            var confidence = result.data && result.data.confidence ? result.data.confidence : 0;

            if (picked.bib) {
              cache[id] = {
                bib: picked.bib,
                text: picked.tokens.join(' '),
                confidence: confidence,
                scanned_at: Date.now()
              };
            } else {
              cache[id] = cache[id] || {
                bib: '',
                text: '',
                confidence: confidence,
                scanned_at: Date.now()
              };
            }

            saveCache();
            done++;
            setProgress((done / total) * 100, 'Selesai ' + done + '/' + total);
          }).catch(function (error) {
            done++;
            window.console && console.error('OCR gagal untuk ' + id, error);
            setProgress((done / total) * 100, 'Gagal pada foto ' + (index + 1) + ', lanjut...');
          });
        });
      });

      return chain.then(function () {
        return worker.terminate();
      });
    }).then(function () {
      setProgress(100, 'Selesai');
      rebuildSearchIndex();
      applyFilter();

      var indexed = 0;
      cols.forEach(function (col) {
        if (cache[col.getAttribute('data-photo-id')]) indexed++;
      });

      setStatus('OCR selesai. ' + indexed + ' foto memiliki indeks BIB. Pencarian sekarang memakai hasil OCR terbaru.', 'success');
      scanning = false;

      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<i class="bi bi-magic me-1"></i> Scan OCR';
      }

      setTimeout(function () {
        if (progressWrap) progressWrap.classList.add('d-none');
      }, 1500);
    }).catch(function (error) {
      window.console && console.error(error);
      setStatus(error && error.message ? error.message : 'OCR gagal dijalankan.', 'error');
      scanning = false;

      if (scanBtn) {
        scanBtn.disabled = false;
        scanBtn.innerHTML = '<i class="bi bi-magic me-1"></i> Scan OCR';
      }
    });
  }

  function readUploadedBib(file) {
    if (!file) return;

    setStatus('Membaca nomor dada dari foto BIB...', 'busy');
    setProgress(8, 'Membaca foto BIB...');

    getWorker(function (message) {
      if (message && message.status === 'recognizing text') {
        setProgress(30 + (message.progress || 0) * 60, 'OCR foto BIB...');
      }
    }).then(function (worker) {
      return worker.recognize(file).then(function (result) {
        var picked = pickBib(result.data || {});
        return worker.terminate().then(function () {
          return picked;
        });
      });
    }).then(function (picked) {
      setProgress(100, 'Selesai');

      if (picked.bib) {
        if (input) input.value = picked.bib;
        rebuildSearchIndex();
        applyFilter();
        setStatus('Nomor dada ' + picked.bib + ' terbaca dari foto. Menampilkan foto yang cocok.', 'success');
      } else {
        setStatus('Nomor dada tidak terbaca. Coba foto yang lebih jelas atau ketik nomor dada secara manual.', 'error');
      }

      setTimeout(function () {
        if (progressWrap) progressWrap.classList.add('d-none');
      }, 1200);
    }).catch(function (error) {
      window.console && console.error(error);
      setStatus('Gagal membaca foto BIB. Coba lagi dengan foto yang lebih jelas.', 'error');
      if (progressWrap) progressWrap.classList.add('d-none');
    }).then(function () {
      if (upload) upload.value = '';
    });
  }

  if (input) {
    var inputTimer = null;
    input.addEventListener('input', function () {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(applyFilter, 120);
    });
  }

  if (form) {
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      applyFilter();
    });
  }

  if (scanBtn) scanBtn.addEventListener('click', scanAll);

  if (upload) {
    upload.addEventListener('change', function () {
      readUploadedBib(upload.files && upload.files[0]);
    });
  }

  var modal = document.getElementById('photoModal');
  if (modal) {
    modal.addEventListener('show.bs.modal', function (event) {
      var trigger = event.relatedTarget;
      if (!trigger) return;

      var src = trigger.getAttribute('data-photo-src');
      var bib = trigger.getAttribute('data-photo-bib');
      var time = trigger.getAttribute('data-photo-time');
      var category = trigger.getAttribute('data-photo-category');
      var name = trigger.getAttribute('data-photo-name');
      var image = document.getElementById('photoModalImage');
      var title = document.getElementById('photoModalTitle');
      var meta = document.getElementById('photoModalMeta');
      var download = document.getElementById('photoModalDownload');

      if (image && src) {
        image.src = src;
        image.alt = 'Foto BIB ' + bib + ' - ' + name;
      }
      if (title) title.textContent = 'BIB ' + bib + ' — ' + name;
      if (meta) meta.textContent = [category, time].filter(Boolean).join(' • ');
      if (download && src) {
        download.href = src;
        download.setAttribute('download', 'bib-' + bib + '.jpg');
      }
    });

    modal.addEventListener('hidden.bs.modal', function () {
      var image = document.getElementById('photoModalImage');
      if (image) image.src = '';
    });
  }

  rebuildSearchIndex();
  applyFilter();
})();
</script>
