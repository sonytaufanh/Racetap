import { normalizeBib } from './format';
import type { OcrRule, Photo } from '../types';

/** Legacy default: 3-6 digits, no exact length pinned. */
export const DEFAULT_OCR_RULE: OcrRule = { digitsOnly: true, digits: 0 };

const MAX_OCR_DIGITS = 12;
const LEGACY_MIN_DIGITS = 3;
const LEGACY_MAX_DIGITS = 6;

export function normalizeOcrRule(raw: Partial<OcrRule> | null | undefined): OcrRule {
  const digits = Math.trunc(Number(raw?.digits ?? 0));

  return {
    digitsOnly: raw?.digitsOnly ?? DEFAULT_OCR_RULE.digitsOnly,
    digits: Number.isFinite(digits) ? Math.min(Math.max(digits, 0), MAX_OCR_DIGITS) : 0
  };
}

/** Digit length range enforced by a rule; an exact count when `digits` is set. */
export function ocrDigitRange(rule: Partial<OcrRule> | null | undefined): { min: number; max: number } {
  const normalized = normalizeOcrRule(rule);

  if (normalized.digits >= 1) {
    return { min: normalized.digits, max: normalized.digits };
  }

  return { min: LEGACY_MIN_DIGITS, max: LEGACY_MAX_DIGITS };
}

/**
 * Matches digit runs of the allowed length.
 *
 * Three passes, cheapest first:
 *   1. real digits, on digit boundaries (so "BIB 3021 SUBANG" is not damaged
 *      and a 5-digit run cannot satisfy a 4-digit rule by being sliced);
 *   2. mixed tokens where digits sit next to look-alike letters ("3O21");
 *   3. fully look-alike tokens ("SO21").
 */
export function matchOcrDigits(text: string, rule: Partial<OcrRule> | null | undefined): string[] {
  const { min, max } = ocrDigitRange(rule);
  const source = String(text || '').toUpperCase();
  const digitRun = new RegExp(`(?<!\\d)[0-9]{${min},${max}}(?!\\d)`, 'g');
  const found = source.match(digitRun) || [];

  if (found.length > 0) {
    return found;
  }

  const confusables = `[0-9OQDUJILSBZGT]`;
  const pattern = new RegExp(`(?<![0-9A-Z])${confusables}{${min},${max}}(?![0-9A-Z])`, 'g');
  const tokens = source.match(pattern) || [];
  const seen: string[] = [];

  tokens.forEach((token) => {
    if (!/[A-Z]/.test(token)) {
      // Already covered by pass 1.
      return;
    }

    const mapped = normalizeOcrDigits(token);

    if (/^[0-9]+$/.test(mapped) && !seen.includes(mapped)) {
      seen.push(mapped);
    }
  });

  return seen;
}

/** Replaces the letter look-alikes of a bib token with their digits. */
export function normalizeOcrDigits(text: string): string {
  return String(text || '').toUpperCase().replace(/[OQDUJILSBZGT]/g, (char) => OCR_CONFUSION[char] || char);
}

const OCR_CONFUSION: Record<string, string> = {
  O: '0',
  Q: '0',
  D: '0',
  U: '0',
  J: '1',
  I: '1',
  L: '1',
  S: '5',
  B: '8',
  Z: '2',
  G: '6',
  T: '7'
};

/**
 * Users often type "BIB 1024" or "bib: MH2001". Strip the label, keep letters
 * and digits, then match as a substring so alphanumeric BIBs work too.
 */
function bibNeedle(query: string): string {
  return normalizeBib(query).replace(/^(BIB|NOMOR|NO)/, '');
}

export function photoMatches(photo: Pick<Photo, 'bib' | 'ocr_text' | 'bibs'>, query: string): boolean {
  const needle = bibNeedle(query);

  if (needle === '') {
    return true;
  }

  const bibs = (photo.bibs || []).map((bib) => normalizeBib(bib));

  if (bibs.length > 0) {
    return bibs.some((bib) => bib.includes(needle)) || normalizeBib(photo.bib).includes(needle);
  }

  return normalizeBib(photo.bib).includes(needle) || normalizeBib(photo.ocr_text).includes(needle);
}

export interface OcrWord {
  text: string;
  area: number;
  confidence?: number;
  box?: [number, number, number, number] | null;
}

export interface BibPick {
  bib: string;
  tokens: string[];
}

/**
 * Selects the most likely bib number from OCR words. Mirrors the server
 * resolver: digit runs of the length allowed by the event's rule, largest
 * bounding box wins. `knownBibs` (the event's official list, when available)
 * lets a glued read such as "14127" resolve to bib "1412".
 */
export function pickBibFromWords(
  words: OcrWord[],
  rule: Partial<OcrRule> | null = null,
  knownBibs: string[] = []
): BibPick {
  const known = new Set(knownBibs.map((bib) => normalizeBib(bib)).filter((bib) => bib !== ''));
  const candidates: OcrWord[] = [];

  words.forEach((word) => {
    const text = String(word.text || '');

    matchOcrDigits(text, rule).forEach((token) => {
      candidates.push({ text: token, area: word.area || 0 });
    });

    if (known.size > 0) {
      matchGluedDigits(text, rule, known).forEach((token) => {
        candidates.push({ text: token, area: word.area || 0 });
      });
    }
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

export function pickBibFromText(
  text: string,
  rule: Partial<OcrRule> | null = null,
  knownBibs: string[] = []
): BibPick {
  const known = new Set(knownBibs.map((bib) => normalizeBib(bib)).filter((bib) => bib !== ''));
  const tokens = Array.from(new Set(matchOcrDigits(text, rule)));

  if (known.size > 0) {
    matchGluedDigits(text, rule, known).forEach((token) => {
      if (!tokens.includes(token)) {
        tokens.push(token);
      }
    });
  }

  return { bib: tokens[0] || '', tokens };
}

/**
 * Recovers a whitelisted bib from an over-long OCR read ("14127" -> "1412").
 * Only entries present in `known` are returned, so this can never invent a bib.
 */
export function matchGluedDigits(
  text: string,
  rule: Partial<OcrRule> | null | undefined,
  known: Set<string>
): string[] {
  const { min, max } = ocrDigitRange(rule);
  const matches = String(text || '').toUpperCase().match(/[0-9]{1,12}/g) || [];
  const out: string[] = [];

  matches.forEach((token) => {
    for (let drop = 1; drop <= 2; drop += 1) {
      const candidateLength = token.length - drop;

      if (candidateLength < min || candidateLength > max) {
        continue;
      }

      [token.slice(0, -drop), token.slice(drop)].forEach((candidate) => {
        if (candidate !== '' && known.has(candidate) && !out.includes(candidate)) {
          out.push(candidate);
        }
      });
    }
  });

  return out;
}

interface BoundingBox {
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

interface TesseractWord {
  text?: string;
  confidence?: number;
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
        const hasBox =
          typeof bbox.x0 === 'number' &&
          typeof bbox.x1 === 'number' &&
          typeof bbox.y0 === 'number' &&
          typeof bbox.y1 === 'number';
        const area = hasBox ? Math.max(0, bbox.x1! - bbox.x0!) * Math.max(0, bbox.y1! - bbox.y0!) : 0;

        out.push({
          text: typed.text || '',
          area,
          confidence: typeof typed.confidence === 'number' ? typed.confidence : undefined,
          box: hasBox ? [bbox.x0!, bbox.y0!, bbox.x1!, bbox.y1!] : null
        });
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
