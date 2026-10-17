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

  // -----------------------------
  // Current Explorer framework
  // -----------------------------
  const mapEl = document.querySelector('#current-explorer-map');
  const selectedLocation = document.querySelector('#selected-location');
  const selectedCoordinates = document.querySelector('#selected-coordinates');
  const hazardResult = document.querySelector('#hazard-result');
  const hospitalResult = document.querySelector('#hospital-result');
  const fireResult = document.querySelector('#fire-result');
  const statusEl = document.querySelector('#explorer-status');
  const searchInput = document.querySelector('#explorer-search');
  const searchButton = document.querySelector('#explorer-search-button');
  const locationButton = document.querySelector('#explorer-location-button');

  let explorerMap = null;
  let selectedMarker = null;

  const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
  };

  const resetPendingResults = () => {
    if (hazardResult) hazardResult.textContent = 'Point selected · USGS layer connection pending';
    if (hospitalResult) hospitalResult.textContent = 'Point selected · hospital data connection pending';
    if (fireResult) fireResult.textContent = 'Point selected · fire-station data connection pending';
  };

  const formatCoord = (value) => Number(value).toFixed(5);

  const selectPoint = (lng, lat, sourceLabel = 'Selected map point') => {
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;
    if (selectedLocation) selectedLocation.textContent = sourceLabel;
    if (selectedCoordinates) selectedCoordinates.textContent = `${formatCoord(lat)}°, ${formatCoord(lng)}°`;
    resetPendingResults();

    if (explorerMap && window.maplibregl) {
      if (!selectedMarker) {
        const markerNode = document.createElement('div');
        markerNode.className = 'explorer-marker';
        markerNode.setAttribute('aria-hidden', 'true');
        selectedMarker = new window.maplibregl.Marker({ element: markerNode, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(explorerMap);
      } else {
        selectedMarker.setLngLat([lng, lat]);
      }
    }
    setStatus('Location selected. Current data layers are not connected in this framework preview.');
  };

  if (mapEl && window.maplibregl) {
    try {
      explorerMap = new window.maplibregl.Map({
        container: mapEl,
        style: 'https://tiles.openfreemap.org/styles/liberty',
        center: [-155.48, 19.62],
        zoom: 7.35,
        minZoom: 6.3,
        maxZoom: 16,
        attributionControl: true
      });
      explorerMap.addControl(new window.maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
      explorerMap.on('click', (event) => {
        const { lng, lat } = event.lngLat;
        selectPoint(lng, lat, 'Selected map point');
      });
      explorerMap.on('load', () => setStatus('Map ready. Click a point to test the explorer framework.'));
      explorerMap.on('error', () => setStatus('Base map could not load. The content preview still works.'));
    } catch (error) {
      setStatus('Interactive base map could not initialize.');
      mapEl.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:30px;color:#c7c1b8;text-align:center;">Interactive-map framework is present, but the external MapLibre/OpenFreeMap resources did not load.</div>';
    }
  } else if (mapEl) {
    setStatus('MapLibre did not load.');
    mapEl.innerHTML = '<div style="display:grid;place-items:center;height:100%;padding:30px;color:#c7c1b8;text-align:center;">Interactive-map framework is present, but MapLibre did not load from the CDN.</div>';
  }

  if (searchButton && searchInput) {
    searchButton.addEventListener('click', () => {
      const query = searchInput.value.trim();
      if (!query) {
        setStatus('Enter an address or place first.');
        searchInput.focus();
        return;
      }
      setStatus('Preview only: Esri geocoding is not connected yet, and this address was not sent anywhere.');
    });
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        searchButton.click();
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
          selectPoint(longitude, latitude, 'Device location');
          if (explorerMap) explorerMap.flyTo({ center: [longitude, latitude], zoom: 12, essential: true });
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

  // Basic deterrence only; browser tools and screenshots can still access public assets.
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
})();
