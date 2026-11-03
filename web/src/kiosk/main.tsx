import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './kiosk.css';
import KioskApp from './KioskApp';
import instancesFile from './instances.json';
import type { KioskPayload } from './types';

interface InstancesFile {
  instances: Array<{ path: string; configUrl: string; dataSource?: 'local' | 'api' }>;
}

function readPayload(): KioskPayload | null {
  const node = document.getElementById('racetap-payload');

  if (node && node.textContent) {
    try {
      return JSON.parse(node.textContent) as KioskPayload;
    } catch {
      return null;
    }
  }

  return null;
}

function devPayload(): KioskPayload | null {
  const params = new URLSearchParams(window.location.search);
  const file = instancesFile as InstancesFile;
  const wanted = params.get('instance');
  const instance =
    file.instances.find((item) => item.path === wanted) ||
    file.instances.find((item) => item.path === 'bibchecklocal.racetap.id') ||
    file.instances[0];

  if (!instance) {
    return null;
  }

  const base = `/kiosk-dev/${encodeURIComponent(instance.path)}/`;

  return {
    mode: 'kiosk',
    configUrl: `${base}${instance.configUrl}`,
    assetBase: base,
    dataSource: instance.dataSource
  };
}

const payload = readPayload() || devPayload();
const root = document.getElementById('root');

if (root) {
  if (!payload) {
    root.textContent = 'Konfigurasi kiosk tidak ditemukan.';
  } else {
    createRoot(root).render(
      <StrictMode>
        <KioskApp payload={payload} />
      </StrictMode>
    );
  }
}
