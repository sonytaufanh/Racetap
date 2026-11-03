// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { asset } from '../payload';

describe('asset', () => {
  it('returns an empty string for empty input', () => {
    expect(asset('')).toBe('');
    expect(asset(null)).toBe('');
    expect(asset(undefined)).toBe('');
  });

  it('keeps absolute URLs untouched', () => {
    expect(asset('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp');
  });

  it('prefixes the base URL and trims leading slashes', () => {
    expect(asset('assets/images/a.webp')).toBe('/assets/images/a.webp');
    expect(asset('/assets/images/a.webp')).toBe('/assets/images/a.webp');
  });

  it('encodes spaces and unicode so filenames stay reachable', () => {
    expect(asset('assets/images/portfolio/ahy run 2026.webp')).toBe(
      '/assets/images/portfolio/ahy%20run%202026.webp'
    );
    expect(asset('assets/images/foto pelari – 10k.jpg')).toBe(
      '/assets/images/foto%20pelari%20%E2%80%93%2010k.jpg'
    );
  });
});
