/**
 * Generates sitemap.xml and robots.txt at the repository root.
 *
 * The public site is served from the repository root, so the files land next to
 * index.php and are picked up by search engines on the shared host.
 *
 *   node scripts/gen-sitemap.mjs
 *   node scripts/gen-sitemap.mjs --base=https://racetap.id
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const manifestPath = path.resolve(here, '../src/results/events.json');

const baseArg = process.argv.find((arg) => arg.startsWith('--base='));
const base = (baseArg ? baseArg.split('=')[1] : process.env.RACETAP_SITE_URL || 'https://racetap.id').replace(/\/+$/, '');

const STATIC_PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/about', priority: '0.7', changefreq: 'monthly' },
  { path: '/services', priority: '0.8', changefreq: 'monthly' },
  { path: '/results', priority: '0.9', changefreq: 'weekly' },
  { path: '/photos', priority: '0.8', changefreq: 'weekly' },
  { path: '/clients', priority: '0.6', changefreq: 'monthly' },
  { path: '/faq', priority: '0.6', changefreq: 'monthly' },
  { path: '/contact', priority: '0.7', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' }
];

const { events } = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
// Use the manifest timestamp so the sitemap only changes when events change.
const today = fs.statSync(manifestPath).mtime.toISOString().slice(0, 10);

const urls = [
  ...STATIC_PAGES.map((page) => ({
    loc: `${base}${page.path}`,
    changefreq: page.changefreq,
    priority: page.priority
  })),
  ...events.flatMap((event) => [
    { loc: `${base}/events/${encodeURIComponent(event.slug)}`, changefreq: 'monthly', priority: '0.7' },
    { loc: `${base}/results/${encodeURIComponent(event.slug)}/`, changefreq: 'weekly', priority: '0.8' }
  ])
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (url) => `  <url>
    <loc>${url.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const robots = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /web/

Sitemap: ${base}/sitemap.xml
`;

fs.writeFileSync(path.join(repoRoot, 'sitemap.xml'), xml);
fs.writeFileSync(path.join(repoRoot, 'robots.txt'), robots);

console.log(`wrote sitemap.xml (${urls.length} urls) and robots.txt for ${base}`);
