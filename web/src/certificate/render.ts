import type { Participant } from '../results/types';
import {
  certificateFontFamily,
  certificateFontStack,
  findCertificateFont,
  nearestWeight
} from './fonts';
import { fieldText } from './tokens';
import type { CertificateConfig, CertificateField, CertificateFieldStyle, CertificateMeta } from './types';

/** Hard ceiling for the rasterised canvas, to bound memory on big templates. */
export const MAX_RENDER_WIDTH = 3000;

export const MIN_FONT_SIZE = 6;

type Ctx = CanvasRenderingContext2D;

let sharedContext: Ctx | null = null;

/**
 * Detached 2D context used purely for measuring text (editor handles, layout
 * checks). Created once and reused; returns null outside a DOM.
 */
export function measuringContext(): Ctx | null {
  if (sharedContext === null && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 8;
    canvas.height = 8;
    sharedContext = canvas.getContext('2d');
  }

  return sharedContext;
}

export function fontShorthand(style: CertificateFieldStyle, size: number): string {
  const italic = style.italic ? 'italic ' : '';
  const weight = nearestWeight(findCertificateFont(style.font), style.weight);

  return `${italic}${weight} ${size}px ${certificateFontStack(style.font)}`;
}

/**
 * Width of a line, honouring manual letter spacing. The browser's own
 * `letterSpacing` is not used because Firefox does not support it.
 */
export function lineWidth(ctx: Ctx, text: string, spacing: number): number {
  if (spacing === 0) {
    return ctx.measureText(text).width;
  }

  const characters = Array.from(text);
  let width = 0;

  for (const character of characters) {
    width += ctx.measureText(character).width + spacing;
  }

  return Math.max(0, width - spacing);
}

export function widestLineWidth(ctx: Ctx, lines: string[], spacing: number): number {
  return lines.reduce((widest, line) => Math.max(widest, lineWidth(ctx, line, spacing)), 0);
}

/**
 * Largest size at or below `start` whose measured width fits `maxWidth`.
 * `measure` must set the font for the candidate size before measuring.
 */
export function fitFontSize(
  start: number,
  min: number,
  measure: (size: number) => number,
  maxWidth: number,
  maxPasses = 8
): number {
  if (maxWidth <= 0 || start <= min) {
    return start;
  }

  let size = start;

  for (let pass = 0; pass < maxPasses; pass += 1) {
    const width = measure(size);

    if (width <= maxWidth) {
      return size;
    }

    const next = Math.floor(size * (maxWidth / width));
    size = next < min ? min : next;

    if (size <= min) {
      return min;
    }
  }

  return size;
}

function drawLine(ctx: Ctx, text: string, x: number, y: number, spacing: number, align: string): void {
  if (spacing === 0) {
    ctx.fillText(text, x, y);
    return;
  }

  const width = lineWidth(ctx, text, spacing);
  let cursor = x;

  if (align === 'center') {
    cursor = x - width / 2;
  } else if (align === 'right') {
    cursor = x - width;
  }

  const previousAlign = ctx.textAlign;
  ctx.textAlign = 'left';

  for (const character of Array.from(text)) {
    ctx.fillText(character, cursor, y);
    cursor += ctx.measureText(character).width + spacing;
  }

  ctx.textAlign = previousAlign;
}

/** Measured geometry of a field, always expressed in template pixels. */
export interface PreparedField {
  lines: string[];
  /** Resolved font size, after any auto-shrink. */
  size: number;
  spacing: number;
  /** Widest line width, including letter spacing. */
  width: number;
  /** Total block height for multi-line text. */
  height: number;
  lineStep: number;
}

/**
 * Measures a field exactly the way it will be drawn. The editor reuses this so
 * the drag handles match the pixels the renderer produces.
 */
export function prepareField(ctx: Ctx, field: CertificateField, text: string): PreparedField {
  const style = field.style;
  const lines = text.split('\n');
  const spacing = style.letterSpacing;
  const maxWidth = style.maxWidth > 0 ? style.maxWidth : 0;
  const setFont = (size: number) => {
    ctx.font = fontShorthand(style, size);
  };

  let size = style.size;

  if (maxWidth > 0 && style.autoShrink) {
    size = fitFontSize(size, MIN_FONT_SIZE, (candidate) => {
      setFont(candidate);
      return widestLineWidth(ctx, lines, spacing);
    }, maxWidth);
  }

  setFont(size);

  const lineStep = size * style.lineHeight;

  return {
    lines,
    size,
    spacing,
    width: widestLineWidth(ctx, lines, spacing),
    height: lineStep * lines.length,
    lineStep
  };
}

/**
 * Draws one field at its anchor point. Everything is expressed in template
 * pixels and the whole operation is scaled once, so the same config renders
 * identically at any output resolution.
 */
export function drawField(ctx: Ctx, field: CertificateField, text: string, scale = 1): void {
  const style = field.style;
  const prepared = prepareField(ctx, field, text);
  const maxWidth = style.maxWidth > 0 ? style.maxWidth : 0;

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(field.x, field.y);

  if (style.rotation !== 0) {
    ctx.rotate((style.rotation * Math.PI) / 180);
  }

  if (maxWidth > 0 && prepared.width > maxWidth && !style.autoShrink) {
    ctx.scale(maxWidth / prepared.width, 1);
  }

  ctx.textAlign = field.align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = style.color;

  prepared.lines.forEach((line, lineIndex) => {
    const offset = (lineIndex - (prepared.lines.length - 1) / 2) * prepared.lineStep;
    drawLine(ctx, line, 0, offset, prepared.spacing, field.align);
  });

  ctx.restore();
}

export interface RenderOptions {
  /** Rasterisation width; the height follows the template aspect ratio. */
  maxWidth?: number;
  /** Fill behind the template. Defaults to white when the config has none. */
  background?: string | null;
}

/**
 * Composites the template image and every field into a fresh canvas.
 * Returns the canvas even when no template image is available, so the editor
 * can still show field placement before an upload.
 */
export function renderCertificate(
  config: CertificateConfig,
  participant: Participant,
  meta: CertificateMeta,
  image: CanvasImageSource | null,
  options: RenderOptions = {}
): HTMLCanvasElement {
  const maxWidth = options.maxWidth ?? MAX_RENDER_WIDTH;
  const sourceWidth = Math.max(1, config.width);
  const sourceHeight = Math.max(1, config.height);
  const scale = Math.min(1, maxWidth / sourceWidth);

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));

  const ctx = canvas.getContext('2d');

  if (!ctx) {
    return canvas;
  }

  ctx.fillStyle = options.background ?? config.background ?? '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (image) {
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  }

  for (const field of config.fields) {
    const text = fieldText(field, participant, meta);

    if (text === '') {
      continue;
    }

    drawField(ctx, field, text, scale);
  }

  return canvas;
}

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const sameOrigin =
      url.startsWith('/') ||
      url.startsWith('./') ||
      (typeof window !== 'undefined' && url.startsWith(window.location.origin));

    if (!sameOrigin) {
      image.crossOrigin = 'anonymous';
    }

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Template sertifikat gagal dimuat.'));
    image.src = url;
  });
}

/**
 * Waits for every bundled family the config uses, so the first draw is never
 * done with a fallback face. System fonts need no loading and are skipped.
 */
export async function ensureCertificateFonts(config: CertificateConfig): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) {
    return;
  }

  const shorthands = new Set<string>();

  for (const field of config.fields) {
    const font = findCertificateFont(field.style.font);

    if (!font.bundled) {
      continue;
    }

    const family = certificateFontFamily(field.style.font);
    const weight = nearestWeight(font, field.style.weight);
    const style = field.style.italic && font.italic ? 'italic' : 'normal';

    shorthands.add(`${style} ${weight} 64px "${family}"`);
  }

  await Promise.all(
    Array.from(shorthands).map((shorthand) =>
      document.fonts.load(shorthand).catch(() => undefined)
    )
  );

  try {
    await document.fonts.ready;
  } catch {
    // Font loading errors must never block the download.
  }
}

export function certificateFileName(
  config: CertificateConfig,
  participant: Participant,
  extension: string
): string {
  const identity = (participant.bib || String(participant.id) || 'peserta').replace(/[^A-Za-z0-9._-]+/g, '-');
  const slug = config.slug.replace(/[^A-Za-z0-9._-]+/g, '-');

  return `sertifikat-${slug}-${identity}.${extension}`;
}
