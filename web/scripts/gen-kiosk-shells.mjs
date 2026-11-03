/**
 * Writes the kiosk shells (index.html) into every kiosk instance directory.
 *
 * The directory keeps its own setting JSON, data.csv, background images and
 * fonts; only the ~430 lines of inline JavaScript are replaced by the shared
 * assets/app/kiosk.js bundle.
 *
 *   node scripts/gen-kiosk-shells.mjs
 *   node scripts/gen-kiosk-shells.mjs --check
 *   node scripts/gen-kiosk-shells.mjs --asset-base=http://localhost/Racetap/assets/app/
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const manifestPath = path.resolve(here, '../src/kiosk/instances.json');
const checkOnly = process.argv.includes('--check');
const assetBaseArg = process.argv.find((arg) => arg.startsWith('--asset-base='));
const assetBase = assetBaseArg ? assetBaseArg.split('=')[1] : 'https://racetap.id/assets/app/';
const siteBase = assetBase.replace(/assets\/app\/?$/, '');

const { instances } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

function shell(instance) {
  const payload = {
    mode: 'kiosk',
    configUrl: instance.configUrl,
    assetBase: './'
  };

  const fonts = (instance.fonts || []).map((font) => `    ${font}`).join('\n');

  return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>${escapeHtml(instance.title)}</title>
<link rel="icon" href="${siteBase}favicon.ico" sizes="48x48">
<link rel="apple-touch-icon" sizes="180x180" href="${siteBase}assets/images/favicon-180.png">
<style>
${fonts}

    html, body { margin: 0; width: 100%; height: 100%; overflow: hidden; background: #000; }
</style>
<link rel="stylesheet" href="${assetBase}kiosk.css">
</head>
<body>
<div id="root"></div>
<script id="racetap-payload" type="application/json">${JSON.stringify(payload).replace(/</g, '\\u003c')}</script>
<script type="module" src="${assetBase}kiosk.js"></script>
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

for (const instance of instances) {
  const dir = path.join(repoRoot, instance.path);

  if (!fs.existsSync(dir)) {
    console.warn(`skip (missing directory): ${instance.path}`);
    continue;
  }

  const file = path.join(dir, 'index.html');
  const next = shell(instance);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  if (current === next) {
    continue;
  }

  if (checkOnly) {
    console.error(`stale shell: ${instance.path}/index.html`);
    stale++;
    continue;
  }

  fs.writeFileSync(file, next);
  written++;
}

if (checkOnly) {
  if (stale > 0) {
    console.error(`${stale} kiosk shell(s) out of date. Run: npm run gen`);
    process.exit(1);
  }

  console.log('kiosk shells are up to date');
} else {
  console.log(`wrote ${written} kiosk shell(s)`);
}
