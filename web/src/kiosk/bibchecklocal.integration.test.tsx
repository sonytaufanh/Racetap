// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import KioskApp from './KioskApp';
import type { KioskPayload } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Runs the real `bibchecklocal.racetap.id` configuration (the variant that
 * differs most from the others) against its real data.csv, forcing the local
 * data source so the test stays offline.
 */
const instanceDir = 'bibchecklocal.racetap.id';
const repoRoot = path.resolve(process.cwd(), '..');
const setting = JSON.parse(
  readFileSync(path.join(repoRoot, instanceDir, 'setting-bibresult.json'), 'utf8')
) as Record<string, unknown>;

const csv = readFileSync(path.join(repoRoot, instanceDir, 'data.csv'), 'utf8');

const firstDataLine = csv.split(/\r?\n/)[1] || '';
const [firstItem, firstBib, firstName] = firstDataLine.split(',');

const payload: KioskPayload = {
  mode: 'kiosk',
  configUrl: `setting-bibresult.json`,
  assetBase: './',
  dataSource: 'local'
};

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as unknown as Response;
}

function textResponse(body: string): Response {
  return { ok: true, status: 200, text: async () => body } as unknown as Response;
}

function pressBib(value: string): void {
  for (const char of value) {
    act(() => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: char, bubbles: true }));
    });
  }

  act(() => {
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  });
}

describe('bibchecklocal real configuration', () => {
  let container: HTMLDivElement;
  let root: Root;

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  });

  it('loads the shipped CSV and shows the matching participant', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          String(url).includes('setting-') ? jsonResponse(setting) : textResponse(csv)
        )
      )
    );

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<KioskApp payload={payload} />);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(firstBib).toBeTruthy();
    expect(Number(container.querySelector('.rt-kiosk')?.getAttribute('data-db-keys'))).toBeGreaterThan(0);

    pressBib(firstBib);

    const layers = Array.from(container.querySelectorAll('.overlay .text-layer')).map((node) =>
      (node.textContent || '').trim()
    );

    expect(layers).toContain(firstName.trim());
    expect(layers).toContain(firstBib.trim());
    expect(layers).toContain(firstItem.trim());
  });

  it('keeps the configured static text fields out of the way until a match', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) =>
        Promise.resolve(
          String(url).includes('setting-') ? jsonResponse(setting) : textResponse(csv)
        )
      )
    );

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    act(() => {
      root.render(<KioskApp payload={payload} />);
    });

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const overlay = container.querySelector('.overlay') as HTMLElement;

    expect(overlay.style.display).toBe('none');
  });
});
