import { describe, expect, it } from 'vitest';
import { normalizeConfig } from './config';
import { buildRecord, databaseFromApi, databaseFromCsv } from './sources';

const config = normalizeConfig({
  fields: {
    name: { source: 'Name' },
    bib: { source: 'Bib' },
    item: { source: 'Item' },
    gender: { source: 'Gender' },
    gunTime: { source: 'Gun Time' },
    congratulation: { source: '', staticText: 'KUDOS!' }
  },
  genderMapping: { enabled: true, map: { M: 'MALE', F: 'FEMALE' } }
});

describe('buildRecord', () => {
  it('maps CSV sources and applies the gender mapping', () => {
    const record = buildRecord({ Name: 'NOVA', Bib: '1002', Item: '10K', Gender: 'M' }, config);

    expect(record.name).toBe('NOVA');
    expect(record.bib).toBe('1002');
    expect(record.gender).toBe('MALE');
  });

  it('fills static text fields', () => {
    const record = buildRecord({}, config);

    expect(record.congratulation).toBe('KUDOS!');
  });

  it('returns empty strings for missing columns', () => {
    const record = buildRecord({ Name: 'NOVA' }, config);

    expect(record.bib).toBe('');
    expect(record.gunTime).toBe('');
  });
});

describe('databaseFromCsv', () => {
  it('indexes rows by both bib and chip', () => {
    const csv = [
      'Item;Bib;chip;Name;Gender;Gun Time',
      '10K;1002;1;NOVA HARYS;M;44:44:33',
      '5K;2001;ABC123;IKA ARISTA;F;00:47:38'
    ].join('\n');

    const database = databaseFromCsv(csv, config);

    expect(database['1002'].name).toBe('NOVA HARYS');
    expect(database['1'].name).toBe('NOVA HARYS');
    expect(database['2001'].name).toBe('IKA ARISTA');
    expect(database['ABC123'].name).toBe('IKA ARISTA');
  });

  it('keeps the raw bib and chip on the record', () => {
    const database = databaseFromCsv('Bib;chip;Name;Gender\n42;ab-12;TEST;F\n', config);
    const record = database['42'];

    expect(record._bib).toBe('42');
    expect(record._chip).toBe('ab-12');
    expect(database['AB12']).toBe(record);
  });

  it('skips rows without any usable key', () => {
    const database = databaseFromCsv('Bib;chip;Name\n;;nobody\n', config);

    expect(Object.keys(database)).toHaveLength(0);
  });
});

describe('databaseFromApi', () => {
  it('reads the scores array and maps api fields', () => {
    const payload = {
      scores: [
        { epc: 'E28011700000021C7F8A39F5', bib: 'MH2001', name: 'IKA', sex: 'F', item_name: '10K', total_score: '00:47:38' }
      ]
    };

    const database = databaseFromApi(payload, config);

    expect(database['2001'].name).toBe('IKA');
    expect(database['2001'].gender).toBe('FEMALE');
    expect(database['2001'].item).toBe('10K');
    expect(database['2001'].gunTime).toBe('00:47:38');
    expect(database['E28011700000021C7F8A39F5']).toBe(database['2001']);
  });

  it('also reads the data wrapper used by some exports', () => {
    const payload = { data: [{ bib: '7', name: 'WRAPPED', sex: 'M' }] };
    const database = databaseFromApi(payload, config);

    expect(database['7'].name).toBe('WRAPPED');
  });

  it('returns an empty database for unexpected payloads', () => {
    expect(databaseFromApi(null, config)).toEqual({});
    expect(databaseFromApi({}, config)).toEqual({});
    expect(databaseFromApi({ scores: 'nope' }, config)).toEqual({});
  });
});
