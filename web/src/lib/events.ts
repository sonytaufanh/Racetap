import manifest from '../results/events.json';

/** Site-facing metadata of a published results event (subset of the manifest). */
export interface SiteEvent {
  slug: string;
  name: string;
  location: string;
  cover: string;
  latest?: boolean;
}

/** Single source of truth: web/src/results/events.json. */
export const SITE_EVENTS = manifest.events as SiteEvent[];

export const LATEST_EVENTS = SITE_EVENTS.filter((event) => event.latest);

export const PUBLISHED_EVENT_SLUGS = new Set(SITE_EVENTS.map((event) => event.slug));
