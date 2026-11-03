import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { CONTENT, type Content } from './content';
import { en, id, type Dictionary, type StringKey } from './strings';
import { LANGS, type Lang } from './types';
import { api } from '../lib/http';
import { SITE_EVENTS, type SiteEvent } from '../lib/events';

const DICTS: Record<Lang, Dictionary> = { id, en };
const STORAGE_KEY = 'racetap-lang';

type Vars = Record<string, string | number>;

interface CmsEvent {
  slug: string;
  name: string;
  location: string;
  cover: string;
  is_latest?: number;
}

interface CmsPayload {
  sections: Record<string, unknown>;
  events: CmsEvent[];
}

interface SeoMeta {
  route: string;
  locale: string;
  title: string;
  description: string;
  og_image: string;
  noindex: number;
}

interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: StringKey, vars?: Vars) => string;
  content: Content;
  events: SiteEvent[];
}

function isLang(value: string | null): value is Lang {
  return value === 'id' || value === 'en';
}

function preferredLang(): Lang {
  if (typeof window === 'undefined') {
    return 'id';
  }

  const saved = window.localStorage.getItem(STORAGE_KEY);

  if (isLang(saved)) {
    return saved;
  }

  return window.navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'id';
}

function interpolate(template: string, vars?: Vars): string {
  if (!vars) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : match
  );
}

/** CMS section payloads replace the bundled slice as a whole. */
function mergeContent(base: Content, sections: Record<string, unknown>): Content {
  const next: Record<string, unknown> = { ...(base as unknown as Record<string, unknown>) };

  for (const [key, value] of Object.entries(sections)) {
    if (key === 'ui' || value === null || value === undefined) {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(base, key)) {
      next[key] = value;
    }
  }

  return next as unknown as Content;
}

function mergeEvents(base: SiteEvent[], dbEvents: CmsEvent[]): SiteEvent[] {
  if (!Array.isArray(dbEvents) || dbEvents.length === 0) {
    return base;
  }

  const overrides = new Map(dbEvents.map((event) => [event.slug, event]));
  const merged = base.map((event) => {
    const override = overrides.get(event.slug);

    if (!override) {
      return event;
    }

    return {
      slug: override.slug,
      name: override.name,
      location: override.location,
      cover: override.cover || event.cover,
      latest: Boolean(override.is_latest)
    };
  });
  const known = new Set(base.map((event) => event.slug));

  for (const event of dbEvents) {
    if (known.has(event.slug)) {
      continue;
    }

    merged.push({
      slug: event.slug,
      name: event.name,
      location: event.location,
      cover: event.cover,
      latest: Boolean(event.is_latest)
    });
  }

  return merged;
}

const CMS_CACHE = new Map<Lang, CmsPayload>();

async function loadCms(locale: Lang): Promise<CmsPayload> {
  const cached = CMS_CACHE.get(locale);

  if (cached) {
    return cached;
  }

  const payload = await api<{ sections?: Record<string, unknown>; events?: CmsEvent[] }>(
    `/content?locale=${locale}`
  );

  const result: CmsPayload = {
    sections: payload.sections || {},
    events: Array.isArray(payload.events) ? payload.events : []
  };

  CMS_CACHE.set(locale, result);
  return result;
}

const fallbackT = (key: StringKey, vars?: Vars) => interpolate(id[key] ?? key, vars);

/** Defaults keep isolated renders (tests, embeds) working outside the provider. */
const I18nContext = createContext<I18nValue>({
  lang: 'id',
  setLang: () => undefined,
  toggle: () => undefined,
  t: fallbackT,
  content: CONTENT.id,
  events: SITE_EVENTS
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => preferredLang());
  const [cms, setCms] = useState<CmsPayload | null>(() => CMS_CACHE.get(preferredLang()) || null);

  useEffect(() => {
    document.documentElement.lang = lang;

    try {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Storage may be blocked; the session still works.
    }
  }, [lang]);

  useEffect(() => {
    let active = true;

    loadCms(lang)
      .then((payload) => {
        if (active) {
          setCms(payload);
        }
      })
      .catch(() => {
        // Keep the bundled defaults when the CMS is unreachable.
      });

    return () => {
      active = false;
    };
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    if (LANGS.includes(next)) {
      setLangState(next);
    }
  }, []);

  const toggle = useCallback(() => {
    setLangState((current) => (current === 'id' ? 'en' : 'id'));
  }, []);

  const value = useMemo<I18nValue>(() => {
    const sections = cms?.sections || {};
    const ui = (sections.ui || {}) as Record<string, string>;
    const dict: Dictionary = { ...DICTS[lang], ...ui };
    const content = mergeContent(CONTENT[lang], sections);
    const events = mergeEvents(SITE_EVENTS, cms?.events || []);

    return {
      lang,
      setLang,
      toggle,
      t: (key, vars) => interpolate(dict[key] ?? DICTS.id[key] ?? key, vars),
      content,
      events
    };
  }, [lang, cms, setLang, toggle]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}

/** Clear the CMS cache after admin edits so the next page load refetches. */
export function clearCmsCache(): void {
  CMS_CACHE.clear();
}

export type { SeoMeta };
