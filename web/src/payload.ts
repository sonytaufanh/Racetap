import type { AppPayload } from './types';

function readPayload(): AppPayload {
  const fallback: AppPayload = {
    baseUrl: '/',
    apiUrl: '/index.php/api/v1',
    basename: '',
    initialPath: '/',
    appName: 'Racetap'
  };

  const node = document.getElementById('racetap-payload');

  if (!node || !node.textContent) {
    return fallback;
  }

  try {
    const parsed = JSON.parse(node.textContent) as Partial<AppPayload>;
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export const APP = readPayload();

/** Anything that is already a full URL (CDN, data:, blob:) must pass through. */
const EXTERNAL_RE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;

/**
 * Legacy paths still stored in the database, JSON seeds and manifests, mapped
 * onto the files that now live in `web/public` (and therefore at the root of
 * the Vercel build output).
 */
const PUBLIC_MAP: Array<[RegExp, string]> = [
  [/^assets\/images\/portfolio\//i, 'portfolio/'],
  [/^assets\/images\/photos\//i, 'photos/'],
  [/^assets\/images\//i, ''],
  [/^assets\/app\//i, 'assets/app/']
];

/**
 * Resolves a stored media path (event cover, photo file, logo, ...) to the
 * root-absolute URL of the matching file in the public folder, so images work
 * on static hosting (Vercel) and on the PHP host alike.
 */
export function publicUrl(path: string | null | undefined): string {
  if (!path) {
    return '';
  }

  const value = String(path).trim();

  if (value === '') {
    return '';
  }

  if (EXTERNAL_RE.test(value) || /^(data|blob):/i.test(value)) {
    return value;
  }

  let relative = value.replace(/\\/g, '/').replace(/^[./]+/, '');

  for (const [pattern, replacement] of PUBLIC_MAP) {
    if (pattern.test(relative)) {
      relative = relative.replace(pattern, replacement);
      break;
    }
  }

  // encodeURI keeps slashes but escapes spaces/unicode, so filenames such as
  // "ahy run 2026.webp" stay reachable on every server.
  const base = APP.baseUrl && APP.baseUrl !== '/' ? APP.baseUrl.replace(/\/+$/, '') : '';

  return `${base}/${encodeURI(relative)}`;
}
