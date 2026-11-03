/**
 * Development entry point:
 *   1. starts the PHP backend (router.php) when port 8180 is free,
 *   2. starts the Vite dev server,
 *   3. shuts the backend down when Vite exits.
 *
 * Images and favicons are served straight from disk by Vite, so the frontend
 * still renders when PHP is unavailable; only the JSON API needs it.
 */
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const webDir = path.resolve(here, '..');
const repoRoot = path.resolve(webDir, '..');

const host = process.env.RACETAP_PHP_HOST || '127.0.0.1';
const port = Number(process.env.RACETAP_PHP_PORT || 8180);
const phpBin = process.env.PHP_BIN || 'php';

function portOpen(targetHost, targetPort) {
  return new Promise((resolve) => {
    const socket = net.connect({ host: targetHost, port: targetPort });

    socket.setTimeout(500);
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.once('error', () => resolve(false));
  });
}

let backend = null;

if (await portOpen(host, port)) {
  console.log(`[dev] PHP backend sudah berjalan di http://${host}:${port}`);
} else {
  backend = spawn(phpBin, ['-S', `${host}:${port}`, '-t', repoRoot, path.join(repoRoot, 'router.php')], {
    cwd: repoRoot,
    stdio: 'inherit'
  });

  backend.on('error', (error) => {
    console.warn(`[dev] PHP tidak dapat dijalankan (${error.message}). Frontend tetap jalan; API akan membalas 503.`);
    backend = null;
  });

  await new Promise((resolve) => setTimeout(resolve, 900));
  console.log(`[dev] PHP backend: http://${host}:${port}`);
}

// Spawn Vite through Node directly: `npm.cmd` requires a shell on Windows and
// fails with EINVAL when this script is itself launched by npm.
const viteBin = path.join(webDir, 'node_modules', 'vite', 'bin', 'vite.js');
const vite = spawn(process.execPath, [viteBin], { cwd: webDir, stdio: 'inherit' });

vite.on('error', (error) => {
  console.error(`[dev] Vite gagal dijalankan: ${error.message}`);
  shutdown(1);
});

function shutdown(code = 0) {
  if (backend && !backend.killed) {
    backend.kill();
  }

  process.exit(code);
}

process.on('SIGINT', () => {
  vite.kill();
  shutdown(0);
});

process.on('SIGTERM', () => {
  vite.kill();
  shutdown(0);
});

vite.on('exit', (code) => shutdown(code ?? 0));
