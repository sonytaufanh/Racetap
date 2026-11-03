import { describe, expect, it } from 'vitest';
import { CERTIFICATE_TOKENS, fieldText, resolveToken } from './tokens';
import { styleDefaults } from './defaults';
import type { CertificateField, CertificateMeta, CertificateToken } from './types';
import type { Participant } from '../results/types';

const meta: CertificateMeta = {
  eventName: 'Dahana Run 2026',
  eventDate: '17 Mei 2026',
  eventTitle: 'DAHANA RUN 2026 5K & 10K'
};

const participant: Participant = {
  id: 987,
  name: 'Budi Santoso',
  bib: '1042',
  sex: 'M',
  genderLabel: 'Male',
  itemName: '10K',
  ageGroup: 'OPEN',
  ageGroup2: 'M-OPEN',
  finisher: 1,
  status: { label: 'Finisher', tone: 'finisher' },
  netScore: '01:02:03',
  totalScore: '01:03:00',
  startTime: '05:00:00',
  finishTime: '06:02:03',
  pace: '06:12',
  city: 'Semarang',
  team: 'Racetap Runner',
  diff: '00:00:10',
  cp1: '00:20:00',
  cp2: '00:41:00',
  cp1Cp2: '00:21:00',
  netRanking: 12,
  itemNetRank: 34,
  ageNetRank: 5,
  age2NetRank: 7
};

function tokenField(token: CertificateToken, overrides: Partial<CertificateField> = {}): CertificateField {
  return {
    id: 't1',
    type: 'token',
    token,
    text: null,
    prefix: '',
    suffix: '',
    x: 0,
    y: 0,
    align: 'center',
    style: styleDefaults(40),
    ...overrides
  };
}

describe('resolveToken', () => {
  it('maps every declared token to a participant or event value', () => {
    const expected: Record<CertificateToken, string> = {
      name: 'Budi Santoso',
      bib: '1042',
      gender: 'Male',
      genderShort: 'M',
      distance: '10K',
      ageGroup: 'OPEN',
      ageGroup2: 'M-OPEN',
      netTime: '01:02:03',
      gunTime: '01:03:00',
      finishTime: '06:02:03',
      startTime: '05:00:00',
      pace: '06:12',
      overallRank: '34',
      genderRank: '12',
      ageRank: '5',
      age2Rank: '7',
      status: 'Finisher',
      city: 'Semarang',
      team: 'Racetap Runner',
      eventName: 'Dahana Run 2026',
      eventDate: '17 Mei 2026',
      eventTitle: 'DAHANA RUN 2026 5K & 10K'
    };

    for (const [token, value] of Object.entries(expected)) {
      expect(resolveToken(token as CertificateToken, participant, meta), token).toBe(value);
    }
  });

  it('returns an empty string for missing data instead of a placeholder', () => {
    const empty: Participant = {
      ...participant,
      bib: '',
      team: '',
      city: '',
      finishTime: '',
      netRanking: null,
      ageNetRank: null,
      age2NetRank: null,
      itemNetRank: null,
      sex: ''
    };

    expect(resolveToken('bib', empty, meta)).toBe('');
    expect(resolveToken('team', empty, meta)).toBe('');
    expect(resolveToken('overallRank', empty, meta)).toBe('');
    expect(resolveToken('genderShort', empty, meta)).toBe('');
  });

  it('declares a definition for every token', () => {
    for (const definition of CERTIFICATE_TOKENS) {
      expect(resolveToken(definition.id, participant, meta), definition.id).toBeTypeOf('string');
    }

    expect(CERTIFICATE_TOKENS).toHaveLength(22);
  });
});

describe('fieldText', () => {
  it('applies prefix, suffix and uppercase', () => {
    const field = tokenField('bib', {
      prefix: 'BIB ',
      suffix: ' / 2026',
      style: styleDefaults(40, { uppercase: true })
    });

    expect(fieldText(field, participant, meta)).toBe('BIB 1042 / 2026');
  });

  it('drops prefix and suffix when the value is empty', () => {
    const field = tokenField('overallRank', { prefix: '#' });

    expect(fieldText(field, participant, meta)).toBe('#34');
    expect(fieldText(field, { ...participant, itemNetRank: null }, meta)).toBe('');
  });

  it('keeps static text as-is and supports newlines', () => {
    const field: CertificateField = {
      id: 'x',
      type: 'text',
      token: null,
      text: 'Certificate of\nCompletion',
      prefix: '',
      suffix: '',
      x: 0,
      y: 0,
      align: 'center',
      style: styleDefaults(40, { uppercase: true })
    };

    expect(fieldText(field, participant, meta)).toBe('CERTIFICATE OF\nCOMPLETION');
  });

  it('returns empty for blank static text so nothing is drawn', () => {
    const field: CertificateField = {
      id: 'x',
      type: 'text',
      token: null,
      text: '   ',
      prefix: '',
      suffix: '',
      x: 0,
      y: 0,
      align: 'center',
      style: styleDefaults(40)
    };

    expect(fieldText(field, participant, meta)).toBe('');
  });
});
