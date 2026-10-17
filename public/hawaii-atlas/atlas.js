(() => {
  const tabs = [...document.querySelectorAll('.map-tab')];
  const layers = [...document.querySelectorAll('.map-layer')];
  const title = document.querySelector('#map-title');
  const caption = document.querySelector('#map-caption');
  const plate = document.querySelector('#map-plate-label');
  const dialog = document.querySelector('#map-dialog');
  const dialogImage = document.querySelector('#dialog-map-image');
  const dialogLabel = document.querySelector('#dialog-map-label');
  const dialogTitle = document.querySelector('#dialog-map-title');

  const layerSrc = {
    overview: '/lava-risk/assets/main-map.jpg',
    zones: '/lava-risk/assets/high-risk-map.jpg',
    infrastructure: '/lava-risk/assets/infrastructure-map.jpg'
  };

  function activateTab(tab) {
    const name = tab.dataset.map;
    tabs.forEach((item) => {
      const active = item === tab;
      item.classList.toggle('active', active);
      item.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    layers.forEach((layer) => layer.classList.toggle('active', layer.dataset.mapLayer === name));
    if (title) title.textContent = tab.dataset.title || 'Map view';
    if (caption) caption.textContent = tab.dataset.caption || '';
    if (plate) plate.textContent = `PLATE 0${tabs.indexOf(tab) + 1}`;
  }

  tabs.forEach((tab) => tab.addEventListener('click', () => activateTab(tab)));

  const openButton = document.querySelector('[data-open-map]');
  if (openButton && dialog && typeof dialog.showModal === 'function') {
    openButton.addEventListener('click', () => {
      const activeTab = tabs.find((item) => item.classList.contains('active')) || tabs[0];
      const name = activeTab?.dataset.map || 'overview';
      if (dialogImage) dialogImage.src = layerSrc[name];
      if (dialogLabel) dialogLabel.textContent = `PLATE 0${tabs.indexOf(activeTab) + 1}`;
      if (dialogTitle) dialogTitle.textContent = activeTab?.dataset.title || 'Map view';
      dialog.showModal();
    });
  }

  document.querySelector('[data-close-map]')?.addEventListener('click', () => dialog?.close());
  dialog?.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  const back = document.querySelector('.back-float');
  let timer;
  let lastY = window.scrollY;
  window.addEventListener('scroll', () => {
    if (!back) return;
    const currentY = window.scrollY;
    if (Math.abs(currentY - lastY) < 1) return;
    lastY = currentY;
    back.classList.add('is-scrolling');
    clearTimeout(timer);
    timer = setTimeout(() => back.classList.remove('is-scrolling'), 760);
  }, { passive: true });
})();
