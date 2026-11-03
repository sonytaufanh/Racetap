import type { Participant } from '../results/types';
import type { CertificateField, CertificateMeta, CertificateToken } from './types';

export interface CertificateTokenDef {
  id: CertificateToken;
  label: string;
  hint?: string;
}

/** Order matters: this is what the editor's "add field" picker shows. */
export const CERTIFICATE_TOKENS: CertificateTokenDef[] = [
  { id: 'name', label: 'Nama peserta', hint: 'Contoh: Budi Santoso' },
  { id: 'bib', label: 'Nomor BIB' },
  { id: 'gender', label: 'Gender (Male/Female)' },
  { id: 'genderShort', label: 'Gender (M/F)' },
  { id: 'distance', label: 'Kategori / jarak' },
  { id: 'ageGroup', label: 'Kelompok usia' },
  { id: 'ageGroup2', label: 'Kelompok usia 2' },
  { id: 'netTime', label: 'Net time', hint: 'Waktu bersih' },
  { id: 'gunTime', label: 'Gun time' },
  { id: 'finishTime', label: 'Waktu finish' },
  { id: 'startTime', label: 'Waktu start' },
  { id: 'pace', label: 'Pace' },
  { id: 'overallRank', label: 'Peringkat umum' },
  { id: 'genderRank', label: 'Peringkat gender' },
  { id: 'ageRank', label: 'Peringkat usia' },
  { id: 'age2Rank', label: 'Peringkat usia 2' },
  { id: 'status', label: 'Status (Finisher/DNF/DNS)' },
  { id: 'city', label: 'Kota' },
  { id: 'team', label: 'Tim / komunitas' },
  { id: 'eventName', label: 'Nama event' },
  { id: 'eventDate', label: 'Tanggal event' },
  { id: 'eventTitle', label: 'Judul event (data hasil)' }
];

export const CERTIFICATE_TOKEN_IDS: CertificateToken[] = CERTIFICATE_TOKENS.map((token) => token.id);

function rankText(value: number | null): string {
  return value === null ? '' : String(value);
}

/**
 * Raw value for a token. Returns '' when the participant has no data, which the
 * renderer treats as "do not draw this field" (so a missing rank never leaves a
 * stray "#" on the certificate).
 */
export function resolveToken(
  token: CertificateToken,
  participant: Participant,
  meta: CertificateMeta
): string {
  switch (token) {
    case 'name':
      return participant.name;
    case 'bib':
      return participant.bib;
    case 'gender':
      return participant.genderLabel;
    case 'genderShort':
      return participant.sex === 'F' ? 'F' : participant.sex === 'M' ? 'M' : '';
    case 'distance':
      return participant.itemName;
    case 'ageGroup':
      return participant.ageGroup;
    case 'ageGroup2':
      return participant.ageGroup2;
    case 'netTime':
      return participant.netScore;
    case 'gunTime':
      return participant.totalScore;
    case 'finishTime':
      return participant.finishTime;
    case 'startTime':
      return participant.startTime;
    case 'pace':
      return participant.pace;
    case 'overallRank':
      return rankText(participant.itemNetRank);
    case 'genderRank':
      return rankText(participant.netRanking);
    case 'ageRank':
      return rankText(participant.ageNetRank);
    case 'age2Rank':
      return rankText(participant.age2NetRank);
    case 'status':
      return participant.status.label;
    case 'city':
      return participant.city;
    case 'team':
      return participant.team;
    case 'eventName':
      return meta.eventName;
    case 'eventDate':
      return meta.eventDate;
    case 'eventTitle':
      return meta.eventTitle;
    default:
      return '';
  }
}

/**
 * Final string for a field, or '' when nothing should be drawn.
 * Prefix/suffix are only applied when the value itself exists.
 */
export function fieldText(
  field: CertificateField,
  participant: Participant,
  meta: CertificateMeta
): string {
  const raw = field.type === 'text' ? String(field.text ?? '') : resolveToken(field.token ?? 'name', participant, meta);

  if (raw.trim() === '') {
    return '';
  }

  const combined = `${field.prefix}${raw}${field.suffix}`;

  return field.style.uppercase ? combined.toUpperCase() : combined;
}

/** Longest line of a (possibly multi-line) field value. */
export function widestLine(text: string): string {
  return text.split('\n').reduce((longest, line) => (line.length > longest.length ? line : longest), '');
}
