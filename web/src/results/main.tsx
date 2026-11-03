import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './results.css';
import ResultsApp from './ResultsApp';
import eventsFile from './events.json';
import type { EventConfig, ResultsPayload } from './types';
import { ToastProvider } from '../components/Toast';
import { I18nProvider } from '../i18n/I18nProvider';
import { initTheme } from '../lib/theme';

interface EventsFile {
  events: Array<EventConfig & { metaTitle?: string }>;
}

function readPayload(): ResultsPayload | null {
  const node = document.getElementById('racetap-payload');

  if (node && node.textContent) {
    try {
      return JSON.parse(node.textContent) as ResultsPayload;
    } catch {
      return null;
    }
  }

  return null;
}

function devSlug(): string {
  // The dev server rewrites /results/<slug>/ to results.html internally, so the
  // browser URL keeps the slug in the path (not in the query string).
  const match = window.location.pathname.match(/\/results\/([^/]+)\/?$/);

  if (match) {
    return decodeURIComponent(match[1]);
  }

  return new URLSearchParams(window.location.search).get('slug') || 'jember-10k';
}

function devPayload(): ResultsPayload | null {
  const slug = devSlug();
  const file = eventsFile as EventsFile;
  const config = file.events.find((item) => item.slug === slug) || file.events[0];

  if (!config) {
    return null;
  }

  return {
    mode: 'results',
    slug: config.slug,
    dataUrl: `/results-dev/${encodeURIComponent(config.slug)}/data.json`,
    assetBase: `/results-dev/${encodeURIComponent(config.slug)}/`,
    config
  };
}

initTheme();

const payload = readPayload() || devPayload();
const root = document.getElementById('root');

if (root) {
  if (!payload) {
    root.textContent = 'Konfigurasi halaman hasil tidak ditemukan.';
  } else {
    createRoot(root).render(
      <StrictMode>
        <I18nProvider>
          <ToastProvider>
            <ResultsApp payload={payload} />
          </ToastProvider>
        </I18nProvider>
      </StrictMode>
    );
  }
}
