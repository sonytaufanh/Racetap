import { cleanKey, mapGenderValue } from './config';
import { parseCsv, type CsvRow } from './csv';
import type { KioskConfig, KioskDatabase, KioskRecord } from './types';

/** CSV headers (also used as `source` names in the config) → timing API fields. */
const API_KEY_MAP: Record<string, string> = {
  Item: 'item_name',
  Bib: 'bib',
  BIB: 'bib',
  bib: 'bib',
  Name: 'name',
  'Id Card': 'id_card',
  Gender: 'sex',
  'Age Group': 'age_group',
  'Gun Time': 'total_score',
  'Net Time': 'net_score',
  Chip: 'epc',
  chip: 'epc'
};

function rawValue(row: CsvRow | Record<string, unknown>, source: string | undefined): string {
  if (!source) {
    return '';
  }

  const value = (row as Record<string, unknown>)[source];

  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
}

function apiValue(row: CsvRow | Record<string, unknown>, source: string | undefined): string {
  if (!source) {
    return '';
  }

  return rawValue(row, API_KEY_MAP[source] ?? source);
}

type ValueResolver = (row: CsvRow | Record<string, unknown>, source: string | undefined) => string;

export function buildRecord(
  row: CsvRow | Record<string, unknown>,
  config: KioskConfig,
  resolve: ValueResolver = rawValue
): KioskRecord {
  const record: KioskRecord = {};

  for (const key of Object.keys(config.fields || {})) {
    const field = config.fields[key];

    if (field.staticText !== undefined && !field.source) {
      record[key] = field.staticText || '';
      continue;
    }

    let value = resolve(row, field.source);

    if (key === 'gender') {
      value = mapGenderValue(value, config);
    }

    record[key] = value;
  }

  return record;
}

function indexRecord(
  database: KioskDatabase,
  record: KioskRecord,
  chip: string,
  bib: string,
  config: KioskConfig
): void {
  const chipKey = cleanKey(chip, config.uppercaseOnly);
  const bibKey = cleanKey(bib, config.uppercaseOnly);

  if (chipKey) {
    database[chipKey] = record;
  }

  if (bibKey) {
    database[bibKey] = record;
  }
}

export function databaseFromCsv(text: string, config: KioskConfig): KioskDatabase {
  const database: KioskDatabase = {};

  for (const row of parseCsv(text)) {
    const chip = row.chip || row.Chip || '';
    const bib = row.Bib || row.BIB || row.bib || '';
    const record = buildRecord(row, config);

    record._bib = bib;
    record._chip = chip;

    indexRecord(database, record, chip, bib, config);
  }

  return database;
}

export function databaseFromApi(payload: unknown, config: KioskConfig): KioskDatabase {
  const database: KioskDatabase = {};
  const data = payload as { data?: unknown; scores?: unknown } | null;

  const scores = Array.isArray(data?.data)
    ? (data.data as Array<Record<string, unknown>>)
    : Array.isArray(data?.scores)
      ? (data.scores as Array<Record<string, unknown>>)
      : [];

  for (const row of scores) {
    const chip = String(row.epc ?? '');
    const bib = String(row.bib ?? '');
    const record = buildRecord(row, config, apiValue);

    record._bib = bib;
    record._chip = chip;

    indexRecord(database, record, chip, bib, config);
  }

  return database;
}

function withTimestamp(url: string): string {
  const separator = url.includes('?') ? '&' : '?';

  return `${url}${separator}ts=${Date.now()}`;
}

export async function loadConfig(configUrl: string): Promise<unknown> {
  try {
    const response = await fetch(withTimestamp(configUrl));

    if (!response.ok) {
      throw new Error(`${configUrl} tidak ditemukan`);
    }

    return await response.json();
  } catch (cause) {
    console.warn('SETTING ERROR:', cause);

    return {};
  }
}

export async function loadDatabase(
  config: KioskConfig,
  assetBase: string
): Promise<KioskDatabase> {
  if (config.dataSource === 'local') {
    const response = await fetch(withTimestamp(`${assetBase}${config.localFile}`));

    if (!response.ok) {
      throw new Error(`File lokal tidak ditemukan: ${config.localFile}`);
    }

    return databaseFromCsv(await response.text(), config);
  }

  const response = await fetch(withTimestamp(config.apiUrl));

  if (!response.ok) {
    throw new Error('API gagal dibaca');
  }

  return databaseFromApi(await response.json(), config);
}
