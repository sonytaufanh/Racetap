import { describe, expect, it } from 'vitest';
import { extractWords, photoMatches, pickBibFromText, pickBibFromWords } from './bib';
import { digitsOnly, formatDate, formatNumber } from './format';

describe('photoMatches', () => {
  const photo = { bib: '1024', ocr_text: '1024' };

  it('matches an empty query', () => {
    expect(photoMatches(photo, '')).toBe(true);
  });

  it('matches a partial bib', () => {
    expect(photoMatches(photo, '10')).toBe(true);
    expect(photoMatches(photo, '24')).toBe(true);
  });

  it('rejects a different bib', () => {
    expect(photoMatches(photo, '9999')).toBe(false);
  });

  it('ignores non digit characters', () => {
    expect(photoMatches(photo, 'BIB 1024')).toBe(true);
  });
});

describe('pickBibFromWords', () => {
  it('prefers the largest bounding box', () => {
    const result = pickBibFromWords([
      { text: '2026', area: 100 },
      { text: '1024', area: 900 },
      { text: '5K', area: 500 }
    ]);

    expect(result.bib).toBe('1024');
    expect(result.tokens).toContain('2026');
  });

  it('ignores tokens shorter than three digits', () => {
    expect(pickBibFromWords([{ text: '10', area: 10 }]).bib).toBe('');
  });
});

describe('pickBibFromText', () => {
  it('returns the first numeric token', () => {
    expect(pickBibFromText('BIB 3021 SUBANG').bib).toBe('3021');
  });
});

describe('extractWords', () => {
  it('walks nested blocks and computes bbox area', () => {
    const words = extractWords({
      blocks: [
        {
          paragraphs: [
            {
              lines: [
                {
                  words: [{ text: '1001', bbox: { x0: 0, y0: 0, x1: 20, y1: 10 } }]
                }
              ]
            }
          ]
        }
      ]
    });

    expect(words).toHaveLength(1);
    expect(words[0].text).toBe('1001');
    expect(words[0].area).toBe(200);
  });
});

describe('format helpers', () => {
  it('keeps only digits', () => {
    expect(digitsOnly('BIB-10 24')).toBe('1024');
  });

  it('formats ISO dates', () => {
    expect(formatDate('2026-03-15')).toBe('15 Mar 2026');
  });

  it('formats numbers with Indonesian separators', () => {
    expect(formatNumber(2400)).toBe('2.400');
  });
});
