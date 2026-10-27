/**
 * Loaded by <script type="module" src="/environmental-watch/ew-maplibre-bridge.mjs">.
 * This file lives in /public and is served untransformed by Astro/Vite.
 * Its sibling MapLibre module is also in /public; both are browser-native ESM.
 */
import * as maplibre from './vendor/maplibre/maplibre-gl.mjs';

try {
  if (typeof maplibre.setWorkerUrl === 'function') {
    maplibre.setWorkerUrl('/environmental-watch/vendor/maplibre/maplibre-gl-worker.mjs');
  }
  window.__EW_MAPLIBRE_API__ = maplibre;
  window.dispatchEvent(new Event('ew-maplibre-ready'));
} catch (error) {
  window.__EW_MAPLIBRE_ERROR__ = error instanceof Error ? error.message : String(error);
  window.dispatchEvent(new Event('ew-maplibre-error'));
}
