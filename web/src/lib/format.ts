const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export function formatDate(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat('id-ID').format(Number(value || 0));
}

export function formatDecimal(value: number, digits = 1): string {
  return Number(value || 0).toFixed(digits);
}

export function digitsOnly(value: string | null | undefined): string {
  return String(value || '').replace(/[^0-9]/g, '');
}

export function labelFromKey(key: string): string {
  return key
    .replace(/[._]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function buildQuery(params: Record<string, string | number | null | undefined>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();

  return query ? `?${query}` : '';
}
