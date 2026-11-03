import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, cleanKey, deepMerge, mapGenderValue, normalizeConfig } from './config';

describe('deepMerge', () => {
  it('overrides scalar values without touching the target', () => {
    const base = { a: 1, b: { c: 2, d: 3 } };
    const merged = deepMerge(base, { a: 9, b: { c: 8 } });

    expect(merged).toEqual({ a: 9, b: { c: 8, d: 3 } });
    expect(base).toEqual({ a: 1, b: { c: 2, d: 3 } });
  });

  it('keeps arrays and nulls as plain values', () => {
    const merged = deepMerge(
      { list: [1, 2], value: 'x' as string | null },
      { list: [3], value: null }
    );

    expect(merged.list).toEqual([3]);
    expect(merged.value).toBeNull();
  });

  it('ignores non-object sources', () => {
    expect(deepMerge({ a: 1 }, null)).toEqual({ a: 1 });
    expect(deepMerge({ a: 1 }, 'nope')).toEqual({ a: 1 });
  });
});

describe('normalizeConfig', () => {
  it('starts from the defaults', () => {
    expect(normalizeConfig({}).eventName).toBe(DEFAULT_CONFIG.eventName);
  });

  it('merges nested field overrides and keeps the rest', () => {
    const config = normalizeConfig({
      fields: { bib: { top: '10px', enabled: false } }
    });

    expect(config.fields.bib.top).toBe('10px');
    expect(config.fields.bib.enabled).toBe(false);
    expect(config.fields.bib.fontSize).toBe(DEFAULT_CONFIG.fields.bib.fontSize);
    expect(config.fields.name.enabled).toBe(true);
  });

  it('adds new fields that the defaults do not know about', () => {
    const config = normalizeConfig({ fields: { gunTime: { source: 'Gun Time' } } });

    expect(config.fields.gunTime.source).toBe('Gun Time');
  });
});

describe('cleanKey', () => {
  it('uppercases and keeps only hex characters by default', () => {
    expect(cleanKey('mh-2001')).toBe('2001');
    expect(cleanKey('E28011700000021C7F8A39F5')).toBe('E28011700000021C7F8A39F5');
    expect(cleanKey(' abc 123 ')).toBe('ABC123');
  });

  it('joins separated groups', () => {
    expect(cleanKey('AB-CD-EF')).toBe('ABCDEF');
  });

  it('returns an empty string when nothing matches', () => {
    expect(cleanKey('ZZZ')).toBe('');
    expect(cleanKey('')).toBe('');
  });

  it('only trims when uppercaseOnly is disabled', () => {
    expect(cleanKey('  mh-2001  ', false)).toBe('mh-2001');
  });
});

describe('mapGenderValue', () => {
  const config = normalizeConfig({});

  it('maps known codes case-insensitively', () => {
    expect(mapGenderValue('M', config)).toBe('Male');
    expect(mapGenderValue('f', config)).toBe('Female');
  });

  it('passes unknown values through unchanged', () => {
    expect(mapGenderValue('X', config)).toBe('X');
    expect(mapGenderValue('', config)).toBe('');
  });

  it('is a no-op when the mapping is disabled', () => {
    expect(mapGenderValue('M', { ...config, genderMapping: { enabled: false } })).toBe('M');
  });
});
