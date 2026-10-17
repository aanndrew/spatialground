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
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
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

  // ---------------------------------------------------------
  // Current Explorer — self-contained interface demo.
  // This preview intentionally does NOT pretend to query a
  // live USGS hazard layer or calculate nearest facilities.
  // It demonstrates the interaction and information hierarchy.
  // ---------------------------------------------------------
  const mapEl = document.querySelector('#current-explorer-map');
  const selectedLocation = document.querySelector('#selected-location');
  const selectedCoordinates = document.querySelector('#selected-coordinates');
  const hazardResult = document.querySelector('#hazard-result');
  const hazardNote = document.querySelector('#hazard-note');
  const hospitalResult = document.querySelector('#hospital-result');
  const hospitalNote = document.querySelector('#hospital-note');
  const fireResult = document.querySelector('#fire-result');
  const fireNote = document.querySelector('#fire-note');
  const statusEl = document.querySelector('#explorer-status');
  const searchInput = document.querySelector('#explorer-search');
  const searchButton = document.querySelector('#explorer-search-button');
  const locationButton = document.querySelector('#explorer-location-button');
  const customMarker = document.querySelector('#custom-demo-marker');
  const presetControls = [...document.querySelectorAll('[data-demo-location]')];

  const demoLocations = {
    hilo: {
      label: 'Hilo',
      hospital: 'Hilo Benioff Medical Center',
      fire: 'Central Station 1 · Hilo'
    },
    pahoa: {
      label: 'Pāhoa',
      hospital: 'Hilo Benioff Medical Center',
      fire: 'Pāhoa Station 10'
    },
    kona: {
      label: 'Kailua-Kona',
      hospital: 'Kona Community Hospital',
      fire: 'Kailua Station 7'
    },
    volcano: {
      label: 'Volcano',
      hospital: 'Kaʻū Hospital',
      fire: 'Volcano Station 19'
    },
    oceanview: {
      label: 'Ocean View',
      hospital: 'Kona Community Hospital',
      fire: 'Ocean View Estates Station 20'
    }
  };

  const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
  };

  const clearPresetActive = () => {
    presetControls.forEach((el) => el.classList.remove('is-active'));
  };

  const activatePreset = (key) => {
    const data = demoLocations[key];
    if (!data) return;

    clearPresetActive();
    presetControls
      .filter((el) => el.dataset.demoLocation === key)
      .forEach((el) => el.classList.add('is-active'));

    if (customMarker) customMarker.classList.remove('is-visible');
    if (selectedLocation) selectedLocation.textContent = `${data.label} — interface sample`;
    if (selectedCoordinates) selectedCoordinates.textContent = 'Preset preview location · final version will use geocoded coordinates';
    if (hazardResult) hazardResult.textContent = 'USGS zone query will appear here';
    if (hazardNote) hazardNote.textContent = 'Hazard value is deliberately not guessed in this preview.';
    if (hospitalResult) hospitalResult.textContent = data.hospital;
    if (hospitalNote) hospitalNote.textContent = 'Source-verified facility label for the interface preview · final explorer will calculate the actual nearest hospital and straight-line distance.';
    if (fireResult) fireResult.textContent = data.fire;
    if (fireNote) fireNote.textContent = 'Source-verified station label for the interface preview · final explorer will calculate the actual nearest fire station and straight-line distance.';
    setStatus(`${data.label} sample loaded. Facility labels are examples; distance and hazard queries are not yet connected.`);
  };

  presetControls.forEach((control) => {
    control.addEventListener('click', (event) => {
      event.stopPropagation();
      activatePreset(control.dataset.demoLocation);
    });
  });

  if (mapEl) {
    mapEl.addEventListener('click', (event) => {
      if (event.target.closest('[data-demo-location]')) return;
      const rect = mapEl.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));

      clearPresetActive();
      if (customMarker) {
        customMarker.style.left = `${(x * 100).toFixed(2)}%`;
        customMarker.style.top = `${(y * 100).toFixed(2)}%`;
        customMarker.classList.add('is-visible');
      }
      if (selectedLocation) selectedLocation.textContent = 'Custom map point — interface preview';
      if (selectedCoordinates) selectedCoordinates.textContent = `Preview position ${Math.round(x * 100)}% east · ${Math.round(y * 100)}% down the demo map`;
      if (hazardResult) hazardResult.textContent = 'Final USGS polygon query will appear here';
      if (hazardNote) hazardNote.textContent = 'No hazard-zone value is inferred from the background image.';
      if (hospitalResult) hospitalResult.textContent = 'Nearest-hospital calculation will appear here';
      if (hospitalNote) hospitalNote.textContent = 'The production explorer will calculate straight-line distance from the selected geographic coordinate.';
      if (fireResult) fireResult.textContent = 'Nearest-station calculation will appear here';
      if (fireNote) fireNote.textContent = 'The production explorer will use the Hawaiʻi County Fire Department station dataset.';
      setStatus('Custom point selected. This preview demonstrates the interaction without fabricating a GIS result.');
    });
  }

  if (searchButton && searchInput) {
    const runSearchPreview = () => {
      const query = searchInput.value.trim();
      if (!query) {
        setStatus('Enter a place name first, or try one of the sample buttons.');
        searchInput.focus();
        return;
      }
      const q = query.toLowerCase();
      let key = null;
      if (q.includes('hilo')) key = 'hilo';
      else if (q.includes('pahoa') || q.includes('pāhoa')) key = 'pahoa';
      else if (q.includes('kona') || q.includes('kailua')) key = 'kona';
      else if (q.includes('volcano')) key = 'volcano';
      else if (q.includes('ocean view')) key = 'oceanview';

      if (key) {
        activatePreset(key);
        setStatus('Preview matched a sample place locally. No address was sent to a geocoder.');
      } else {
        setStatus('Address geocoding is intentionally offline in this preview. Try Hilo, Pāhoa, Kailua-Kona, Volcano, or Ocean View.');
      }
    };
    searchButton.addEventListener('click', runSearchPreview);
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        runSearchPreview();
      }
    });
  }

  if (locationButton) {
    locationButton.addEventListener('click', () => {
      if (!('geolocation' in navigator)) {
        setStatus('This browser does not support device geolocation.');
        return;
      }
      locationButton.disabled = true;
      locationButton.textContent = 'Locating…';
      setStatus('Waiting for browser location permission…');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          clearPresetActive();
          if (customMarker) {
            customMarker.style.left = '50%';
            customMarker.style.top = '50%';
            customMarker.classList.add('is-visible');
          }
          if (selectedLocation) selectedLocation.textContent = 'Device location — session only';
          if (selectedCoordinates) selectedCoordinates.textContent = `${latitude.toFixed(5)}°, ${longitude.toFixed(5)}°`;
          if (hazardResult) hazardResult.textContent = 'Final USGS zone query will appear here';
          if (hazardNote) hazardNote.textContent = 'Your coordinates are displayed locally in this session; this preview does not send them to a hazard service.';
          if (hospitalResult) hospitalResult.textContent = 'Nearest-hospital calculation will appear here';
          if (hospitalNote) hospitalNote.textContent = 'Final calculation will run after the authoritative facility layer is connected.';
          if (fireResult) fireResult.textContent = 'Nearest-station calculation will appear here';
          if (fireNote) fireNote.textContent = 'Final calculation will run after the Hawaiʻi County station layer is connected.';
          setStatus('Device coordinates received for this session only. They were not stored by this preview.');
          locationButton.disabled = false;
          locationButton.textContent = 'Use my location';
        },
        (error) => {
          const messages = {
            1: 'Location permission was denied. Nothing was stored.',
            2: 'Your location could not be determined.',
            3: 'Location request timed out.'
          };
          setStatus(messages[error.code] || 'Location request failed.');
          locationButton.disabled = false;
          locationButton.textContent = 'Use my location';
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Start with one visible sample so the explorer never looks empty.
  activatePreset('hilo');

  // Basic deterrence only; browser tools and screenshots can still access public assets.
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
})();
