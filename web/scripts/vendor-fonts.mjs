/**
 * Vendors the certificate font catalog into the repository.
 *
 * Certificate text is drawn on a canvas, so the browser must have the exact
 * font available before rendering. Self-hosting the woff2 files makes the
 * output deterministic (no Google Fonts dependency at download time) and keeps
 * the admin preview identical to the participant download.
 *
 *   node scripts/vendor-fonts.mjs            # download + rewrite fonts.css
 *   node scripts/vendor-fonts.mjs --check    # fail when files are missing
 *
 * Only the `latin` subset is stored: it already covers the Latin-1 accented
 * characters used in participant names (é, ü, ñ, ...) and drops the extended
 * Latin/Cyrillic/Vietnamese ranges that would triple the payload.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(here, '..');
const fontsDir = path.resolve(webRoot, 'src/assets/fonts');
const cssFile = path.resolve(webRoot, 'src/certificate/fonts.css');
const checkOnly = process.argv.includes('--check');

/** Keep in sync with src/certificate/fonts.ts */
const CATALOG = [
  { id: 'playfair-display', family: 'Playfair Display', weights: [400, 700], italic: true },
  { id: 'cormorant-garamond', family: 'Cormorant Garamond', weights: [400, 700], italic: false },
  { id: 'cinzel', family: 'Cinzel', weights: [400, 700], italic: false },
  { id: 'bodoni-moda', family: 'Bodoni Moda', weights: [400, 700], italic: false },
  { id: 'great-vibes', family: 'Great Vibes', weights: [400], italic: false },
  { id: 'dancing-script', family: 'Dancing Script', weights: [400, 700], italic: false },
  { id: 'montserrat', family: 'Montserrat', weights: [400, 700], italic: false },
  { id: 'inter', family: 'Inter', weights: [400, 600, 700], italic: false },
  { id: 'oswald', family: 'Oswald', weights: [400, 700], italic: false },
  { id: 'bebas-neue', family: 'Bebas Neue', weights: [400], italic: false },
  { id: 'roboto-slab', family: 'Roboto Slab', weights: [400, 700], italic: false },
  { id: 'courier-prime', family: 'Courier Prime', weights: [400], italic: false }
];

const SUBSETS = ['latin'];

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function cssUrl(entry) {
  const weights = entry.italic
    ? [...entry.weights.map((w) => `0,${w}`), ...entry.weights.map((w) => `1,${w}`)]
    : entry.weights.map((w) => `0,${w}`);

  const family = entry.family.trim().replace(/ /g, '+');

  // The axis list must be sorted; ital comes first, which the API expects.
  const sorted = weights.slice().sort((a, b) => {
    const [ai, aw] = a.split(',').map(Number);
    const [bi, bw] = b.split(',').map(Number);
    return ai === bi ? aw - bw : ai - bi;
  });

  return `https://fonts.googleapis.com/css2?family=${family}:ital,wght@${sorted.join(';')}&display=swap`;
}

function parseBlocks(css) {
  const blocks = [];
  const re = /\/\*\s*([a-z0-9-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  let match;

  while ((match = re.exec(css)) !== null) {
    const body = match[2];
    const pick = (prop) => {
      const found = new RegExp(`${prop}\\s*:\\s*([^;]+);`).exec(body);
      return found ? found[1].trim() : '';
    };

    const src = /url\((https:\/\/[^)]+\.woff2)\)/.exec(body);

    if (!src) {
      continue;
    }

    blocks.push({
      subset: match[1],
      family: pick('font-family').replace(/['"]/g, ''),
      style: pick('font-style') || 'normal',
      weight: pick('font-weight') || '400',
      unicodeRange: pick('unicode-range'),
      url: src[1]
    });
  }

  return blocks;
}

async function fetchText(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return response.text();
}

async function fetchBinary(url) {
  const response = await fetch(url, { headers: { 'User-Agent': UA } });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} for ${url}`);
  }

  return Buffer.from(await response.arrayBuffer());
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Google throttles bursts of css2 requests, answering with a body that carries
 * no subset blocks. Retry before giving up.
 */
async function fetchBlocks(entry) {
  const url = cssUrl(entry);
  let last = '';

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const css = await fetchText(url);
    const blocks = parseBlocks(css).filter((block) => SUBSETS.includes(block.subset));

    if (blocks.length > 0) {
      return blocks;
    }

    last = css.slice(0, 200);
    await sleep(600 * attempt);
  }

  throw new Error(`no ${SUBSETS.join('/')} subset for ${entry.id} (last response: ${last})`);
}

async function main() {
  fs.mkdirSync(fontsDir, { recursive: true });
  fs.mkdirSync(path.dirname(cssFile), { recursive: true });

  const declarations = [];
  let downloaded = 0;
  let missing = 0;

  for (const entry of CATALOG) {
    const blocks = await fetchBlocks(entry);

    for (const block of blocks) {
      const weight = block.weight.replace(/\s+/g, '');
      const style = block.style === 'italic' ? 'italic' : 'normal';
      const styleTag = style === 'italic' ? '-italic' : '';
      const file = `${entry.id}-${weight}${styleTag}-${block.subset}.woff2`;
      const target = path.join(fontsDir, file);

      if (!fs.existsSync(target)) {
        if (checkOnly) {
          console.error(`missing font: ${file}`);
          missing++;
        } else {
          fs.writeFileSync(target, await fetchBinary(block.url));
          downloaded++;
        }
      }

      declarations.push(
        [
          `@font-face {`,
          `  font-family: '${block.family}';`,
          `  font-style: ${style};`,
          `  font-weight: ${weight};`,
          `  font-display: swap;`,
          `  src: url('../assets/fonts/${file}') format('woff2');`,
          `  unicode-range: ${block.unicodeRange};`,
          `}`
        ].join('\n')
      );
    }
  }

  if (checkOnly) {
    if (missing > 0) {
      console.error(`certificate fonts out of date (${missing} missing). Run: node scripts/vendor-fonts.mjs`);
      process.exit(1);
    }

    console.log('certificate fonts are up to date');
    return;
  }

  const header = [
    '/*',
    ' * Self-hosted certificate fonts. Generated by scripts/vendor-fonts.mjs -',
    ' * edit the catalog there (and in src/certificate/fonts.ts), then re-run it.',
    ' */',
    ''
  ].join('\n');

  fs.writeFileSync(cssFile, `${header}${declarations.join('\n\n')}\n`);
  console.log(`wrote ${declarations.length} @font-face rules (${downloaded} new file(s)) to src/certificate/fonts.css`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
