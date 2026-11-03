import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Backend used by the dev server proxy (see `npm run dev:php` in README). */
const phpUrl = process.env.RACETAP_PHP_URL || 'http://127.0.0.1:8180';

/**
 * The build output is committed to assets/app so the shared host (no Node) can
 * serve it. File names are deterministic and referenced by the PHP shells.
 *
 * Three entry points are produced:
 *   site.js    - the public site + admin SPA
 *   results.js - the per-event race results viewer
 *   kiosk.js   - the BIB check / result kiosk display
 */

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.csv': 'text/csv',
  '.xml': 'application/xml',
  '.txt': 'text/plain',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

/**
 * Serves repository assets straight from disk in development:
 *   /assets/...      -> <repo>/assets/...
 *   /favicon.ico, /sitemap.xml, /robots.txt
 *
 * PHP is only needed for the JSON API, so images, covers, photos and the
 * favicon keep working even when the backend is not running.
 */
function repoStaticServer(): Plugin {
  const repoRoot = path.resolve(rootDir, '..');
  const mounts: Array<{ prefix: string; root: string }> = [
    { prefix: '/assets/', root: path.join(repoRoot, 'assets') }
  ];
  const rootFiles = new Set(['/favicon.ico', '/sitemap.xml', '/robots.txt', '/apple-touch-icon.png', '/favicon-32.png']);

  const send = (
    file: string,
    response: import('node:http').ServerResponse,
    next: () => void
  ) => {
    if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
      next();
      return;
    }

    response.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
    response.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(file).pipe(response);
  };

  return {
    name: 'racetap-repo-static',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = decodeURIComponent((request.url || '').split('?')[0]);

        if (url.includes('..')) {
          next();
          return;
        }

        if (rootFiles.has(url)) {
          send(path.join(repoRoot, url.slice(1)), response, next);
          return;
        }

        for (const mount of mounts) {
          if (url.startsWith(mount.prefix)) {
            const relative = url.slice(mount.prefix.length);
            const file = path.resolve(mount.root, relative);

            if (!file.startsWith(mount.root)) {
              next();
              return;
            }

            send(file, response, next);
            return;
          }
        }

        next();
      });
    }
  };
}

/**
 * Forwards `/index.php/*` to the PHP backend without Vite's http-proxy, so a
 * stopped backend returns a friendly JSON 503 instead of spamming the console
 * with ECONNREFUSED proxy errors.
 */
function apiDevProxy(target: string): Plugin {
  const backend = new URL(target);
  let warned = false;

  return {
    name: 'racetap-api-dev-proxy',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url || '';

        if (!url.startsWith('/index.php')) {
          next();
          return;
        }

        const chunks: Buffer[] = [];
        request.on('data', (chunk: Buffer) => chunks.push(chunk));
        request.on('end', () => {
          const headers: Record<string, string> = {};

          for (const [key, value] of Object.entries(request.headers)) {
            if (typeof value === 'string') {
              headers[key] = value;
            } else if (Array.isArray(value)) {
              headers[key] = value.join(', ');
            }
          }

          headers.host = backend.host;

          fetch(new URL(url, backend), {
            method: request.method,
            headers,
            body: ['GET', 'HEAD'].includes(request.method || 'GET') ? undefined : Buffer.concat(chunks),
            redirect: 'manual'
          })
            .then(async (upstream) => {
              response.statusCode = upstream.status;

              upstream.headers.forEach((value, key) => {
                if (!['content-encoding', 'transfer-encoding', 'content-length'].includes(key)) {
                  response.setHeader(key, value);
                }
              });

              const cookies = typeof upstream.headers.getSetCookie === 'function' ? upstream.headers.getSetCookie() : [];

              if (cookies.length > 0) {
                response.setHeader('set-cookie', cookies);
              }

              const body = Buffer.from(await upstream.arrayBuffer());
              response.setHeader('content-length', body.length);
              response.end(body);
            })
            .catch(() => {
              if (!warned) {
                warned = true;
                server.config.logger.warn(
                  `[racetap] PHP backend tidak berjalan di ${target}. Jalankan "npm run dev:php" (atau "npm run dev" yang menyalakannya otomatis).`
                );
              }

              response.statusCode = 503;
              response.setHeader('Content-Type', 'application/json; charset=utf-8');
              response.end(
                JSON.stringify({
                  data: null,
                  error: { message: 'Backend PHP belum berjalan. Jalankan: npm run dev:php' }
                })
              );
            });
        });
      });
    }
  };
}

/**
 * Serves the legacy data directories during development so the viewer and the
 * kiosk can read real files:
 *   /results-dev/<event>/...  ->  <repo>/results/<event>/...
 *   /kiosk-dev/<instance>/... ->  <repo>/<instance>/...
 */
function legacyDataServer(): Plugin {
  const repoRoot = path.resolve(rootDir, '..');

  const mount = (prefix: string, resolveRoot: (segment: string) => string) => {
    return (
      request: { url?: string },
      response: import('node:http').ServerResponse,
      next: () => void
    ) => {
      const url = (request.url || '').split('?')[0];
      const decoded = decodeURIComponent(url).replace(/^\/+/, '');

      if (decoded.includes('..')) {
        next();
        return;
      }

      const [segment, ...rest] = decoded.split('/');
      const base = path.resolve(resolveRoot(segment));
      const file = path.join(base, rest.join('/'));

      if (!file.startsWith(base) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
        next();
        return;
      }

      response.setHeader(
        'Content-Type',
        MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'
      );
      fs.createReadStream(file).pipe(response);
    };
  };

  return {
    name: 'racetap-legacy-data',
    configureServer(server) {
      server.middlewares.use(
        '/results-dev',
        mount('results-dev', (segment) => path.join(repoRoot, 'results', segment))
      );
      server.middlewares.use(
        '/kiosk-dev',
        mount('kiosk-dev', (segment) => path.join(repoRoot, segment))
      );
    }
  };
}

/**
 * Mirrors the production URL shapes in the dev server, where every results
 * event and every kiosk is a real directory on disk:
 *   /results/<slug>/          -> results.html?slug=<slug>
 *   /<instance>.racetap.id/   -> kiosk.html?instance=<instance>
 */
function devRoutes(): Plugin {
  const results = /^\/results\/([^/]+)\/?$/;
  const resultsFile = /^\/results\/([^/]+)\/([^/]+)$/;
  const kiosk = /^\/([^/]+\.racetap\.id)\/?$/;

  return {
    name: 'racetap-dev-routes',
    configureServer(server) {
      server.middlewares.use((request, _response, next) => {
        const url = (request.url || '').split('?')[0];
        const result = results.exec(url);
        const resultFile = resultsFile.exec(url);
        const instance = kiosk.exec(url);

        if (url === '/results' || url === '/results/') {
          // Vite would resolve the bare path to results.html; production serves
          // the SPA results grid there instead.
          request.url = '/index.html';
        } else if (result) {
          request.url = `/results.html?slug=${encodeURIComponent(result[1])}`;
        } else if (resultFile) {
          // /results/<slug>/data.json, summary.json and banner files live outside web/.
          request.url = `/results-dev/${encodeURIComponent(resultFile[1])}/${resultFile[2]}`;
        } else if (instance) {
          request.url = `/kiosk.html?instance=${encodeURIComponent(instance[1])}`;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  base: './',
  // devRoutes must run before legacyDataServer so rewritten /results/<slug>/file
  // URLs are still seen by the /results-dev mount.
  plugins: [react(), repoStaticServer(), apiDevProxy(phpUrl), devRoutes(), legacyDataServer()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    fs: { allow: ['..'] }
  },
  build: {
    outDir: '../assets/app',
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        site: path.resolve(rootDir, 'index.html'),
        results: path.resolve(rootDir, 'results.html'),
        kiosk: path.resolve(rootDir, 'kiosk.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: (info) => {
          const source = 'names' in info && Array.isArray(info.names) ? info.names[0] : info.name || '';

          if (source.endsWith('.css')) {
            const name = path.basename(source, '.css');

            return `${['site', 'results', 'kiosk'].includes(name) ? name : 'app'}.css`;
          }

          return 'media/[name]-[hash][extname]';
        }
      }
    }
  }
});

