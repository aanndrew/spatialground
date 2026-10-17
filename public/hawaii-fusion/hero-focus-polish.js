(() => {
  // Header behavior: visible at top, hide on downward reading, reveal on upward movement.
  const nav = document.querySelector('.fusion-nav');
  let lastY = Math.max(0, window.scrollY);
  let ticking = false;

  const updateNav = () => {
    ticking = false;
    if (!nav) return;

    const y = Math.max(0, window.scrollY);
    const delta = y - lastY;

    if (y < 80) {
      nav.classList.remove('nav-hidden');
      nav.classList.add('nav-visible');
    } else if (delta > 8) {
      nav.classList.add('nav-hidden');
      nav.classList.remove('nav-visible');
    } else if (delta < -8) {
      nav.classList.remove('nav-hidden');
      nav.classList.add('nav-visible');
    }

    lastY = y;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(updateNav);
    }
  }, { passive: true });

  // Lightweight deterrence only: browsers/devtools/screenshots can still access assets.
  document.addEventListener('contextmenu', (event) => {
    event.preventDefault();
  });

  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
})();
