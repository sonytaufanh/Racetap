import { describe, expect, it } from 'vitest';
import {
  extractWords,
  matchGluedDigits,
  matchOcrDigits,
  normalizeOcrDigits,
  normalizeOcrRule,
  ocrDigitRange,
  photoMatches,
  pickBibFromText,
  pickBibFromWords
} from './bib';
import { digitsOnly, formatDate, formatNumber, normalizeBib } from './format';

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

describe('OCR rule: digit-only reads', () => {
  it('normalises a rule and clamps the digit count', () => {
    expect(normalizeOcrRule({ digitsOnly: true, digits: 4 })).toEqual({ digitsOnly: true, digits: 4 });
    expect(normalizeOcrRule({ digitsOnly: false, digits: 99 })).toEqual({ digitsOnly: false, digits: 12 });
    expect(normalizeOcrRule({ digitsOnly: true, digits: -5 })).toEqual({ digitsOnly: true, digits: 0 });
    expect(normalizeOcrRule(undefined)).toEqual({ digitsOnly: true, digits: 0 });
  });

  it('turns an exact digit count into a fixed range', () => {
    expect(ocrDigitRange({ digitsOnly: true, digits: 4 })).toEqual({ min: 4, max: 4 });
    expect(ocrDigitRange({ digitsOnly: true, digits: 0 })).toEqual({ min: 3, max: 6 });
  });

  it('maps letter look-alikes to digits', () => {
    expect(normalizeOcrDigits('OISBZG')).toBe('015826');
    expect(normalizeOcrDigits('l0i1')).toBe('1011');
  });

  it('accepts only digit runs of the exact length', () => {
    const rule = { digitsOnly: true, digits: 4 };

    expect(matchOcrDigits('BIB 3021 SUBANG 2026', rule)).toEqual(['3021', '2026']);
    expect(matchOcrDigits('peserta nomor 123', rule)).toEqual([]);
    expect(matchOcrDigits('nomor 123456', rule)).toEqual([]);
  });

  it('does not slice a longer run to fit an exact digit count', () => {
    // "20260" is 5 digits; a 4-digit rule must not read it as "2026".
    expect(matchOcrDigits('20260', { digitsOnly: true, digits: 4 })).toEqual([]);
  });

  it('reads a letter-mistyped bib as digits', () => {
    // "3O21" is a common OCR misread of bib 3021.
    expect(matchOcrDigits('3O21', { digitsOnly: true, digits: 4 })).toEqual(['3021']);
    expect(matchOcrDigits('SO21', { digitsOnly: true, digits: 4 })).toEqual(['5021']);
  });

  it('leaves words alone when real digits are present', () => {
    // "SUBANG" must not become "508AN6" and pollute the candidates.
    expect(matchOcrDigits('BIB 3021 SUBANG', { digitsOnly: true, digits: 4 })).toEqual(['3021']);
  });

  it('picks exactly four digits from OCR words', () => {
    const words = [
      { text: '2026', area: 90 },
      { text: '3021', area: 800 },
      { text: 'MEDAL', area: 400 }
    ];

    expect(pickBibFromWords(words, { digitsOnly: true, digits: 4 }).bib).toBe('3021');
    expect(pickBibFromText('BIB 51 3021', { digitsOnly: true, digits: 4 }).bib).toBe('3021');
  });

  it('keeps the legacy 3-6 range when no exact count is set', () => {
    expect(matchOcrDigits('12345', { digitsOnly: true, digits: 0 })).toEqual(['12345']);
    expect(pickBibFromWords([{ text: '10', area: 10 }], { digitsOnly: true, digits: 4 }).bib).toBe('');
  });

  it('still finds shorter bibs after a longer run is rejected', () => {
    // "20260" is 5 digits (rejected), "3021" is a valid 4-digit bib.
    expect(matchOcrDigits('20260 3021', { digitsOnly: true, digits: 4 })).toEqual(['3021']);
  });

  it('recovers a whitelisted bib from a glued OCR read', () => {
    // RapidOCR really reads "14127" for bib 1412 on the Dahana banner.
    const known = new Set(['1412']);

    expect(matchGluedDigits('14127', { digitsOnly: true, digits: 4 }, known)).toEqual(['1412']);
    expect(pickBibFromText('14127', { digitsOnly: true, digits: 4 }, ['1412']).bib).toBe('1412');
    expect(pickBibFromWords([{ text: '14127', area: 100 }], { digitsOnly: true, digits: 4 }, ['1412']).bib).toBe('1412');
  });

  it('never invents a bib outside the whitelist', () => {
    const known = new Set(['1412']);

    expect(matchGluedDigits('99999', { digitsOnly: true, digits: 4 }, known)).toEqual([]);
    expect(pickBibFromText('14127', { digitsOnly: true, digits: 4 }).bib).toBe('');
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

describe('alphanumeric BIB search', () => {
  const photo = { bib: 'MH2001', ocr_text: 'MH2001' };

  it('normalises user input and keeps letters', () => {
    expect(normalizeBib(' mh 2001 ')).toBe('MH2001');
    expect(normalizeBib('bib: mh-2001')).toBe('BIBMH2001');
    expect(normalizeBib('123456789012345')).toBe('123456789012');
  });

  it('matches prefixed bibs with or without a label', () => {
    expect(photoMatches(photo, 'MH2001')).toBe(true);
    expect(photoMatches(photo, 'mh20')).toBe(true);
    expect(photoMatches(photo, 'BIB MH2001')).toBe(true);
    expect(photoMatches(photo, 'nomor mh2001')).toBe(true);
    expect(photoMatches(photo, '2001')).toBe(true);
  });

  it('does not match unrelated bibs', () => {
    expect(photoMatches(photo, 'MH9999')).toBe(false);
    expect(photoMatches(photo, 'XYZ')).toBe(false);
  });
});
