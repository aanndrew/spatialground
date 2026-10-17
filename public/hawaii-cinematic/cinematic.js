(() => {
  const reveals = [...document.querySelectorAll('.reveal')];
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.13, rootMargin: '0px 0px -7% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  const stage = document.querySelector('[data-lens-stage]');
  if (stage) {
    const maps = [...stage.querySelectorAll('.lens-map')];
    const buttons = [...stage.querySelectorAll('[data-view-target]')];

    const activate = (name) => {
      maps.forEach((map) => map.classList.toggle('active', map.dataset.view === name));
      buttons.forEach((button) => {
        const active = button.dataset.viewTarget === name;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', String(active));
      });
    };

    buttons.forEach((button) => {
      button.addEventListener('click', () => activate(button.dataset.viewTarget));
    });
  }

  const back = document.querySelector('.back-float');
  let timer;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (!back) return;
    const y = window.scrollY;
    if (Math.abs(y - lastY) < 1) return;
    lastY = y;
    back.classList.add('is-scrolling');
    clearTimeout(timer);
    timer = setTimeout(() => back.classList.remove('is-scrolling'), 760);
  }, { passive: true });
})();
