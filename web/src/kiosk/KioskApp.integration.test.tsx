// @vitest-environment jsdom
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import KioskApp from './KioskApp';
import type { KioskPayload } from './types';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const payload: KioskPayload = {
  mode: 'kiosk',
  configUrl: 'setting-bibcheck.json',
  assetBase: './'
};

const setting = {
  eventName: 'RACETAP.ID - TEST',
  background: 'bg.png',
  dataSource: 'local',
  localFile: 'data.csv',
  refreshInterval: 999999,
  resetTime: 40000,
  notFoundTime: 2500,
  enableFullscreen: false,
  enableWakeLock: false,
  uppercaseOnly: true,
  notFoundText: 'DATA TIDAK DITEMUKAN',
  genderMapping: { enabled: true, map: { M: 'MALE', F: 'FEMALE' } },
  categoryBackground: {
    enabled: true,
    source: 'Item',
    map: { '5K': 'bg5k.png' }
  },
  status: { top: '50%', left: '50%', width: '1000px', fontSize: '40px', color: '#ff0000' },
  fields: {
    name: { source: 'Name', enabled: true, top: '560px', left: '50%', width: '1200px', fontSize: '55px' },
    bib: { source: 'Bib', enabled: true, top: '260px', left: '50%', width: '900px', fontSize: '230px' },
    item: { source: 'Item', enabled: true, top: '220px', left: '50%', width: '700px', fontSize: '90px' },
    congratulation: { source: '', staticText: 'KUDOS!', enabled: true, top: '40px', left: '50%', width: '900px' }
  },
  standbyText: {
    enabled: true,
    text: 'BIB CHECKING',
    top: '50%',
    left: '50%',
    width: '1400px',
    fontSize: '120px',
    blinkSpeed: 1
  }
};

const csv = ['Item;Bib;Name;Gender', '5K;80026;Doimirza;M', '10K;1002;Nova Harys;F'].join('\n');

function jsonResponse(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    json: async () => body,
    text: async () => JSON.stringify(body)
  } as unknown as Response;
}

function textResponse(body: string): Response {
  return {
    ok: true,
    status: 200,
    json: async () => JSON.parse(body),
    text: async () => body
  } as unknown as Response;
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

function mount(container: HTMLElement): Root {
  const root = createRoot(container);

  act(() => {
    root.render(<KioskApp payload={payload} />);
  });

  return root;
}

async function flush(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('KioskApp integration', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn((url: string) => {
        if (String(url).includes('setting-bibcheck.json')) {
          return Promise.resolve(jsonResponse(setting));
        }

        return Promise.resolve(textResponse(csv));
      })
    );

    container = document.createElement('div');
    document.body.appendChild(container);
    root = mount(container);
    await flush();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('shows the standby text and keeps the overlay hidden', () => {
    const standby = container.querySelector('.text-layer');

    expect(standby?.textContent).toBe('BIB CHECKING');
    expect(standby?.className).toContain('blink');
    expect((container.querySelector('.overlay') as HTMLElement).style.display).toBe('none');
  });

  it('loads the local CSV and exposes the indexed rows', () => {
    expect(container.querySelector('.rt-kiosk')?.getAttribute('data-db-keys')).toBe('2');
  });

  it('reveals the participant on a matching scan', () => {
    pressBib('80026');

    const overlay = container.querySelector('.overlay') as HTMLElement;
    const layers = Array.from(container.querySelectorAll('.overlay .text-layer')).map(
      (node) => node.textContent
    );

    expect(overlay.style.display).toBe('block');
    expect(layers).toContain('Doimirza');
    expect(layers).toContain('80026');
    expect(layers).toContain('5K');
    expect(layers).toContain('KUDOS!');
  });

  it('switches the background to the participant category', () => {
    pressBib('80026');

    const kiosk = container.querySelector('.rt-kiosk') as HTMLElement;

    expect(kiosk.style.backgroundImage).toContain('bg5k.png');
  });

  it('shows the not-found message for an unknown scan', () => {
    pressBib('999999');

    const overlay = container.querySelector('.overlay') as HTMLElement;
    const status = container.querySelector('.overlay .text-layer') as HTMLElement;

    expect(overlay.style.display).toBe('block');
    expect(status.textContent).toBe('DATA TIDAK DITEMUKAN');
  });

  it('ignores an empty scan without touching the display', () => {
    act(() => {
      document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    });

    expect((container.querySelector('.overlay') as HTMLElement).style.display).toBe('none');
  });
});
