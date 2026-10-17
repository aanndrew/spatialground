(() => {
  const steps = [...document.querySelectorAll('.story-step')];
  const layers = [...document.querySelectorAll('.map-layer')];
  const dots = [...document.querySelectorAll('.rail-dot')];
  const mapStage = document.querySelector('.map-stage');
  const mapTitle = document.querySelector('#map-title');
  const mapCaption = document.querySelector('#map-caption');
  const mapStatus = document.querySelector('#map-status');
  const stepCounter = document.querySelector('#step-counter');

  if (!steps.length || !mapStage) return;

  const chapters = [
    {
      layer: 'overview',
      title: 'Island overview',
      caption: 'Island-wide hazard zones, parcels, major roads, and volcanoes.',
      status: 'Long-term hazard context'
    },
    {
      layer: 'highrisk',
      title: 'Zones 1 & 2',
      caption: 'The map narrows to the island’s two highest lava-flow hazard classifications.',
      status: 'Hazard focus'
    },
    {
      layer: 'parcels',
      title: 'Parcel exposure',
      caption: 'Parcel features intersecting Zones 1 and 2 become the analytical focus.',
      status: '24,528 parcel features'
    },
    {
      layer: 'infrastructure',
      title: 'Infrastructure context',
      caption: 'Roads and selected emergency-service locations add a planning dimension.',
      status: 'Planning context'
    }
  ];

  let activeIndex = -1;

  function activate(index) {
    const next = Math.max(0, Math.min(index, chapters.length - 1));
    if (next === activeIndex) return;
    activeIndex = next;
    const chapter = chapters[next];

    mapStage.dataset.activeStep = String(next);
    steps.forEach((step, i) => step.classList.toggle('is-active', i === next));
    dots.forEach((dot, i) => {
      const active = i === next;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-current', active ? 'step' : 'false');
    });
    layers.forEach(layer => layer.classList.toggle('is-active', layer.dataset.layer === chapter.layer));

    mapTitle.textContent = chapter.title;
    mapCaption.textContent = chapter.caption;
    mapStatus.textContent = chapter.status;
    stepCounter.textContent = `${String(next + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
  }

  const observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
    if (!visible.length) return;
    activate(Number(visible[0].target.dataset.step));
  }, {
    root: null,
    rootMargin: '-34% 0px -42% 0px',
    threshold: [0, .2, .45, .7, 1]
  });

  steps.forEach(step => {
    observer.observe(step);
    step.addEventListener('focus', () => activate(Number(step.dataset.step)));
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      const index = Number(dot.dataset.targetStep);
      steps[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      activate(index);
    });
  });

  activate(0);
})();
