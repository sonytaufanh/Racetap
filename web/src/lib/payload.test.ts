// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { publicUrl } from '../payload';

describe('publicUrl', () => {
  it('returns an empty string for empty input', () => {
    expect(publicUrl('')).toBe('');
    expect(publicUrl(null)).toBe('');
    expect(publicUrl(undefined)).toBe('');
  });

  it('keeps absolute URLs untouched', () => {
    expect(publicUrl('https://cdn.example.com/a.webp')).toBe('https://cdn.example.com/a.webp');
    expect(publicUrl('//cdn.example.com/a.webp')).toBe('//cdn.example.com/a.webp');
    expect(publicUrl('data:image/png;base64,AAAA')).toBe('data:image/png;base64,AAAA');
  });

  it('maps legacy assets/images paths into the public folder', () => {
    expect(publicUrl('assets/images/portfolio/ahy-run-2026.webp')).toBe('/portfolio/ahy-run-2026.webp');
    expect(publicUrl('/assets/images/photos/ahy-run-2026/bib-2005.jpg')).toBe(
      '/photos/ahy-run-2026/bib-2005.jpg'
    );
    expect(publicUrl('assets/images/racetap.png')).toBe('/racetap.png');
    expect(publicUrl('assets/images/logo-racetap.png')).toBe('/logo-racetap.png');
  });

  it('keeps already public paths absolute', () => {
    expect(publicUrl('portfolio/ahy-run-2026.webp')).toBe('/portfolio/ahy-run-2026.webp');
    expect(publicUrl('/logo-racetap.png')).toBe('/logo-racetap.png');
    expect(publicUrl('./photos/ahy-run-2026/bib-2005.jpg')).toBe('/photos/ahy-run-2026/bib-2005.jpg');
  });

  it('encodes spaces and unicode so filenames stay reachable', () => {
    expect(publicUrl('assets/images/portfolio/ahy run 2026.webp')).toBe(
      '/portfolio/ahy%20run%202026.webp'
    );
    expect(publicUrl('assets/images/foto pelari – 10k.jpg')).toBe(
      '/foto%20pelari%20%E2%80%93%2010k.jpg'
    );
  });
});
