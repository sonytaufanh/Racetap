export interface FieldStyle {
  source?: string;
  staticText?: string;
  enabled?: boolean;
  top?: string;
  left?: string;
  width?: string;
  fontSize?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  wrap?: boolean;
  fontFamily?: string;
  fontStyle?: string;
  textShadow?: string;
}

export interface GenderMapping {
  enabled?: boolean;
  map?: Record<string, string>;
}

export interface CategoryBackground {
  enabled?: boolean;
  source?: string;
  map?: Record<string, string>;
}

export interface StandbyText {
  enabled?: boolean;
  text?: string;
  top?: string;
  left?: string;
  width?: string;
  fontSize?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
  blinkSpeed?: number;
}

export interface KioskConfig {
  eventName: string;
  background: string;
  dataSource: 'local' | 'api';
  localFile: string;
  apiUrl: string;
  refreshInterval: number;
  resetTime: number;
  notFoundTime: number;
  enableFullscreen: boolean;
  enableWakeLock: boolean;
  uppercaseOnly: boolean;
  notFoundText: string;
  genderMapping: GenderMapping;
  categoryBackground: CategoryBackground;
  status: FieldStyle;
  fields: Record<string, FieldStyle>;
  standbyText: StandbyText;
}

export type KioskRecord = Record<string, string> & {
  _bib?: string;
  _chip?: string;
};

export type KioskDatabase = Record<string, KioskRecord>;

export interface KioskPayload {
  mode: 'kiosk';
  configUrl: string;
  assetBase: string;
  dataSource?: 'local' | 'api';
}

export interface DisplayState {
  kind: 'standby' | 'found' | 'not-found';
  record: KioskRecord | null;
  message: string;
}
