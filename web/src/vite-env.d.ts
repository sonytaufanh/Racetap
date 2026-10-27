/// <reference types="vite/client" />

declare module 'bootstrap/dist/js/bootstrap.bundle.min.js';

interface RacetapPayload {
  baseUrl: string;
  apiUrl: string;
  basename: string;
  initialPath: string;
  appName: string;
}

interface Window {
  __RACETAP__?: RacetapPayload;
}
