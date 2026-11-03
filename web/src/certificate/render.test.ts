// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest';
import {
  MAX_RENDER_WIDTH,
  certificateFileName,
  fitFontSize,
  fontShorthand,
  lineWidth,
  renderCertificate
} from './render';
import { CERTIFICATE_FONTS, certificateFontStack, findCertificateFont, nearestWeight } from './fonts';
import { defaultLayout, emptyCertificateConfig, styleDefaults } from './defaults';
import type { CertificateConfig, CertificateMeta } from './types';
import type { Participant } from '../results/types';

const meta: CertificateMeta = { eventName: 'Dahana Run 2026', eventDate: '2026-05-17', eventTitle: 'Dahana Run' };

const participant: Participant = {
  id: 42,
  name: 'Budi',
  bib: '1042',
  sex: 'M',
  genderLabel: 'Male',
  itemName: '10K',
  ageGroup: 'OPEN',
  ageGroup2: '',
  finisher: 1,
  status: { label: 'Finisher', tone: 'finisher' },
  netScore: '01:02:03',
  totalScore: '01:03:00',
  startTime: '',
  finishTime: '',
  pace: '',
  city: '',
  team: '',
  diff: '',
  cp1: '',
  cp2: '',
  cp1Cp2: '',
  netRanking: 1,
  itemNetRank: 1,
  ageNetRank: 1,
  age2NetRank: null
};

describe('fitFontSize', () => {
  const measureAt = (perPx: number) => (size: number) => size * perPx;

  it('returns the original size when the text already fits', () => {
    expect(fitFontSize(100, 6, measureAt(1), 200)).toBe(100);
  });

  it('shrinks proportionally to the available width', () => {
    // 100px * 10 = 1000px wide, max 250 -> 25px
    expect(fitFontSize(100, 6, measureAt(10), 250)).toBe(25);
  });

  it('never goes below the minimum size', () => {
    expect(fitFontSize(100, 8, measureAt(1000), 50)).toBe(8);
  });

  it('ignores the constraint when maxWidth is disabled', () => {
    expect(fitFontSize(120, 6, measureAt(100), 0)).toBe(120);
  });
});

describe('fonts catalog', () => {
  it('resolves stacks and weights for every entry', () => {
    for (const font of CERTIFICATE_FONTS) {
      expect(certificateFontStack(font.id)).toBe(font.stack);
      expect(font.weights.length).toBeGreaterThan(0);
      expect(nearestWeight(font, 400)).toBeTypeOf('number');
    }
  });

  it('snaps a requested weight to the closest shipped weight', () => {
    const greatVibes = findCertificateFont('great-vibes');

    expect(greatVibes.weights).toEqual([400]);
    expect(nearestWeight(greatVibes, 700)).toBe(400);
    expect(nearestWeight(findCertificateFont('inter'), 500)).toBe(400);
  });

  it('falls back to the first catalog entry for an unknown id', () => {
    expect(findCertificateFont('nope').id).toBe(CERTIFICATE_FONTS[0].id);
  });

  it('builds a CSS font shorthand including italic and weight', () => {
    expect(fontShorthand(styleDefaults(48, { font: 'cinzel', weight: 700 }), 48)).toBe(
      `700 48px ${certificateFontStack('cinzel')}`
    );
    expect(fontShorthand(styleDefaults(48, { font: 'playfair-display', italic: true }), 20)).toBe(
      `italic 700 20px ${certificateFontStack('playfair-display')}`
    );
  });
});

describe('lineWidth', () => {
  const fakeContext = (per: number) =>
    ({ measureText: (text: string) => ({ width: text.length * per }) }) as unknown as CanvasRenderingContext2D;

  it('measures a plain line', () => {
    expect(lineWidth(fakeContext(10), 'abc', 0)).toBe(30);
  });

  it('adds the letter spacing between characters only', () => {
    // 3 chars * 10 + 2 gaps * 5
    expect(lineWidth(fakeContext(10), 'abc', 5)).toBe(40);
  });

  it('returns zero for an empty line', () => {
    expect(lineWidth(fakeContext(10), '', 4)).toBe(0);
  });
});

describe('defaults', () => {
  it('creates a disabled config with the given template size', () => {
    const config = emptyCertificateConfig('dahana-run-2026', meta, 1200, 800, 'certificate.png');

    expect(config).toMatchObject({
      version: 1,
      slug: 'dahana-run-2026',
      enabled: false,
      onlyFinishers: true,
      template: 'certificate.png',
      width: 1200,
      height: 800,
      pdf: { size: 'template' }
    });
    expect(config.fields).toEqual([]);
  });

  it('seeds a layout that stays inside the template', () => {
    const fields = defaultLayout(2000, 1400);

    expect(fields.length).toBeGreaterThanOrEqual(8);

    for (const field of fields) {
      expect(field.x).toBeGreaterThanOrEqual(0);
      expect(field.x).toBeLessThanOrEqual(2000);
      expect(field.y).toBeGreaterThanOrEqual(0);
      expect(field.y).toBeLessThanOrEqual(1400);
      expect(field.style.size).toBeGreaterThan(0);
    }

    expect(new Set(fields.map((field) => field.id)).size).toBe(fields.length);
  });
});

describe('certificateFileName', () => {
  it('builds a safe file name from the slug and bib', () => {
    const config = emptyCertificateConfig('Dahana Run/2026', meta);

    expect(certificateFileName(config, participant, 'png')).toBe('sertifikat-Dahana-Run-2026-1042.png');
  });

  it('falls back to the participant id when there is no bib', () => {
    const config = emptyCertificateConfig('jember-10k', meta);

    expect(certificateFileName(config, { ...participant, bib: '' }, 'pdf')).toBe(
      'sertifikat-jember-10k-42.pdf'
    );
  });
});

describe('renderCertificate', () => {
  it('rasterises a blank template at the configured aspect ratio', () => {
    const config: CertificateConfig = {
      ...emptyCertificateConfig('jember-10k', meta, 1200, 800),
      enabled: true,
      fields: defaultLayout(1200, 800)
    };

    const canvas = renderCertificate(config, participant, meta, null, { maxWidth: 600 });

    expect(canvas.width).toBe(600);
    expect(canvas.height).toBe(400);
  });

  it('clamps the rasterisation to the maximum render width', () => {
    const config = emptyCertificateConfig('jember-10k', meta, 4000, 2000);

    const canvas = renderCertificate(config, participant, meta, null, { maxWidth: MAX_RENDER_WIDTH });

    expect(canvas.width).toBe(MAX_RENDER_WIDTH);
    expect(canvas.height).toBe(MAX_RENDER_WIDTH / 2);
  });
});

/**
 * jsdom has no rasteriser, so these tests record the drawing calls instead.
 * They guard the exact regression that made the admin board look blank: the
 * uploaded artwork must be composited onto the canvas, over the background and
 * under the text.
 */
describe('renderCertificate compositing', () => {
  interface Call {
    name: string;
    args: unknown[];
  }

  function recordContext() {
    const calls: Call[] = [];
    const record = (name: string) =>
      (...args: unknown[]) => {
        calls.push({ name, args });
      };

    const ctx = {
      canvas: { width: 0, height: 0 },
      font: '',
      fillStyle: '',
      textAlign: '',
      textBaseline: '',
      save: record('save'),
      restore: record('restore'),
      scale: record('scale'),
      translate: record('translate'),
      rotate: record('rotate'),
      fillRect: record('fillRect'),
      drawImage: record('drawImage'),
      fillText: record('fillText'),
      measureText: (text: string) => ({ width: String(text).length * 10 })
    } as unknown as CanvasRenderingContext2D;

    return { ctx, calls };
  }

  it('draws the template artwork between the background and the text', () => {
    const { ctx, calls } = recordContext();
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

    const config: CertificateConfig = {
      ...emptyCertificateConfig('jember-10k', meta, 1000, 500),
      enabled: true,
      fields: [
        {
          id: 'name',
          type: 'token',
          token: 'name',
          text: null,
          prefix: '',
          suffix: '',
          x: 500,
          y: 250,
          align: 'center',
          style: styleDefaults(60, { font: 'cinzel' })
        }
      ]
    };

    const template = { width: 1000, height: 500 } as unknown as CanvasImageSource;

    renderCertificate(config, participant, meta, template, { maxWidth: 1000 });

    const names = calls.map((call) => call.name);

    expect(names[0]).toBe('fillRect');
    expect(names).toContain('drawImage');

    const image = calls.find((call) => call.name === 'drawImage');
    expect(image?.args[0]).toBe(template);
    expect(image?.args.slice(1)).toEqual([0, 0, 1000, 500]);

    expect(names.indexOf('drawImage')).toBeLessThan(names.indexOf('fillText'));

    const text = calls.find((call) => call.name === 'fillText');
    expect(text?.args[0]).toBe(participant.name);

    spy.mockRestore();
  });

  it('fills the background even when the template image failed to load', () => {
    const { ctx, calls } = recordContext();
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(ctx);

    const config = { ...emptyCertificateConfig('jember-10k', meta, 800, 400), background: '#f5f5f5' };

    renderCertificate(config, participant, meta, null, { maxWidth: 800 });

    expect(calls.map((call) => call.name)).toEqual(['fillRect']);
    expect(calls[0].args).toEqual([0, 0, 800, 400]);

    spy.mockRestore();
  });
});
