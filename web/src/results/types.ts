export interface RaceItem {
  id: number;
  race_id?: number;
  title: string;
  distance?: number;
}

export interface RaceInfo {
  id?: number;
  title?: string;
  date_time?: number | null;
  items?: RaceItem[];
}

export interface FeibotScore {
  id: number;
  name?: string | null;
  bib?: string | null;
  sex?: string | null;
  item_id?: number | null;
  item_name?: string | null;
  age_group?: string | null;
  age_group_2?: string | null;
  age?: number | string | null;
  finisher?: number | string | null;
  total_score?: string | null;
  net_score?: string | null;
  start_time?: string | null;
  finish_time?: string | null;
  total_ranking?: number | null;
  net_ranking?: number | null;
  item_total_ranking?: number | null;
  item_net_ranking?: number | null;
  age_total_ranking?: number | null;
  age_net_ranking?: number | null;
  age_2_total_ranking?: number | null;
  age_2_net_ranking?: number | null;
  pace?: string | null;
  diff?: string | null;
  city?: string | null;
  team?: string | null;
  cp1?: string | null;
  cp2?: string | null;
  cp1_cp2?: string | null;
  [key: string]: unknown;
}

export interface ScoresData {
  race?: RaceInfo | null;
  scores?: FeibotScore[] | null;
  [key: string]: unknown;
}

export type StatusTone = 'finisher' | 'dnf' | 'dns';

export interface ParticipantStatus {
  label: string;
  tone: StatusTone;
}

export interface Participant {
  id: number;
  name: string;
  bib: string;
  sex: string;
  genderLabel: string;
  itemName: string;
  ageGroup: string;
  ageGroup2: string;
  finisher: number;
  status: ParticipantStatus;
  netScore: string;
  totalScore: string;
  startTime: string;
  finishTime: string;
  pace: string;
  city: string;
  team: string;
  diff: string;
  cp1: string;
  cp2: string;
  cp1Cp2: string;
  netRanking: number | null;
  itemNetRank: number | null;
  ageNetRank: number | null;
  age2NetRank: number | null;
}

export type ColumnKey =
  | 'item'
  | 'bib'
  | 'name'
  | 'cert'
  | 'gender'
  | 'ageGroup'
  | 'ageGroup2'
  | 'gunTime'
  | 'netTime'
  | 'overallRank'
  | 'genderRank'
  | 'ageRank'
  | 'age2Rank'
  | 'status';

export type FilterKey = 'item' | 'gender' | 'ageGroup' | 'ageGroup2';

export interface EventConfig {
  slug: string;
  title?: string;
  metaTitle?: string;
  description?: string;
  banner?: string | null;
  bannerAlt?: string;
  maintenance?: boolean;
  maintenanceMessage?: string;
  distanceOverride?: string | null;
  pageSize?: number;
  filters?: FilterKey[];
  columns?: ColumnKey[];
  hiddenBelow640?: ColumnKey[];
  hiddenBelow480?: ColumnKey[];
}

export interface ResultsPayload {
  mode: 'results';
  slug: string;
  dataUrl: string;
  assetBase: string;
  config: EventConfig;
}

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: ColumnKey;
  dir: SortDir;
}
