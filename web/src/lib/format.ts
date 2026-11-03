const MONTHS: Record<'id' | 'en', string[]> = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};

export function formatDate(value: string | null | undefined, locale: 'id' | 'en' = 'id'): string {
  if (!value) {
    return '';
  }

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const month = MONTHS[locale][date.getMonth()];

  return locale === 'en'
    ? `${month} ${date.getDate()}, ${date.getFullYear()}`
    : `${String(date.getDate()).padStart(2, '0')} ${month} ${date.getFullYear()}`;
}

export function timeAgo(value: string | null | undefined): string {
  if (!value) {
    return 'belum pernah';
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);

  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.round(minutes / 60);

  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.round(hours / 24);

  if (days < 30) return `${days} hari lalu`;

  return formatDate(value.slice(0, 10));
}

export function formatNumber(value: number | null | undefined, locale: 'id' | 'en' = 'id'): string {
  return new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'id-ID').format(Number(value || 0));
}

export function formatDecimal(value: number, digits = 1): string {
  return Number(value || 0).toFixed(digits);
}

export function digitsOnly(value: string | null | undefined): string {
  return String(value || '').replace(/[^0-9]/g, '');
}

/**
 * BIB numbers are not always numeric (e.g. "MH2001"), so searches keep letters
 * and digits, drop separators, and normalise the case.
 */
export function normalizeBib(value: string | null | undefined, maxLength = 12): string {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, maxLength);
}


