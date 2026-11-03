import { DEFAULT_CERTIFICATE_BODY_FONT, DEFAULT_CERTIFICATE_FONT } from './fonts';
import type {
  CertificateConfig,
  CertificateField,
  CertificateFieldStyle,
  CertificateMeta,
  CertificateToken
} from './types';

let fieldCounter = 0;

export function nextFieldId(): string {
  fieldCounter += 1;

  return `f${fieldCounter.toString(36)}${Date.now().toString(36).slice(-4)}`;
}

export function styleDefaults(
  size: number,
  overrides: Partial<CertificateFieldStyle> = {}
): CertificateFieldStyle {
  return {
    font: DEFAULT_CERTIFICATE_FONT,
    size: Math.max(6, Math.round(size)),
    weight: 700,
    italic: false,
    color: '#111827',
    letterSpacing: 0,
    lineHeight: 1.2,
    uppercase: false,
    rotation: 0,
    maxWidth: 0,
    autoShrink: false,
    ...overrides
  };
}

export function makeTokenField(
  token: CertificateToken,
  x: number,
  y: number,
  style: CertificateFieldStyle
): CertificateField {
  return {
    id: nextFieldId(),
    type: 'token',
    token,
    text: null,
    prefix: '',
    suffix: '',
    x: Math.round(x),
    y: Math.round(y),
    align: 'center',
    style
  };
}

export function makeTextField(text: string, x: number, y: number, style: CertificateFieldStyle): CertificateField {
  return {
    id: nextFieldId(),
    type: 'text',
    token: null,
    text,
    prefix: '',
    suffix: '',
    x: Math.round(x),
    y: Math.round(y),
    align: 'center',
    style
  };
}

export function emptyCertificateConfig(
  slug: string,
  meta: CertificateMeta,
  width = 2480,
  height = 1754,
  template: string | null = null
): CertificateConfig {
  return {
    version: 1,
    slug,
    enabled: false,
    onlyFinishers: true,
    template,
    width,
    height,
    background: '#ffffff',
    eventName: meta.eventName,
    eventDate: meta.eventDate,
    pdf: { size: 'template' },
    fields: []
  };
}

/**
 * Generic starter layout, proportional to the template so it lands sensibly on
 * any aspect ratio. The admin is expected to nudge it onto the real artwork.
 */
export function defaultLayout(width: number, height: number): CertificateField[] {
  const cx = width / 2;

  return [
    makeTextField('SERTIFIKAT', cx, height * 0.16, styleDefaults(height * 0.05, {
      font: 'cinzel',
      color: '#0b4e6b',
      uppercase: true,
      letterSpacing: Math.round(height * 0.002)
    })),
    makeTextField('DIBERIKAN KEPADA', cx, height * 0.3, styleDefaults(height * 0.024, {
      font: DEFAULT_CERTIFICATE_BODY_FONT,
      weight: 400,
      color: '#475569',
      uppercase: true,
      letterSpacing: Math.round(height * 0.004)
    })),
    makeTokenField('name', cx, height * 0.42, styleDefaults(height * 0.075, {
      font: 'great-vibes',
      weight: 400,
      color: '#0b1437',
      maxWidth: Math.round(width * 0.8),
      autoShrink: true
    })),
    makeTokenField('bib', cx, height * 0.51, styleDefaults(height * 0.024, {
      font: DEFAULT_CERTIFICATE_BODY_FONT,
      weight: 600,
      color: '#475569'
    })),
    makeTokenField('distance', width * 0.3, height * 0.63, styleDefaults(height * 0.028, {
      font: DEFAULT_CERTIFICATE_BODY_FONT,
      weight: 600,
      color: '#0b4e6b'
    })),
    makeTokenField('netTime', cx, height * 0.63, styleDefaults(height * 0.034, {
      font: DEFAULT_CERTIFICATE_FONT,
      weight: 700,
      color: '#0b1437'
    })),
    makeTokenField('overallRank', width * 0.7, height * 0.63, styleDefaults(height * 0.028, {
      font: DEFAULT_CERTIFICATE_BODY_FONT,
      weight: 600,
      color: '#b54708'
    })),
    makeTokenField('eventDate', cx, height * 0.86, styleDefaults(height * 0.022, {
      font: DEFAULT_CERTIFICATE_BODY_FONT,
      weight: 400,
      color: '#475569'
    }))
  ];
}
