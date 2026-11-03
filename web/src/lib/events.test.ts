import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LATEST_EVENTS, PUBLISHED_EVENT_SLUGS, SITE_EVENTS } from './events';
import manifest from '../results/events.json';

const repoRoot = path.resolve(__dirname, '../../..');

describe('results manifest', () => {
  it('exposes site metadata for every event', () => {
    expect(SITE_EVENTS).toHaveLength(manifest.events.length);
    expect(SITE_EVENTS.length).toBeGreaterThan(0);

    for (const event of SITE_EVENTS) {
      expect(event.slug).toMatch(/^[\w.-]+$/);
      expect(event.name.length).toBeGreaterThan(0);
      expect(event.location.length).toBeGreaterThan(0);
      expect(event.cover).toMatch(/^assets\/images\/portfolio\//);
    }
  });

  it('has unique slugs and a published slug set', () => {
    const slugs = SITE_EVENTS.map((event) => event.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(PUBLISHED_EVENT_SLUGS.size).toBe(slugs.length);
  });

  it('flags the three home page events as latest', () => {
    expect(LATEST_EVENTS.map((event) => event.slug)).toEqual([
      'uksw-salatiga-10k',
      'jember-10k',
      'tni-run-2026-jakarta'
    ]);
  });

  it('points every cover and banner at a real file', () => {
    for (const event of manifest.events as Array<{ slug: string; cover: string; banner?: string | null }>) {
      expect(fs.existsSync(path.join(repoRoot, event.cover))).toBe(true);

      if (event.banner) {
        expect(fs.existsSync(path.join(repoRoot, 'results', event.slug, event.banner))).toBe(true);
      }
    }
  });

  it('has a results directory for every event', () => {
    for (const event of SITE_EVENTS) {
      expect(fs.existsSync(path.join(repoRoot, 'results', event.slug, 'index.html'))).toBe(true);
    }
  });
});

describe('event summaries', () => {
  it('ships a summary.json for every published event', () => {
    for (const event of SITE_EVENTS) {
      const file = path.join(repoRoot, 'results', event.slug, 'summary.json');

      expect(fs.existsSync(file)).toBe(true);

      const summary = JSON.parse(fs.readFileSync(file, 'utf8')) as {
        slug: string;
        participants: number;
        finishers: number;
        categories: string[];
        podiums: Array<{ item: string; athletes: unknown[] }>;
      };

      expect(summary.slug).toBe(event.slug);
      expect(summary.finishers).toBeLessThanOrEqual(summary.participants);
      expect(Array.isArray(summary.categories)).toBe(true);
      expect(Array.isArray(summary.podiums)).toBe(true);
      expect(summary.podiums.every((entry) => entry.athletes.length <= 3)).toBe(true);
    }
  });
});
