<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= html_escape($page['title']) ?></title>
  <meta name="description" content="<?= html_escape($page['description']) ?>">
  <?php if (!empty($page['noindex'])): ?>
  <meta name="robots" content="noindex, nofollow">
  <?php endif; ?>
  <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='22' fill='%0b4e6b'/%3E%3Ctext x='50' y='68' font-size='58' font-family='Arial' font-weight='800' fill='white' text-anchor='middle'%3ER%3C/text%3E%3C/svg%3E">
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
