(() => {
  const revealEls = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.14, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  const steps = [...document.querySelectorAll('.story-step')];
  const maps = [...document.querySelectorAll('.scrolly-map')];
  const stateTitle = document.querySelector('#map-state-title');

  const activateStep = (step) => {
    const mapName = step.dataset.map;
    steps.forEach((s) => s.classList.toggle('active', s === step));
    maps.forEach((map) => {
      const active = map.dataset.map === mapName;
      map.classList.toggle('active', active);
      map.classList.toggle('zoomed', active && step.dataset.zoom === 'true');
    });
    if (stateTitle) stateTitle.textContent = step.dataset.title || 'Map view';
  };

  if ('IntersectionObserver' in window && steps.length) {
    const stepObserver = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) activateStep(visible[0].target);
    }, { threshold: [0.35, 0.5, 0.65], rootMargin: '-18% 0px -24% 0px' });
    steps.forEach((step) => stepObserver.observe(step));
  }

  const back = document.querySelector('.back-float');
  let backTimer;
  let backLastY = window.scrollY;
  const updateBack = () => {
    if (!back) return;
    const y = window.scrollY;
    const moving = Math.abs(y - backLastY) > 1;
    backLastY = y;
    if (!moving) return;
    back.classList.add('is-scrolling');
    clearTimeout(backTimer);
    backTimer = setTimeout(() => back.classList.remove('is-scrolling'), 760);
  };
  window.addEventListener('scroll', updateBack, { passive: true });

  const nav = document.querySelector('.fusion-nav');
  let navLastY = Math.max(0, window.scrollY);
  let navTicking = false;
  const updateNav = () => {
    navTicking = false;
    if (!nav) return;
    const y = Math.max(0, window.scrollY);
    const delta = y - navLastY;
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
    navLastY = y;
  };
  window.addEventListener('scroll', () => {
    if (!navTicking) {
      navTicking = true;
      window.requestAnimationFrame(updateNav);
    }
  }, { passive: true });

  // Basic deterrence only; browser tools and screenshots can still access public assets.
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
})();
