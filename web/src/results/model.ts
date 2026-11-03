import type {
  ColumnKey,
  EventConfig,
  FeibotScore,
  Participant,
  ParticipantStatus,
  RaceItem,
  ScoresData,
  SortState
} from './types';

export function formatRaceDate(ts: number | null | undefined): string {
  if (!ts) {
    return '';
  }

  const date = new Date(ts * 1000);

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function genderLabel(sex: string): string {
  return sex === 'F' ? 'Female' : 'Male';
}

export function statusFor(finisher: number, startTime: string): ParticipantStatus {
  if (finisher === 1) return { label: 'Finisher', tone: 'finisher' };
  if (finisher === -2) return { label: 'DQ', tone: 'dnf' };
  if (finisher === -3) return { label: 'DNF', tone: 'dnf' };
  if (finisher === -4) return { label: 'DNS', tone: 'dns' };
  if (finisher === -5) return { label: 'Cut off', tone: 'dnf' };
  if (finisher === -1 || startTime) return { label: 'Started', tone: 'dns' };

  return { label: '', tone: 'dns' };
}

export function timeToSeconds(value: string): number {
  if (!value) {
    return Number.POSITIVE_INFINITY;
  }

  const parts = value.split(':');

  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }

  if (parts.length === 2) {
    return Number(parts[0]) * 60 + Number(parts[1]);
  }

  return Number.POSITIVE_INFINITY;
}

export function showTime(value: string): string {
  return value ? value : '-';
}

function text(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function rank(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function itemList(race: ScoresData['race']): RaceItem[] {
  const items = race && Array.isArray(race.items) ? race.items : [];

  return items
    .map((item) => ({ id: Number(item.id), title: text(item.title), distance: item.distance }))
    .filter((item) => item.title !== '');
}

export function itemNameFor(score: FeibotScore, items: RaceItem[]): string {
  const explicit = text(score.item_name);

  if (explicit !== '') {
    return explicit;
  }

  const byId = items.find((item) => Number(item.id) === Number(score.item_id));

  if (byId) {
    return byId.title;
  }

  return Number(score.item_id) === 9875 ? '5K' : '10K';
}

export function toParticipant(score: FeibotScore, items: RaceItem[]): Participant {
  const finisher = Number(score.finisher);
  const startTime = text(score.start_time);
  const sex = text(score.sex);

  return {
    id: Number(score.id),
    name: text(score.name),
    bib: text(score.bib),
    sex,
    genderLabel: genderLabel(sex),
    itemName: itemNameFor(score, items),
    ageGroup: text(score.age_group) || 'OPEN',
    ageGroup2: text(score.age_group_2).toUpperCase(),
    finisher,
    status: statusFor(finisher, startTime),
    netScore: text(score.net_score),
    totalScore: text(score.total_score),
    startTime,
    finishTime: text(score.finish_time),
    pace: text(score.pace),
    city: text(score.city),
    team: text(score.team),
    diff: text(score.diff),
    cp1: text(score.cp1),
    cp2: text(score.cp2),
    cp3: text(score.cp3),
    cp4: text(score.cp4),
    cp5: text(score.cp5),
    cp6: text(score.cp6),
    cp1Cp2: text(score.cp1_cp2),
    netRanking: rank(score.net_ranking),
    itemNetRank: rank(score.item_net_ranking),
    ageNetRank: rank(score.age_net_ranking),
    age2NetRank: rank(score.age_2_net_ranking)
  };
}

export interface ParsedScores {
  raceTitle: string;
  raceDate: string;
  items: string[];
  participants: Participant[];
  finishers: number;
  categories: number;
}

export function defaultSort(a: Participant, b: Participant): number {
  if (a.itemNetRank === null && b.itemNetRank === null) {
    return a.name.localeCompare(b.name);
  }

  if (a.itemNetRank === null) {
    return 1;
  }

  if (b.itemNetRank === null) {
    return -1;
  }

  return a.itemNetRank - b.itemNetRank;
}

export function parseScoresData(data: ScoresData): ParsedScores {
  const race = data.race || null;
  const scores = Array.isArray(data.scores) ? data.scores : [];
  const items = itemList(race);
  const titles = items.map((item) => item.title);
  const participants = scores.map((score) => toParticipant(score, items));

  participants.sort(defaultSort);

  const finishers = participants.filter(
    (p) => p.netScore !== '' && p.netScore !== '00:00:00'
  ).length;

  return {
    raceTitle: text(race && race.title),
    raceDate: formatRaceDate(race ? race.date_time ?? null : null),
    items: titles,
    participants,
    finishers,
    categories: new Set(participants.map((p) => p.ageGroup)).size
  };
}

export function distanceLabel(
  items: string[],
  config: EventConfig
): string {
  if (config.distanceOverride) {
    return config.distanceOverride;
  }

  const unique = Array.from(new Set(items.filter((title) => title !== '')));

  return unique.length > 0 ? unique.join(' & ') : '-';
}

export interface Filters {
  search: string;
  item: string;
  gender: string;
  ageGroup: string;
  ageGroup2: string;
}

export const EMPTY_FILTERS: Filters = {
  search: '',
  item: '',
  gender: '',
  ageGroup: '',
  ageGroup2: ''
};

export function filterParticipants(
  participants: Participant[],
  filters: Filters
): Participant[] {
  const search = filters.search.toLowerCase().trim();
  let rows = participants;

  if (search !== '') {
    rows = rows.filter(
      (p) => p.name.toLowerCase().includes(search) || p.bib.toLowerCase().includes(search)
    );
  }

  if (filters.item !== '') {
    rows = rows.filter((p) => p.itemName === filters.item);
  }

  if (filters.gender !== '') {
    rows = rows.filter((p) => p.sex === filters.gender);
  }

  if (filters.ageGroup !== '') {
    rows = rows.filter((p) => p.ageGroup === filters.ageGroup);
  }

  if (filters.ageGroup2 !== '') {
    rows = rows.filter((p) => p.ageGroup2 === filters.ageGroup2);
  }

  return rows;
}

function sortableValue(participant: Participant, key: ColumnKey): string | number {
  switch (key) {
    case 'bib':
      return Number(participant.bib.replace(/\D/g, '')) || 0;
    case 'genderRank':
      return participant.netRanking ?? Number.POSITIVE_INFINITY;
    case 'overallRank':
      return participant.itemNetRank ?? Number.POSITIVE_INFINITY;
    case 'ageRank':
      return participant.ageNetRank ?? Number.POSITIVE_INFINITY;
    case 'age2Rank':
      return participant.age2NetRank ?? Number.POSITIVE_INFINITY;
    case 'gunTime':
      return timeToSeconds(participant.totalScore);
    case 'netTime':
      return timeToSeconds(participant.netScore);
    case 'gender':
      return participant.genderLabel.toLowerCase();
    case 'ageGroup':
      return participant.ageGroup.toLowerCase();
    case 'ageGroup2':
      return participant.ageGroup2.toLowerCase();
    case 'item':
      return participant.itemName.toLowerCase();
    case 'name':
      return participant.name.toLowerCase();
    case 'status':
      return participant.status.label.toLowerCase();
    case 'cert':
      return participant.id;
    default:
      return participant.name.toLowerCase();
  }
}

export function sortParticipants(
  participants: Participant[],
  sort: SortState | null
): Participant[] {
  if (!sort) {
    return participants;
  }

  const rows = [...participants];
  const factor = sort.dir === 'asc' ? 1 : -1;

  rows.sort((a, b) => {
    const va = sortableValue(a, sort.key);
    const vb = sortableValue(b, sort.key);

    if (typeof va === 'number' && typeof vb === 'number') {
      const na = Number.isFinite(va) ? va : Number.POSITIVE_INFINITY;
      const nb = Number.isFinite(vb) ? vb : Number.POSITIVE_INFINITY;

      if (na === nb) {
        return 0;
      }

      return na < nb ? -factor : factor;
    }

    const sa = String(va);
    const sb = String(vb);

    if (sa === sb) {
      return 0;
    }

    return sa < sb ? -factor : factor;
  });

  return rows;
}

export function pageWindow(page: number, totalPages: number): number[] {
  let start = Math.max(1, page - 2);
  let end = Math.min(totalPages, page + 2);

  if (end - start < 4) {
    if (start === 1) {
      end = Math.min(totalPages, start + 4);
    } else {
      start = Math.max(1, end - 4);
    }
  }

  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index);
}
