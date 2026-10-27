/**
 * Writes a tiny HTML shell into every results/<slug>/ directory.
 *
 * The directory stays a real folder on disk (so /results/<slug>/ keeps working
 * on the shared host without any rewrite rules) but the page itself is rendered
 * by assets/app/results.js instead of ~1.500 lines of duplicated inline JS.
 *
 *   node scripts/gen-results-shells.mjs          # write shells
 *   node scripts/gen-results-shells.mjs --check  # fail if a shell is stale
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const manifestPath = path.resolve(here, '../src/results/events.json');
const resultsRoot = path.resolve(repoRoot, 'results');
const checkOnly = process.argv.includes('--check');

const { events } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function shell(config) {
  const payload = {
    mode: 'results',
    slug: config.slug,
    dataUrl: 'data.json',
    assetBase: './',
    config
  };

  const title = config.metaTitle || `${config.slug} | RaceTap`;
  const description = config.description || 'Hasil resmi event lari Racetap.';

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
<link rel="stylesheet" href="../../assets/app/results.css">
</head>
<body>
<div id="root">
  <div style="min-height:60vh;display:flex;align-items:center;justify-content:center;font-family:Inter,sans-serif;color:#636e72;">
    Memuat hasil lomba...
  </div>
</div>
<script id="racetap-payload" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
<script type="module" src="../../assets/app/results.js"></script>
</body>
</html>
`;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let written = 0;
let stale = 0;

for (const config of events) {
  const dir = path.join(resultsRoot, config.slug);

  if (!fs.existsSync(dir)) {
    console.warn(`skip (missing directory): ${config.slug}`);
    continue;
  }

  const file = path.join(dir, 'index.html');
  const next = shell(config);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  if (current === next) {
    continue;
  }

  if (checkOnly) {
    console.error(`stale shell: results/${config.slug}/index.html`);
    stale++;
    continue;
  }

  fs.writeFileSync(file, next);
  written++;
}

if (checkOnly) {
  if (stale > 0) {
    console.error(`${stale} result shell(s) out of date. Run: npm run gen:results`);
    process.exit(1);
  }

  console.log('result shells are up to date');
} else {
  console.log(`wrote ${written} result shell(s)`);
}
