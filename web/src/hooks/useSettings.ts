import { useEffect, useState } from 'react';
import { api } from '../lib/http';

export interface SiteSettings {
  site_name: string;
  tagline: string;
  whatsapp: string;
  email: string;
  address: string;
  instagram: string;
  facebook: string;
  youtube: string;
  tiktok: string;
  seo_description: string;
  maintenance_notice: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  site_name: 'RaceTap',
  tagline: 'Race Timing & Event Technology',
  whatsapp: '6281249374648',
  email: 'hello@racetap.id',
  address: 'Yogyakarta, Indonesia',
  instagram: '',
  facebook: '',
  youtube: '',
  tiktok: '',
  seo_description:
    'Solusi race timing dan event technology untuk event lari: RFID timing, pengelolaan hasil, dan pencarian foto BIB.',
  maintenance_notice: ''
};

export function whatsappLink(number: string, message?: string): string {
  const digits = String(number || '').replace(/[^0-9]/g, '');
  const text = message ? `?text=${encodeURIComponent(message)}` : '';

  return `https://wa.me/${digits}${text}`;
}

/**
 * Settings are shared by the navbar, footer, CTA, contact and event pages, so
 * the response is cached across mounts for the lifetime of the page.
 */
let cache: SiteSettings | null = null;
let pending: Promise<SiteSettings> | null = null;

function loadSettings(): Promise<SiteSettings> {
  if (cache) {
    return Promise.resolve(cache);
  }

  if (!pending) {
    pending = api<Partial<SiteSettings>>('/settings')
      .then((data) => {
        cache = { ...DEFAULT_SETTINGS, ...(data || {}) };
        return cache;
      })
      .catch(() => DEFAULT_SETTINGS)
      .finally(() => {
        pending = null;
      });
  }

  return pending;
}

export function useSettings() {
  const [settings, setSettings] = useState<SiteSettings>(cache || DEFAULT_SETTINGS);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    loadSettings()
      .then((next) => {
        if (active) {
          setSettings(next);
        }
      })
      .catch(() => {
        if (active) {
          setError('Pengaturan situs tidak dapat dimuat.');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { settings, loading: cache === null, error };
}
