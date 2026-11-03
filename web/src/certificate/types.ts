import type { FeibotScore } from '../results/types';

/** Dynamic values the renderer understands. Mirrored by Certificate_model::$tokens. */
export type CertificateToken =
  | 'name'
  | 'bib'
  | 'gender'
  | 'genderShort'
  | 'distance'
  | 'ageGroup'
  | 'ageGroup2'
  | 'netTime'
  | 'gunTime'
  | 'finishTime'
  | 'startTime'
  | 'pace'
  | 'overallRank'
  | 'genderRank'
  | 'ageRank'
  | 'age2Rank'
  | 'status'
  | 'city'
  | 'team'
  | 'eventName'
  | 'eventDate'
  | 'eventTitle';

export type CertificateFieldType = 'token' | 'text';
export type CertificateAlign = 'left' | 'center' | 'right';
export type CertificatePdfSize = 'template' | 'a4' | 'a3' | 'letter';

export interface CertificateFieldStyle {
  /** Font id from CERTIFICATE_FONTS. */
  font: string;
  /** Pixels at the template's native resolution. */
  size: number;
  weight: number;
  italic: boolean;
  color: string;
  letterSpacing: number;
  /** Multiplier of `size`; only affects multi-line static text. */
  lineHeight: number;
  uppercase: boolean;
  /** Degrees, clockwise around the anchor point. */
  rotation: number;
  /** 0 disables the constraint. */
  maxWidth: number;
  /** Shrink the font instead of condensing it when `maxWidth` is exceeded. */
  autoShrink: boolean;
}

export interface CertificateField {
  id: string;
  type: CertificateFieldType;
  token: CertificateToken | null;
  text: string | null;
  prefix: string;
  suffix: string;
  /** Anchor point, in template pixels. `y` is the vertical centre of the text. */
  x: number;
  y: number;
  align: CertificateAlign;
  style: CertificateFieldStyle;
}

export interface CertificateConfig {
  version: number;
  slug: string;
  enabled: boolean;
  onlyFinishers: boolean;
  template: string | null;
  width: number;
  height: number;
  background: string | null;
  eventName: string;
  eventDate: string;
  /** Page size of the exported PDF; orientation always follows the artwork. */
  pdf: {
    size: CertificatePdfSize;
  };
  fields: CertificateField[];
  updatedAt?: string;
}

/** Event-level values that are not part of an individual participant row. */
export interface CertificateMeta {
  eventName: string;
  eventDate: string;
  eventTitle: string;
}

/** Mirrors Certificate_model::events() rows. */
export interface CertificateEventRow {
  slug: string;
  name: string;
  has_data: boolean;
  has_template: boolean;
  /** Uploaded file name, e.g. certificate.png. */
  template: string | null;
  template_url: string | null;
  enabled: boolean;
  only_finishers: boolean;
  field_count: number;
  width: number | null;
  height: number | null;
  updated_at: string | null;
}

export interface CertificateEventPayload {
  slug: string;
  config: CertificateConfig | null;
  template_url: string | null;
}

/** Mirrors Certificate_model::sample(): a slice of results/<slug>/data.json. */
export interface CertificateSample {
  total: number;
  matched: number;
  race: {
    title: string;
    date_time: number | null;
    items: Array<{ id: number; title: string }>;
  };
  scores: FeibotScore[];
}
