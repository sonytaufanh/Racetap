import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

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
  '.svg': 'image/svg+xml',
  '.css': 'text/css',
  '.csv': 'text/csv'
};

/** Serves ../results/<slug>/** during development so the viewer can read real data. */
function resultsDevServer(): Plugin {
  const repoRoot = path.resolve(__dirname, '..');

  return {
    name: 'racetap-results-dev',
    configureServer(server) {
      server.middlewares.use('/results-dev', (request, response, next) => {
        const url = (request.url || '').split('?')[0];
        const file = path.join(repoRoot, 'results', decodeURIComponent(url));

        if (!file.startsWith(path.join(repoRoot, 'results')) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
          next();
          return;
        }

        response.setHeader('Content-Type', MIME[path.extname(file).toLowerCase()] || 'application/octet-stream');
        fs.createReadStream(file).pipe(response);
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), resultsDevServer()],
  server: {
    fs: { allow: ['..'] },
    port: 5173
  },
  build: {
    outDir: '../assets/app',
    emptyOutDir: true,
    cssCodeSplit: true,
    rollupOptions: {
      input: {
        site: path.resolve(__dirname, 'index.html'),
        results: path.resolve(__dirname, 'results.html'),
        kiosk: path.resolve(__dirname, 'kiosk.html')
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
