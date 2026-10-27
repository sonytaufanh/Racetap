import { digitsOnly } from './format';
import type { Photo } from '../types';

export function photoMatches(photo: Pick<Photo, 'bib' | 'ocr_text'>, query: string): boolean {
  const digits = digitsOnly(query);

  if (digits === '') {
    return true;
  }

  return digitsOnly(photo.bib).includes(digits) || digitsOnly(photo.ocr_text).includes(digits);
}

export interface OcrWord {
  text: string;
  area: number;
}

export interface BibPick {
  bib: string;
  tokens: string[];
}

/**
 * Selects the most likely bib number from OCR words. Mirrors the legacy
 * browser implementation: 3-6 digit tokens, largest bounding box wins.
 */
export function pickBibFromWords(words: OcrWord[]): BibPick {
  const candidates: OcrWord[] = [];

  words.forEach((word) => {
    const matches = String(word.text || '').match(/[0-9]{3,6}/g) || [];
    matches.forEach((token) => candidates.push({ text: token, area: word.area || 0 }));
  });

  const ordered = [...candidates].sort((a, b) => b.area - a.area);
  const tokens: string[] = [];

  ordered.forEach((candidate) => {
    if (!tokens.includes(candidate.text)) {
      tokens.push(candidate.text);
    }
  });

  return { bib: tokens[0] || '', tokens };
}

export function pickBibFromText(text: string): BibPick {
  const matches = String(text || '').match(/[0-9]{3,6}/g) || [];
  const tokens = Array.from(new Set(matches));

  return { bib: tokens[0] || '', tokens };
}

interface BoundingBox {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface TesseractWord {
  text?: string;
  bbox?: BoundingBox;
}

interface TesseractNode {
  words?: Array<TesseractWord | TesseractNode>;
  blocks?: TesseractNode[];
  paragraphs?: TesseractNode[];
  lines?: TesseractNode[];
  text?: string;
}

export function extractWords(node: TesseractNode | null | undefined, out: OcrWord[] = []): OcrWord[] {
  if (!node) {
    return out;
  }

  if (Array.isArray(node.words)) {
    node.words.forEach((word) => {
      if (word && typeof word === 'object' && typeof (word as TesseractWord).text === 'string') {
        const typed = word as TesseractWord;
        const bbox = typed.bbox || {};
        const area =
          typeof bbox.x0 === 'number' && typeof bbox.x1 === 'number' && typeof bbox.y0 === 'number' && typeof bbox.y1 === 'number'
            ? Math.max(0, bbox.x1 - bbox.x0) * Math.max(0, bbox.y1 - bbox.y0)
            : 0;

        out.push({ text: typed.text || '', area });
      } else {
        extractWords(word as TesseractNode, out);
      }
    });
  }

  if (Array.isArray(node.blocks)) {
    node.blocks.forEach((block) => extractWords(block, out));
  }

  if (Array.isArray(node.paragraphs)) {
    node.paragraphs.forEach((paragraph) => extractWords(paragraph, out));
  }

  if (Array.isArray(node.lines)) {
    node.lines.forEach((line) => extractWords(line, out));
  }

  return out;
}
