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

  function activateStep(step) {
    const mapName = step.dataset.map;
    steps.forEach((s) => s.classList.toggle('active', s === step));
    maps.forEach((map) => {
      const active = map.dataset.map === mapName;
      map.classList.toggle('active', active);
      map.classList.toggle('zoomed', active && step.dataset.zoom === 'true');
    });
    if (stateTitle) stateTitle.textContent = step.dataset.title || 'Map view';
  }

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
  let timer;
  let lastY = window.scrollY;
  const updateBack = () => {
    if (!back) return;
    const y = window.scrollY;
    const moving = Math.abs(y - lastY) > 1;
    lastY = y;
    if (!moving) return;
    back.classList.add('is-scrolling');
    clearTimeout(timer);
    timer = setTimeout(() => back.classList.remove('is-scrolling'), 760);
  };
  window.addEventListener('scroll', updateBack, { passive: true });
})();
