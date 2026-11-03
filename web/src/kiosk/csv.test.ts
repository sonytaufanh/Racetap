import { describe, expect, it } from 'vitest';
import { detectDelimiter, parseCsv } from './csv';

describe('detectDelimiter', () => {
  it('picks the separator with the most occurrences', () => {
    expect(detectDelimiter('Item;Bib;Name')).toBe(';');
    expect(detectDelimiter('Item,Bib,Name')).toBe(',');
  });

  it('defaults to semicolon when both appear equally', () => {
    expect(detectDelimiter('Item;Bib,Name')).toBe(';');
  });
});

describe('parseCsv', () => {
  it('parses comma separated rows', () => {
    const rows = parseCsv('Item,Bib,Name\n5K,80026,Doimirza\n');

    expect(rows).toEqual([{ Item: '5K', Bib: '80026', Name: 'Doimirza' }]);
  });

  it('parses semicolon separated rows', () => {
    const rows = parseCsv('Item;Bib;Name\n10K;1002;NOVA\n');

    expect(rows).toEqual([{ Item: '10K', Bib: '1002', Name: 'NOVA' }]);
  });

  it('trims headers and values and skips blank lines', () => {
    const rows = parseCsv(' Item ; Bib \n\n 5K ; 42 \n\n');

    expect(rows).toEqual([{ Item: '5K', Bib: '42' }]);
  });

  it('fills missing trailing columns with an empty string', () => {
    const rows = parseCsv('A,B,C\n1,2\n');

    expect(rows[0]).toEqual({ A: '1', B: '2', C: '' });
  });

  it('returns nothing for empty input', () => {
    expect(parseCsv('')).toEqual([]);
    expect(parseCsv('   \n  ')).toEqual([]);
  });

  it('handles windows and old mac line endings', () => {
    expect(parseCsv('A,B\r\n1,2\r\n')).toHaveLength(1);
    expect(parseCsv('A,B\r1,2\r')).toHaveLength(1);
  });
});
