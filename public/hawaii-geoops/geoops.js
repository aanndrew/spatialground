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
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    reveals.forEach((el) => io.observe(el));
  } else {
    reveals.forEach((el) => el.classList.add('in'));
  }

  const board = document.querySelector('[data-ops-board]');
  if (board) {
    const maps = [...board.querySelectorAll('[data-ops-view]')];
    const buttons = [...board.querySelectorAll('[data-ops-target]')];
    const intel = [...board.querySelectorAll('[data-intel]')];

    const activate = (name) => {
      maps.forEach((el) => el.classList.toggle('active', el.dataset.opsView === name));
      intel.forEach((el) => el.classList.toggle('active', el.dataset.intel === name));
      buttons.forEach((button) => {
        const active = button.dataset.opsTarget === name;
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', String(active));
      });
    };

    buttons.forEach((button) => button.addEventListener('click', () => activate(button.dataset.opsTarget)));
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
