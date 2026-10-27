/**
 * Generates web/src/results/events.json from the legacy per-event pages.
 *
 * Run once during the migration (`node scripts/import-legacy-results.mjs`).
 * After that, events.json is the source of truth and is edited by hand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../results');
const out = path.resolve(here, '../src/results/events.json');

const COLUMN_MAP = {
  Dist: 'item',
  Bib: 'bib',
  Name: 'name',
  Cert: 'cert',
  Gender: 'gender',
  'Age Grp': 'ageGroup',
  'Age Group': 'ageGroup',
  'Age Grp 2': 'ageGroup2',
  'Gun Time': 'gunTime',
  'Net Time': 'netTime',
  'Overall Rank': 'overallRank',
  'Gender Rank': 'genderRank',
  'Age Rank': 'ageRank',
  'Age2 Rank': 'age2Rank',
  Status: 'status'
};

const FILTER_MAP = {
  itemFilter: 'item',
  genderFilter: 'gender',
  ageGroupFilter: 'ageGroup',
  ageGroup2Filter: 'ageGroup2'
};

const DEFAULT_COLUMNS = [
  'item',
  'bib',
  'name',
  'cert',
  'gender',
  'ageGroup',
  'gunTime',
  'netTime',
  'overallRank',
  'genderRank',
  'ageRank',
  'status'
];

const DISTANCE_OVERRIDE = {
  'sarkororun-v2': '5K'
};

const events = [];

for (const slug of fs.readdirSync(root).sort()) {
  const file = path.join(root, slug, 'index.html');
  if (!fs.existsSync(file)) continue;

  const html = fs.readFileSync(file, 'utf8');
  const pick = (re) => (html.match(re) || [])[1] || '';

  const title = pick(/<title>([\s\S]*?)<\/title>/).trim();
  const description = pick(/name="description" content="([^"]*)"/);
  const banner =
    pick(/BANNER_URL\s*=\s*['"]([^'"]*)['"]/) ||
    pick(/<div class="banner">\s*<img src="([^"]*)"/);
  const bannerAlt = pick(/id="bannerImg"[^>]*alt="([^"]*)"/);

  const columns = [];
  for (const match of html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)) {
    const label = match[1].replace(/<[^>]+>/g, '').trim();
    const key = COLUMN_MAP[label];
    if (key) columns.push(key);
  }

  const filters = [];
  for (const match of html.matchAll(/<select id="([^"]+)"/g)) {
    const key = FILTER_MAP[match[1]];
    if (key) filters.push(key);
  }

  const maintenance = /masih dalam proses/.test(html);
  const entry = { slug };

  if (title) entry.metaTitle = title;
  if (description) entry.description = description;
  entry.banner = banner || null;
  if (bannerAlt) entry.bannerAlt = bannerAlt;

  if (maintenance) {
    entry.maintenance = true;
  }

  if (DISTANCE_OVERRIDE[slug]) {
    entry.distanceOverride = DISTANCE_OVERRIDE[slug];
  } else if (slug !== 'ahy-run-2026') {
    entry.distanceOverride = '5K & 10K';
  }

  const resolvedColumns = columns.length > 0 ? columns : DEFAULT_COLUMNS;
  entry.columns = resolvedColumns;
  entry.filters = filters.length > 0 ? filters : ['item', 'gender', 'ageGroup'];

  const wide = resolvedColumns.length > 12;
  entry.hiddenBelow640 = wide ? ['ageGroup2', 'ageRank', 'age2Rank'] : ['ageGroup', 'ageRank'];
  entry.hiddenBelow480 = wide
    ? ['cert', 'ageGroup', 'genderRank', 'ageRank', 'age2Rank']
    : ['cert', 'genderRank', 'ageRank'];

  events.push(entry);
}

fs.writeFileSync(out, `${JSON.stringify({ events }, null, 2)}\n`);
console.log(`wrote ${events.length} events to ${path.relative(process.cwd(), out)}`);

