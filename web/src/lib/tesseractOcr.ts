import { extractWords, normalizeOcrRule, pickBibFromText, pickBibFromWords, type OcrWord } from './bib';
import type { OcrRule, OcrWordPayload } from '../types';

export interface PhotoOcrResult {
  bib: string;
  text: string;
  confidence: number;
  words: OcrWordPayload[];
}

export interface OcrLogMessage {
  status: string;
  progress: number;
}

export interface PhotoOcrWorker {
  recognize: (source: string | File) => Promise<{ data: unknown }>;
  setParameters: (params: Record<string, string>) => Promise<unknown>;
  terminate: () => Promise<unknown>;
}

/**
 * Free-tier OCR: runs entirely in the admin browser via Tesseract.js.
 *
 * The event's rule is pushed into Tesseract itself: with `digitsOnly` the char
 * whitelist drops every letter, so the engine only reports digits.
 */
export async function createPhotoOcrWorker(
  onLog?: (message: OcrLogMessage) => void,
  rule?: Partial<OcrRule> | null
): Promise<PhotoOcrWorker> {
  const module = await import('tesseract.js');
  const factory = module.createWorker as unknown as (
    lang: string,
    oem: number,
    options?: { logger?: (message: { status?: string; progress?: number }) => void }
  ) => Promise<PhotoOcrWorker>;

  const worker = await factory('eng', 1, {
    logger: (message) => {
      if (onLog) {
        onLog({ status: message.status || '', progress: typeof message.progress === 'number' ? message.progress : 0 });
      }
    }
  });

  const digitsOnly = normalizeOcrRule(rule).digitsOnly;

  try {
    await worker.setParameters({
      tessedit_char_whitelist: digitsOnly ? '0123456789' : '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ',
      tessedit_pageseg_mode: '11'
    });
  } catch {
    // Parameters are optional.
  }

  return worker;
}

/**
 * Upscales + grayscales the photo in a canvas before OCR. Race bibs are often
 * small in the frame; this noticeably improves Tesseract's hit rate.
 * Falls back to the original URL when the canvas path is unavailable.
 */
export async function prepareImageForOcr(src: string): Promise<string> {
  try {
    const image = await loadImage(src);
    const scale = Math.min(2.5, Math.max(1, 1800 / Math.max(1, image.naturalWidth)));
    const width = Math.min(2200, Math.round(image.naturalWidth * scale));
    const height = Math.round((image.naturalHeight * width) / Math.max(1, image.naturalWidth));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');

    if (!context) {
      return src;
    }

    context.drawImage(image, 0, 0, width, height);

    const frame = context.getImageData(0, 0, width, height);
    const data = frame.data;

    for (let index = 0; index < data.length; index += 4) {
      const gray = 0.299 * data[index] + 0.587 * data[index + 1] + 0.114 * data[index + 2];
      const adjusted = Math.max(0, Math.min(255, (gray - 128) * 1.35 + 128));
      data[index] = adjusted;
      data[index + 1] = adjusted;
      data[index + 2] = adjusted;
    }

    context.putImageData(frame, 0, 0);

    return canvas.toDataURL('image/jpeg', 0.9);
  } catch {
    return src;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Gagal memuat gambar untuk OCR.'));
    image.src = src;
  });
}

export function readPhotoOcrResult(
  raw: unknown,
  rule?: Partial<OcrRule> | null,
  knownBibs: string[] = []
): PhotoOcrResult {
  const payload = (raw || {}) as { text?: string; confidence?: number };
  const words = extractWords(payload as Parameters<typeof extractWords>[0]);
  const picked = words.length > 0
    ? pickBibFromWords(words, rule, knownBibs)
    : pickBibFromText(String(payload.text || ''), rule, knownBibs);
  const confidence = averageConfidence(words, Number(payload.confidence || 0));

  return {
    bib: picked.bib,
    text: String(payload.text || ''),
    confidence,
    words: words.map((word: OcrWord) => ({
      text: word.text,
      confidence: word.confidence ?? 0,
      box: word.box ?? null
    }))
  };
}

function averageConfidence(words: OcrWord[], fallback: number): number {
  const scored = words.filter((word) => typeof word.confidence === 'number' && word.confidence > 0);

  if (scored.length === 0) {
    return fallback;
  }

  const total = scored.reduce((sum, word) => sum + (word.confidence || 0), 0);

  return Math.round((total / scored.length) * 10) / 10;
}
