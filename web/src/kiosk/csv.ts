export function detectDelimiter(headerLine: string): string {
  const semi = (headerLine.match(/;/g) || []).length;
  const comma = (headerLine.match(/,/g) || []).length;

  return semi >= comma ? ';' : ',';
}

export type CsvRow = Record<string, string>;

/**
 * Simple delimiter auto-detecting CSV reader. The export from the timing system
 * has no quoted delimiters, so this intentionally stays one small function.
 */
export function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r\n|\n|\r/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const delimiter = detectDelimiter(lines[0]);
  const headers = lines[0].split(delimiter).map((header) => header.trim());
  const rows: CsvRow[] = [];

  for (let index = 1; index < lines.length; index++) {
    const columns = lines[index].split(delimiter);
    const row: CsvRow = {};

    headers.forEach((header, columnIndex) => {
      row[header] = (columns[columnIndex] ?? '').trim();
    });

    rows.push(row);
  }

  return rows;
}
