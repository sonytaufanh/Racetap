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

export function asset(path: string | null | undefined): string {
  if (!path) {
    return '';
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  // encodeURI keeps slashes but escapes spaces/unicode, so filenames such as
  // "ahy run 2026.webp" stay reachable on every server.
  return `${APP.baseUrl}${encodeURI(path.replace(/^\/+/, ''))}`;
}
