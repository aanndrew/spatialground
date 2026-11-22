/*
 * SpatialGround - browser-side content interaction deterrent v1
 * This is NOT DRM or a security boundary. Public HTML/assets remain retrievable.
 * Do not break typing, accessibility keyboard focus, or GIS map gestures.
 */
(() => {
  'use strict';
  if (window.__spatialGroundCopyGuardV1) return;
  window.__spatialGroundCopyGuardV1 = true;

  const isEditable = (target) => {
    if (!(target instanceof Element)) return false;
    return !!target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [role="textbox"]');
  };

  // Block ordinary mouse/touch context menus. Keep input field editing usable.
  document.addEventListener('contextmenu', (event) => {
    if (!isEditable(event.target)) event.preventDefault();
  }, { capture: true });

  // Stop normal selected-text copying/cutting throughout the site, including
  // dynamically loaded sections. Do not block text editing in forms.
  for (const eventType of ['copy', 'cut']) {
    document.addEventListener(eventType, (event) => {
      if (!isEditable(event.target)) event.preventDefault();
    }, { capture: true });
  }

  document.addEventListener('keydown', (event) => {
    if (isEditable(event.target)) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey &&
        (event.key.toLowerCase() === 'c' || event.key.toLowerCase() === 'x')) {
      event.preventDefault();
    }
  }, { capture: true });

  // Prevent ordinary dragging/saving through an image drag gesture; this
  // leaves MapLibre pointer dragging, zoom and pan behaviour intact.
  document.addEventListener('dragstart', (event) => {
    if (isEditable(event.target)) return;
    const target = event.target;
    if (target instanceof Element && target.closest('img, picture, a')) {
      event.preventDefault();
    }
  }, { capture: true });
})();
