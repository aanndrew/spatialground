/**
 * Environmental Watch V1.6.10.2 public-module loader.
 *
 * Vite refuses dynamic import() of .mjs files in /public from TS source,
 * even with @vite-ignore in certain Vite versions. Load a *public* bridge
 * using a native <script type="module" src="...">, which is outside
 * Vite's TS import graph. The bridge uses native ESM to load the exact
 * independent MapLibre runtime copied from Hawaiʻi Lava Risk.
 *
 * This helper does not modify Hawaiʻi files or import the MapLibre JS
 * module from TypeScript. Types are imported only for compile-time use.
 */
import type * as ML from 'maplibre-gl';
type API = typeof ML;
type EWWindow = Window & {
  __EW_MAPLIBRE_API__?: API;
  __EW_MAPLIBRE_ERROR__?: string;
};

const root = '/environmental-watch/';
const cssURL = root + 'vendor/maplibre/maplibre-gl.css';
const bridgeURL = root + 'ew-maplibre-bridge.mjs';
let pending: Promise<API> | null = null;
let stylesheet: Promise<void> | null = null;

function loadCss(): Promise<void> {
  if (stylesheet) return stylesheet;
  stylesheet = new Promise<void>((resolve, reject) => {
    const el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = cssURL;
    el.dataset.ewStandaloneMapCss = 'true';
    el.onload = () => resolve();
    el.onerror = () => reject(new Error('Environmental Watch MapLibre CSS could not load: ' + cssURL));
    document.head.appendChild(el);
  }).catch((err) => {
    stylesheet = null;
    throw err;
  });
  return stylesheet;
}

function loadViaScript(): Promise<API> {
  const w = window as EWWindow;
  if (w.__EW_MAPLIBRE_API__) return Promise.resolve(w.__EW_MAPLIBRE_API__);

  return new Promise<API>((resolve, reject) => {
    let settled = false;
    const cleanup = () => {
      window.removeEventListener('ew-maplibre-ready', ready);
      window.removeEventListener('ew-maplibre-error', failed);
      clearTimeout(timeout);
    };
    const finish = (err?: Error, api?: API) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (err) reject(err);
      else if (api) resolve(api);
      else reject(new Error('Environmental Watch MapLibre bridge returned no API'));
    };
    const ready = () => {
      const api = w.__EW_MAPLIBRE_API__;
      if (api && typeof api.Map === 'function' && typeof api.Marker === 'function') finish(undefined, api);
      else finish(new Error('MapLibre bridge loaded, but did not export Map and Marker'));
    };
    const failed = () => finish(new Error(w.__EW_MAPLIBRE_ERROR__ || 'Independent MapLibre module could not be loaded'));
    const timeout = setTimeout(() => finish(new Error('Independent MapLibre module timed out after 15s')), 15000);

    window.addEventListener('ew-maplibre-ready', ready);
    window.addEventListener('ew-maplibre-error', failed);
    // This is intentionally a native HTML script reference, not import().
    const script = document.createElement('script');
    script.type = 'module';
    script.src = bridgeURL;
    script.dataset.ewMaplibreBridge = 'true';
    script.onerror = () => finish(new Error('Unable to load public MapLibre bridge: ' + bridgeURL));
    document.head.appendChild(script);
  });
}

export function loadEwMapLibre(): Promise<API> {
  if (pending) return pending;
  pending = Promise.all([loadCss(), loadViaScript()])
    .then(([,api]) => api)
    .catch((err) => {
      pending = null;
      throw err;
    });
  return pending;
}
