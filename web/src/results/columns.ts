import type { ColumnKey, Participant } from './types';
import { showTime } from './model';

export interface ColumnDef {
  key: ColumnKey;
  label: string;
  sortable: boolean;
  className?: string;
  align?: 'left' | 'right' | 'center';
}

export const DEFAULT_COLUMNS: ColumnKey[] = [
  'item',
  'bib',
  'name',
  'cert',
  'gender',
  'ageGroup',
  'gunTime',
  'netTime',
  'overallRank',
  'genderRank',
  'ageRank',
  'status'
];

export const COLUMNS: Record<ColumnKey, ColumnDef> = {
  item: { key: 'item', label: 'Dist', sortable: true, className: 'rt-rank-cell' },
  bib: { key: 'bib', label: 'Bib', sortable: true, className: 'rt-bib-cell' },
  name: { key: 'name', label: 'Name', sortable: true, className: 'rt-name-cell' },
  cert: { key: 'cert', label: 'Cert', sortable: false, align: 'center' },
  gender: { key: 'gender', label: 'Gender', sortable: true },
  ageGroup: { key: 'ageGroup', label: 'Age Grp', sortable: true },
  ageGroup2: { key: 'ageGroup2', label: 'Age Grp 2', sortable: true },
  gunTime: { key: 'gunTime', label: 'Gun Time', sortable: true, className: 'rt-time-cell' },
  netTime: { key: 'netTime', label: 'Net Time', sortable: true, className: 'rt-time-cell' },
  overallRank: { key: 'overallRank', label: 'Overall Rank', sortable: true, className: 'rt-rank-cell' },
  genderRank: { key: 'genderRank', label: 'Gender Rank', sortable: true, className: 'rt-rank-cell' },
  ageRank: { key: 'ageRank', label: 'Age Rank', sortable: true, className: 'rt-rank-cell' },
  age2Rank: { key: 'age2Rank', label: 'Age2 Rank', sortable: true, className: 'rt-rank-cell' },
  status: { key: 'status', label: 'Status', sortable: true }
};

export const CERT_URL = 'https://time.feibot.com/live-wire/scores/detail/';

export function certLink(id: number): string {
  return `${CERT_URL}${id}`;
}

export function rankText(value: number | null): string {
  return value === null ? '-' : String(value);
}

export function cellTextKey(participant: Participant, key: ColumnKey): string {
  switch (key) {
    case 'item':
      return participant.itemName;
    case 'bib':
      return participant.bib;
    case 'name':
      return participant.name;
    case 'cert':
      return String(participant.id);
    case 'gender':
      return participant.genderLabel;
    case 'ageGroup':
      return participant.ageGroup;
    case 'ageGroup2':
      return participant.ageGroup2;
    case 'gunTime':
      return showTime(participant.totalScore);
    case 'netTime':
      return showTime(participant.netScore);
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
    default:
      return participant.name;
  }
}
