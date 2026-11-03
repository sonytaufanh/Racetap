import type { KioskConfig } from './types';

export const DEFAULT_CONFIG: KioskConfig = {
  eventName: 'RACETAP.ID - BIB CHECK',
  background: 'bg.png',
  dataSource: 'api',
  localFile: 'data.csv',
  apiUrl: '',
  refreshInterval: 5000,
  resetTime: 40000,
  notFoundTime: 2500,
  enableFullscreen: true,
  enableWakeLock: true,
  uppercaseOnly: true,
  notFoundText: 'DATA TIDAK DITEMUKAN',
  genderMapping: {
    enabled: true,
    map: { M: 'Male', F: 'Female', O: 'Other' }
  },
  categoryBackground: { enabled: false },
  status: {
    top: '200px',
    left: '50%',
    width: '1000px',
    fontSize: '50px',
    color: '#ff0000',
    align: 'center',
    wrap: false
  },
  fields: {
    name: {
      source: 'Name',
      enabled: true,
      top: '120px',
      left: '50%',
      width: '1400px',
      fontSize: '82px',
      color: '#ffffff',
      align: 'center',
      wrap: true
    },
    bib: {
      source: 'Bib',
      enabled: true,
      top: '550px',
      left: '240px',
      width: '700px',
      fontSize: '90px',
      color: '#107141',
      align: 'center',
      wrap: false
    }
  },
  standbyText: {
    enabled: true,
    text: 'BIB CHECKING',
    top: '50%',
    left: '50%',
    width: '1400px',
    fontSize: '120px',
    color: '#ffffff',
    align: 'center',
    blinkSpeed: 1
  }
};

type PlainObject = Record<string, unknown>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Deep merge that never mutates the base object, matching the legacy kiosk merge. */
export function deepMerge<T extends object>(target: T, source: unknown): T {
  const output: PlainObject = { ...(target as PlainObject) };

  if (!isPlainObject(source)) {
    return output as T;
  }

  for (const key of Object.keys(source)) {
    const next = source[key];

    if (isPlainObject(next)) {
      output[key] = deepMerge(
        isPlainObject(output[key]) ? (output[key] as PlainObject) : {},
        next
      );
    } else {
      output[key] = next;
    }
  }

  return output as T;
}

export function normalizeConfig(userConfig: unknown): KioskConfig {
  return deepMerge(DEFAULT_CONFIG, userConfig);
}

/**
 * Scanner input normalisation. When uppercaseOnly is on, only hex characters
 * survive (matching what the hardware wedges actually emit).
 */
export function cleanKey(value: string, uppercaseOnly = true): string {
  const raw = String(value ?? '');

  if (!uppercaseOnly) {
    return raw.trim();
  }

  const matches = raw.toUpperCase().match(/[0-9A-F]+/g);

  return matches ? matches.join('') : '';
}

export function mapGenderValue(raw: string, config: KioskConfig): string {
  const mapping = config.genderMapping;

  if (!mapping || mapping.enabled === false) {
    return raw;
  }

  const key = String(raw ?? '').trim().toUpperCase();
  const map = mapping.map || {};

  return map[key] !== undefined ? map[key] : raw;
}
