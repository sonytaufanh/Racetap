import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  EMPTY_FILTERS,
  distanceLabel,
  filterParticipants,
  pageWindow,
  parseScoresData,
  sortParticipants,
  statusFor,
  timeToSeconds
} from './model';
import type { ScoresData } from './types';

const dataPath = fileURLToPath(new URL('../../../results/jember-10k/data.json', import.meta.url));

function loadJember(): ScoresData {
  return JSON.parse(readFileSync(dataPath, 'utf8')) as ScoresData;
}

describe('statusFor', () => {
  it('maps every finisher code used by the timing provider', () => {
    expect(statusFor(1, '').label).toBe('Finisher');
    expect(statusFor(-2, '').label).toBe('DQ');
    expect(statusFor(-3, '').label).toBe('DNF');
    expect(statusFor(-4, '').label).toBe('DNS');
    expect(statusFor(-5, '').label).toBe('Cut off');
    expect(statusFor(-1, '').label).toBe('Started');
    expect(statusFor(0, '')).toEqual({ label: '', tone: 'dns' });
  });

  it('treats a start time as started even without a finisher flag', () => {
    expect(statusFor(0, '00:01:34').label).toBe('Started');
  });
});

describe('timeToSeconds', () => {
  it('parses HH:MM:SS and MM:SS', () => {
    expect(timeToSeconds('00:47:38')).toBe(2858);
    expect(timeToSeconds('47:38')).toBe(2858);
  });

  it('sorts empty and malformed values last', () => {
    expect(timeToSeconds('')).toBe(Number.POSITIVE_INFINITY);
    expect(timeToSeconds('abc')).toBe(Number.POSITIVE_INFINITY);
  });
});

describe('parseScoresData on the jember-10k export', () => {
  const parsed = parseScoresData(loadJember());

  it('reads every score row', () => {
    expect(parsed.participants).toHaveLength(497);
  });

  it('formats the race date in en-US long form', () => {
    expect(parsed.raceDate).toMatch(/^[A-Z][a-z]+, [A-Z][a-z]+ \d{1,2}, \d{4}$/);
  });

  it('derives distance from the race items, including PACER entries', () => {
    expect(parsed.items).toEqual(expect.arrayContaining(['10K', '5K', 'PACER']));
  });

  it('defaults the age group to OPEN when the export is empty', () => {
    expect(parsed.participants.every((p) => p.ageGroup !== '')).toBe(true);
  });

  it('sorts by item net rank with unranked rows last', () => {
    const ranks = parsed.participants.map((p) => p.itemNetRank);
    const firstNull = ranks.indexOf(null);

    if (firstNull !== -1) {
      expect(ranks.slice(firstNull).every((value) => value === null)).toBe(true);
    }

    const ranked = ranks.filter((value): value is number => value !== null);
    const sorted = [...ranked].sort((a, b) => a - b);
    expect(ranked).toEqual(sorted);
  });

  it('counts finishers with a real net time', () => {
    const manual = parsed.participants.filter(
      (p) => p.netScore !== '' && p.netScore !== '00:00:00'
    ).length;
    expect(parsed.finishers).toBe(manual);
    expect(parsed.finishers).toBeGreaterThan(0);
  });
});

describe('filterParticipants', () => {
  const parsed = parseScoresData(loadJember());

  it('returns everything when no filter is set', () => {
    expect(filterParticipants(parsed.participants, EMPTY_FILTERS)).toHaveLength(
      parsed.participants.length
    );
  });

  it('matches the search term against name or bib', () => {
    const sample = parsed.participants[0];
    const byName = filterParticipants(parsed.participants, {
      ...EMPTY_FILTERS,
      search: sample.name.slice(0, 6)
    });
    const byBib = filterParticipants(parsed.participants, {
      ...EMPTY_FILTERS,
      search: sample.bib
    });

    expect(byName.some((p) => p.id === sample.id)).toBe(true);
    expect(byBib.some((p) => p.id === sample.id)).toBe(true);
  });

  it('filters by item and gender', () => {
    const tenK = filterParticipants(parsed.participants, { ...EMPTY_FILTERS, item: '10K' });
    const female = filterParticipants(parsed.participants, { ...EMPTY_FILTERS, gender: 'F' });

    expect(tenK.length).toBeGreaterThan(0);
    expect(tenK.every((p) => p.itemName === '10K')).toBe(true);
    expect(female.every((p) => p.sex === 'F')).toBe(true);
  });
});

describe('sortParticipants', () => {
  const parsed = parseScoresData(loadJember());

  it('sorts net time ascending without breaking the source array', () => {
    const original = [...parsed.participants];
    const sorted = sortParticipants(parsed.participants, { key: 'netTime', dir: 'asc' });
    const times = sorted.map((p) => timeToSeconds(p.netScore));

    expect(parsed.participants).toEqual(original);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it('reverses on desc', () => {
    const asc = sortParticipants(parsed.participants, { key: 'bib', dir: 'asc' });
    const desc = sortParticipants(parsed.participants, { key: 'bib', dir: 'desc' });

    expect(desc[0].id).toBe(asc[asc.length - 1].id);
  });

  it('keeps the default order when no sort is set', () => {
    expect(sortParticipants(parsed.participants, null)).toBe(parsed.participants);
  });
});

describe('distanceLabel', () => {
  it('uses the override when the event defines one', () => {
    expect(distanceLabel(['10K', '5K'], { slug: 'x', distanceOverride: '5K' })).toBe('5K');
  });

  it('falls back to the derived item list', () => {
    expect(distanceLabel(['10K', '5K'], { slug: 'x' })).toBe('10K & 5K');
  });

  it('never renders an empty label', () => {
    expect(distanceLabel([], { slug: 'x' })).toBe('-');
  });
});

describe('pageWindow', () => {
  it('shows at most five pages around the current one', () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(pageWindow(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });

  it('shrinks when there are fewer pages than the window', () => {
    expect(pageWindow(1, 2)).toEqual([1, 2]);
    expect(pageWindow(1, 1)).toEqual([1]);
  });
});
