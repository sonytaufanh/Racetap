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

// Fields the viewer actually reads; the rest of the manifest (name, location,
// cover, latest) is site metadata and must not leak into the shell payload.
const CONFIG_KEYS = [
  'slug',
  'title',
  'metaTitle',
  'description',
  'banner',
  'bannerAlt',
  'maintenance',
  'maintenanceMessage',
  'distanceOverride',
  'pageSize',
  'filters',
  'columns',
  'hiddenBelow640',
  'hiddenBelow480'
];

function eventConfig(entry) {
  const config = {};

  for (const key of CONFIG_KEYS) {
    if (entry[key] !== undefined) {
      config[key] = entry[key];
    }
  }

  return config;
}

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
<link rel="icon" href="../../favicon.ico" sizes="48x48">
<link rel="icon" type="image/png" sizes="32x32" href="../../assets/images/favicon-32.png">
<link rel="apple-touch-icon" sizes="180x180" href="../../assets/images/favicon-180.png">
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

const TIME_RE = /^(\d{1,2}):(\d{2}):(\d{2})$/;

function seconds(value) {
  const match = TIME_RE.exec(String(value || ''));

  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : Number.POSITIVE_INFINITY;
}

function text(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

/**
 * Small, crawlable summary of an event (counts, categories, podium) so the
 * event detail page does not have to download the full 3-9 MB data.json.
 */
function summarize(entry, dir) {
  const dataFile = path.join(dir, 'data.json');

  if (!fs.existsSync(dataFile)) {
    return null;
  }

  let json;

  try {
    json = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  } catch {
    console.warn(`skip summary (invalid data.json): ${entry.slug}`);
    return null;
  }

  const race = json.race || {};
  const scores = Array.isArray(json.scores) ? json.scores : [];
  const items = Array.isArray(race.items) ? race.items : [];
  const itemName = (score) => {
    const explicit = text(score.item_name);

    if (explicit !== '') {
      return explicit;
    }

    const item = items.find((candidate) => Number(candidate.id) === Number(score.item_id));

    return item ? text(item.title) : '';
  };

  const finishers = scores.filter((score) => {
    const net = text(score.net_score);
    return net !== '' && net !== '00:00:00';
  });

  const categories = Array.from(new Set(scores.map(itemName).filter((value) => value !== ''))).sort();
  const byCategory = new Map();

  for (const score of finishers) {
    const item = itemName(score) || 'Overall';

    if (!byCategory.has(item)) {
      byCategory.set(item, []);
    }

    byCategory.get(item).push(score);
  }

  // One podium per distance; mixing 5K and 10K in a single ranking is misleading.
  const podiums = Array.from(byCategory.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([item, list]) => ({
      item,
      athletes: list
        .slice()
        .sort((a, b) => seconds(a.net_score) - seconds(b.net_score))
        .slice(0, 3)
        .map((score) => ({
          name: text(score.name),
          bib: text(score.bib),
          netTime: text(score.net_score),
          gunTime: text(score.total_score)
        }))
    }));

  return {
    slug: entry.slug,
    name: entry.name,
    title: text(race.title) || entry.name,
    date: race.date_time ? new Date(Number(race.date_time) * 1000).toISOString().slice(0, 10) : null,
    participants: scores.length,
    finishers: finishers.length,
    categories,
    distance:
      typeof entry.distanceOverride === 'string' && entry.distanceOverride !== ''
        ? entry.distanceOverride
        : categories.join(' & ') || null,
    podiums
  };
}

let written = 0;
let stale = 0;
let summaries = 0;
let summariesStale = 0;

for (const entry of events) {
  const config = eventConfig(entry);
  const dir = path.join(resultsRoot, config.slug);

  if (!fs.existsSync(dir)) {
    console.warn(`skip (missing directory): ${config.slug}`);
    continue;
  }

  const file = path.join(dir, 'index.html');
  const next = shell(config);
  const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';

  if (current === next) {
    // shell already current
  } else if (checkOnly) {
    console.error(`stale shell: results/${config.slug}/index.html`);
    stale++;
  } else {
    fs.writeFileSync(file, next);
    written++;
  }

  const summary = summarize(entry, dir);

  if (!summary) {
    continue;
  }

  const summaryFile = path.join(dir, 'summary.json');
  const summaryBody = `${JSON.stringify(summary, null, 2)}\n`;
  const summaryCurrent = fs.existsSync(summaryFile) ? fs.readFileSync(summaryFile, 'utf8') : '';

  if (summaryCurrent === summaryBody) {
    continue;
  }

  if (checkOnly) {
    console.error(`stale summary: results/${config.slug}/summary.json`);
    summariesStale++;
  } else {
    fs.writeFileSync(summaryFile, summaryBody);
    summaries++;
  }
}

if (checkOnly) {
  if (stale > 0 || summariesStale > 0) {
    console.error(`result shells/summaries out of date (${stale} shell, ${summariesStale} summary). Run: npm run gen`);
    process.exit(1);
  }

  console.log('result shells are up to date');
} else {
  console.log(`wrote ${written} result shell(s), ${summaries} summary file(s)`);
}
