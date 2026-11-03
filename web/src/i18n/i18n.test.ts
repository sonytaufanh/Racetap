import { describe, expect, it } from 'vitest';
import { CONTENT } from './content';
import { en, id } from './strings';

describe('i18n dictionaries', () => {
  it('share the same keys', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
  });

  it('never ship empty strings', () => {
    for (const [key, value] of Object.entries(id)) {
      expect(value.length, `id:${key}`).toBeGreaterThan(0);
    }

    for (const [key, value] of Object.entries(en)) {
      expect(value.length, `en:${key}`).toBeGreaterThan(0);
    }
  });

  it('use the same placeholders per key', () => {
    for (const key of Object.keys(id) as Array<keyof typeof id>) {
      const placeholders = (value: string) => (value.match(/\{(\w+)\}/g) || []).sort();
      expect(placeholders(en[key]), `placeholders for ${String(key)}`).toEqual(placeholders(id[key]));
    }
  });
});

describe('i18n content', () => {
  it('keeps every collection in sync between languages', () => {
    for (const key of ['stats', 'services', 'partners', 'testimonials', 'faq', 'faqTeaser', 'aboutValues', 'eventProcess'] as const) {
      expect(CONTENT.en[key].length, key).toBe(CONTENT.id[key].length);
    }

    expect(CONTENT.en.serviceHighlights.length).toBe(CONTENT.id.serviceHighlights.length);
    expect(CONTENT.en.clients.partners.length).toBe(CONTENT.id.clients.partners.length);
    expect(CONTENT.en.legal.privacy.sections.length).toBe(CONTENT.id.legal.privacy.sections.length);
    expect(CONTENT.en.legal.terms.sections.length).toBe(CONTENT.id.legal.terms.sections.length);
  });

  it('has English copy that differs from Indonesian for prose', () => {
    expect(CONTENT.en.services[0].body).not.toBe(CONTENT.id.services[0].body);
    expect(CONTENT.en.faq[0].a).not.toBe(CONTENT.id.faq[0].a);
    expect(CONTENT.en.legal.privacy.sections[0].body).not.toBe(CONTENT.id.legal.privacy.sections[0].body);
  });
});
