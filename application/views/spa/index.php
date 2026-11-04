<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= html_escape($page['title']) ?></title>
  <meta name="description" content="<?= html_escape($page['description']) ?>">
  <?php if (!empty($page['noindex'])): ?>
  <meta name="robots" content="noindex, nofollow">
  <?php else: ?>
  <link rel="canonical" href="<?= html_escape(!empty($page['canonical']) ? $page['canonical'] : rtrim(base_url(), '/') . $path) ?>">
  <?php endif; ?>
  <meta name="theme-color" content="#0b4e6b">
  <meta name="color-scheme" content="light dark">
  <meta property="og:site_name" content="Racetap">
  <meta property="og:type" content="<?= html_escape(!empty($page['og_type']) ? $page['og_type'] : 'website') ?>">
  <meta property="og:title" content="<?= html_escape(!empty($page['og_title']) ? $page['og_title'] : $page['title']) ?>">
  <meta property="og:description" content="<?= html_escape($page['description']) ?>">
  <meta property="og:url" content="<?= html_escape(rtrim(base_url(), '/') . $path) ?>">
  <?php if (!empty($page['og_image'])): ?>
  <meta property="og:image" content="<?= html_escape($page['og_image']) ?>">
  <meta name="twitter:image" content="<?= html_escape($page['og_image']) ?>">
  <?php endif; ?>
  <meta name="twitter:card" content="<?= !empty($page['og_image']) ? 'summary_large_image' : 'summary' ?>">
  <meta name="twitter:title" content="<?= html_escape(!empty($page['og_title']) ? $page['og_title'] : $page['title']) ?>">
  <meta name="twitter:description" content="<?= html_escape($page['description']) ?>">
  <?php if (!empty($page['jsonld'])): ?>
  <script type="application/ld+json"><?= json_encode($page['jsonld'], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG) ?></script>
  <?php endif; ?>
  <?php $favicon_version = is_file(FCPATH . 'favicon.ico') ? filemtime(FCPATH . 'favicon.ico') : 1; ?>
  <link rel="icon" href="<?= base_url('favicon.ico') ?>?v=<?= $favicon_version ?>" sizes="48x48">
  <link rel="icon" type="image/png" sizes="32x32" href="<?= base_url('favicon-32.png') ?>?v=<?= $favicon_version ?>">
  <link rel="apple-touch-icon" sizes="180x180" href="<?= base_url('favicon-180.png') ?>?v=<?= $favicon_version ?>">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
  <link href="<?= html_escape($assets['css']) ?>" rel="stylesheet">
</head>
<body>
  <div id="root">
    <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#667085;">
      Memuat Racetap...
    </div>
  </div>
  <script id="racetap-payload" type="application/json"><?= $payload ?></script>
  <script type="module" src="<?= html_escape($assets['js']) ?>"></script>
</body>
</html>
