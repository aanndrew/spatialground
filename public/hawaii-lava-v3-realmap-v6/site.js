(async () => {
  // ---------------------------------------------------------
  // Shared page interactions
  // ---------------------------------------------------------
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
  window.addEventListener('scroll', () => {
    if (!back) return;
    const y = window.scrollY;
    if (Math.abs(y - backLastY) < 2) return;
    backLastY = y;
    back.classList.add('is-scrolling');
    clearTimeout(backTimer);
    backTimer = setTimeout(() => back.classList.remove('is-scrolling'), 760);
  }, { passive: true });

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
  // Current Explorer — real geographic map + public GIS layers
  // ---------------------------------------------------------
  const mapEl = document.querySelector('#current-explorer-map');
  if (!mapEl) return;

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
  const mapLoading = document.querySelector('#map-loading');
  const hazardLayerCount = document.querySelector('#hazard-layer-count');
  const hospitalLayerCount = document.querySelector('#hospital-layer-count');
  const fireLayerCount = document.querySelector('#fire-layer-count');
  const presetControls = [...document.querySelectorAll('[data-demo-location]')];

  const setStatus = (message) => {
    if (statusEl) statusEl.textContent = message;
  };

  const presetLocations = {
    hilo: {
      label: 'Hilo',
      coords: [-155.0827182, 19.6928371],
      source: 'U.S. Census Bureau · Hilo CDP centroid'
    },
    pahoa: {
      label: 'Pāhoa',
      coords: [-154.9453498, 19.4959665],
      source: 'U.S. Census Bureau · Pahoa CDP centroid'
    },
    kona: {
      label: 'Kailua-Kona',
      coords: [-155.9953330, 19.6442561],
      source: 'U.S. Census Bureau · Kailua CDP centroid (Hawaiʻi County)'
    },
    volcano: {
      label: 'Volcano CDP',
      coords: [-155.2774144, 19.4864107],
      source: 'U.S. Census Bureau · Volcano CDP centroid'
    },
    oceanview: {
      label: 'Hawaiian Ocean View',
      coords: [-155.7749612, 19.0959082],
      source: 'U.S. Census Bureau · Hawaiian Ocean View CDP centroid'
    }
  };

  const HAZARD_URL = 'https://geodata.hawaii.gov/arcgis/rest/services/Hazards/MapServer/3/query?where=1%3D1&outFields=hzone%2Cmzone&returnGeometry=true&outSR=4326&f=geojson';
  const HOSPITAL_URL = 'https://geodata.hawaii.gov/arcgis/rest/services/Infrastructure/MapServer/5/query?where=1%3D1&outFields=name%2Caddress_addressline1%2Caddress_addresscity%2Caddress_addressstateorprovince%2Caddress_addresspostalcode%2Ccontact_businessprimaryphone%2Cadditionalinfo_operationalstatus&returnGeometry=true&outSR=4326&f=geojson';
  const FIRE_URL = 'https://geodata.hawaii.gov/arcgis/rest/services/EmergMgmtPubSafety/MapServer/7/query?where=1%3D1&outFields=name%2Calt_name%2Cisland%2Cstatus&returnGeometry=true&outSR=4326&f=geojson';

  const islandBounds = {
    west: -156.25,
    east: -154.65,
    south: 18.80,
    north: 20.40
  };

  const inStudyArea = ([lng, lat]) => (
    lng >= islandBounds.west && lng <= islandBounds.east &&
    lat >= islandBounds.south && lat <= islandBounds.north
  );

  let maplibregl;
  try {
    maplibregl = await import('/hawaii-lava-v3-realmap-v6/vendor/maplibre/maplibre-gl.mjs');
    if (typeof maplibregl.setWorkerUrl === 'function') {
      maplibregl.setWorkerUrl('/hawaii-lava-v3-realmap-v6/vendor/maplibre/maplibre-gl-worker.mjs');
    }
  } catch (error) {
    console.error('MapLibre failed to load', error);
    if (mapLoading) {
      mapLoading.innerHTML = '<strong>Map engine could not load.</strong><span>Check the local MapLibre vendor files installed with this preview.</span>';
    }
    setStatus('MapLibre failed to load. The rest of the case study is still available.');
    return;
  }

  const map = new maplibregl.Map({
    container: mapEl,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [-155.50, 19.58],
    zoom: 8.25,
    minZoom: 7,
    maxZoom: 17,
    attributionControl: true
  });

  map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 110, unit: 'imperial' }), 'bottom-left');

  const markerEl = document.createElement('div');
  markerEl.className = 'selected-location-marker';
  const selectionMarker = new maplibregl.Marker({ element: markerEl, anchor: 'center' });

  let hazardData = null;
  let hospitalData = null;
  let fireData = null;
  let currentSelection = null;
  let styleReady = false;

  const emptyFeatureCollection = () => ({ type: 'FeatureCollection', features: [] });

  const filterBigIslandPoints = (geojson) => ({
    type: 'FeatureCollection',
    features: (geojson?.features || []).filter((feature) => {
      const c = feature?.geometry?.coordinates;
      return feature?.geometry?.type === 'Point' && Array.isArray(c) && inStudyArea(c);
    })
  });

  const fetchGeoJSON = async (url, label) => {
    const response = await fetch(url, { headers: { Accept: 'application/geo+json,application/json' } });
    if (!response.ok) throw new Error(`${label} request failed: ${response.status}`);
    const data = await response.json();
    if (!data || data.type !== 'FeatureCollection') throw new Error(`${label} did not return GeoJSON`);
    return data;
  };

  const addOrReplaceGeoJSONSource = (id, data) => {
    const existing = map.getSource(id);
    if (existing && typeof existing.setData === 'function') {
      existing.setData(data);
    } else {
      map.addSource(id, { type: 'geojson', data });
    }
  };

  const boundFacilityLayers = new Set();

  const bindFacilityLayerEvents = (layerId, kind) => {
    if (boundFacilityLayers.has(layerId) || !map.getLayer(layerId)) return;
    boundFacilityLayers.add(layerId);
    map.on('click', layerId, (event) => {
      if (!event.features?.[0]) return;
      popupForFeature(kind, event.features[0], event.lngLat);
    });
    map.on('mouseenter', layerId, () => { map.getCanvas().style.cursor = 'pointer'; });
    map.on('mouseleave', layerId, () => { map.getCanvas().style.cursor = 'crosshair'; });
  };

  const addReferenceLayers = () => {
    if (!styleReady) return;
    const labelLayerId = map.getStyle()?.layers?.find((layer) => layer.type === 'symbol')?.id;

    if (hazardData) {
      addOrReplaceGeoJSONSource('lava-hazard-zones', hazardData);
      if (!map.getLayer('lava-hazard-fill')) {
        map.addLayer({
          id: 'lava-hazard-fill',
          type: 'fill',
          source: 'lava-hazard-zones',
          paint: {
            'fill-color': [
              'match', ['to-string', ['get', 'hzone']],
              '1', '#7b164a',
              '2', '#d8332f',
              '3', '#ec6b4b',
              '4', '#ef923b',
              '5', '#e6bf51',
              '6', '#d6c889',
              '7', '#9cab69',
              '8', '#b7c99a',
              '9', '#d6ddb6',
              '#a5a5a5'
            ],
            'fill-opacity': 0.33
          }
        }, labelLayerId);
      }
      if (!map.getLayer('lava-hazard-outline')) {
        map.addLayer({
          id: 'lava-hazard-outline',
          type: 'line',
          source: 'lava-hazard-zones',
          paint: {
            'line-color': 'rgba(255,255,255,0.48)',
            'line-width': 0.8
          }
        }, labelLayerId);
      }
    }

    if (hospitalData) {
      addOrReplaceGeoJSONSource('hospital-points', hospitalData);
      if (!map.getLayer('hospital-points-layer')) {
        map.addLayer({
          id: 'hospital-points-layer',
          type: 'circle',
          source: 'hospital-points',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 6.2, 9, 7.5, 11, 9.5, 14, 11.5],
            'circle-color': '#36a7ff',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 2.2,
            'circle-opacity': 0.92
          }
        });
      }
      bindFacilityLayerEvents('hospital-points-layer', 'hospital');
    }

    if (fireData) {
      addOrReplaceGeoJSONSource('fire-points', fireData);
      if (!map.getLayer('fire-points-layer')) {
        map.addLayer({
          id: 'fire-points-layer',
          type: 'circle',
          source: 'fire-points',
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 7, 4.8, 9, 5.8, 11, 7.2, 14, 9],
            'circle-color': '#ff5c42',
            'circle-stroke-color': '#ffffff',
            'circle-stroke-width': 1.8,
            'circle-opacity': 0.88
          }
        });
      }
      bindFacilityLayerEvents('fire-points-layer', 'fire');
    }

    if (!map.getSource('nearest-lines')) {
      map.addSource('nearest-lines', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'nearest-lines-layer',
        type: 'line',
        source: 'nearest-lines',
        paint: {
          'line-color': ['match', ['get', 'kind'], 'hospital', '#69baff', 'fire', '#ff806d', '#ffffff'],
          'line-width': 2.2,
          'line-dasharray': [2, 2],
          'line-opacity': 0.8
        }
      });
    }

    if (!map.getSource('nearest-facilities')) {
      map.addSource('nearest-facilities', { type: 'geojson', data: emptyFeatureCollection() });
      map.addLayer({
        id: 'nearest-facilities-halo',
        type: 'circle',
        source: 'nearest-facilities',
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'hospital', 15, 13],
          'circle-color': ['match', ['get', 'kind'], 'hospital', '#36a7ff', '#ff5c42'],
          'circle-opacity': 0.17,
          'circle-stroke-color': ['match', ['get', 'kind'], 'hospital', '#8fd0ff', '#ff9a88'],
          'circle-stroke-width': 2
        }
      });
      map.addLayer({
        id: 'nearest-facilities-core',
        type: 'circle',
        source: 'nearest-facilities',
        paint: {
          'circle-radius': ['match', ['get', 'kind'], 'hospital', 8.5, 7.5],
          'circle-color': ['match', ['get', 'kind'], 'hospital', '#36a7ff', '#ff5c42'],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2.5
        }
      });
      map.addLayer({
        id: 'nearest-facilities-label',
        type: 'symbol',
        source: 'nearest-facilities',
        minzoom: 8.2,
        layout: {
          'text-field': ['get', 'shortLabel'],
          'text-size': 12,
          'text-font': ['Noto Sans Regular'],
          'text-offset': [0, 1.55],
          'text-anchor': 'top',
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#161616',
          'text-halo-color': '#ffffff',
          'text-halo-width': 2
        }
      });
    }

    applyLayerVisibility();
  };

  map.on('load', () => {
    styleReady = true;
    if (mapLoading) mapLoading.classList.add('is-hidden');
    setStatus('Real map ready. Loading public GIS reference layers…');
    addReferenceLayers();
    choosePreset('hilo', { fly: false });
    loadReferenceData();
  });

  map.on('error', (event) => {
    console.warn('Map error', event?.error || event);
  });

  const pointInRing = (point, ring) => {
    const [x, y] = point;
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      const intersects = ((yi > y) !== (yj > y)) &&
        (x < ((xj - xi) * (y - yi)) / ((yj - yi) || Number.EPSILON) + xi);
      if (intersects) inside = !inside;
    }
    return inside;
  };

  const pointInPolygonCoords = (point, polygonCoords) => {
    if (!polygonCoords?.length || !pointInRing(point, polygonCoords[0])) return false;
    for (let i = 1; i < polygonCoords.length; i += 1) {
      if (pointInRing(point, polygonCoords[i])) return false;
    }
    return true;
  };

  const pointInFeature = (point, feature) => {
    const geometry = feature?.geometry;
    if (!geometry) return false;
    if (geometry.type === 'Polygon') return pointInPolygonCoords(point, geometry.coordinates);
    if (geometry.type === 'MultiPolygon') {
      return geometry.coordinates.some((polygon) => pointInPolygonCoords(point, polygon));
    }
    return false;
  };

  const haversineMiles = (a, b) => {
    const toRad = (d) => d * Math.PI / 180;
    const [lon1, lat1] = a;
    const [lon2, lat2] = b;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const s1 = Math.sin(dLat / 2);
    const s2 = Math.sin(dLon / 2);
    const h = s1 * s1 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * s2 * s2;
    const km = 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
    return { km, miles: km * 0.621371 };
  };

  const nearestPointFeature = (point, collection) => {
    let best = null;
    for (const feature of collection?.features || []) {
      const coords = feature?.geometry?.coordinates;
      if (!Array.isArray(coords)) continue;
      const distance = haversineMiles(point, coords);
      if (!best || distance.km < best.distance.km) best = { feature, distance };
    }
    return best;
  };

  const nameOf = (feature, fallback) => {
    const p = feature?.properties || {};
    return p.name || p.Name || p.NAME || p.alt_name || fallback;
  };

  const hospitalAddress = (feature) => {
    const p = feature?.properties || {};
    const line1 = p.address_addressline1 || '';
    const city = p.address_addresscity || '';
    const state = p.address_addressstateorprovince || 'HI';
    const zip = p.address_addresspostalcode ? String(Math.trunc(Number(p.address_addresspostalcode))) : '';
    return [line1, [city, state, zip].filter(Boolean).join(' ')].filter(Boolean).join(', ') || 'Address not supplied in this layer';
  };

  const updateNearestLines = (point, hospitalNearest, fireNearest) => {
    const source = map.getSource('nearest-lines');
    if (!source || typeof source.setData !== 'function') return;
    const features = [];
    if (hospitalNearest?.feature?.geometry?.coordinates) {
      features.push({
        type: 'Feature',
        properties: { kind: 'hospital' },
        geometry: { type: 'LineString', coordinates: [point, hospitalNearest.feature.geometry.coordinates] }
      });
    }
    if (fireNearest?.feature?.geometry?.coordinates) {
      features.push({
        type: 'Feature',
        properties: { kind: 'fire' },
        geometry: { type: 'LineString', coordinates: [point, fireNearest.feature.geometry.coordinates] }
      });
    }
    source.setData({ type: 'FeatureCollection', features });

    const facilitySource = map.getSource('nearest-facilities');
    if (facilitySource && typeof facilitySource.setData === 'function') {
      const facilityFeatures = [];
      if (hospitalNearest?.feature?.geometry?.coordinates) {
        facilityFeatures.push({
          type: 'Feature',
          properties: { kind: 'hospital', shortLabel: 'Nearest hospital' },
          geometry: { type: 'Point', coordinates: hospitalNearest.feature.geometry.coordinates }
        });
      }
      if (fireNearest?.feature?.geometry?.coordinates) {
        facilityFeatures.push({
          type: 'Feature',
          properties: { kind: 'fire', shortLabel: 'Nearest fire station' },
          geometry: { type: 'Point', coordinates: fireNearest.feature.geometry.coordinates }
        });
      }
      facilitySource.setData({ type: 'FeatureCollection', features: facilityFeatures });
    }
  };

  const analyzeCurrentPoint = () => {
    if (!currentSelection) return;
    const point = currentSelection.coords;

    if (!inStudyArea(point)) {
      if (hazardResult) hazardResult.textContent = 'Outside Hawaiʻi Island study area';
      if (hazardNote) hazardNote.textContent = 'The explorer is intentionally limited to Hawaiʻi Island.';
      if (hospitalResult) hospitalResult.textContent = 'Not calculated outside study area';
      if (hospitalNote) hospitalNote.textContent = 'Choose a point on Hawaiʻi Island to calculate the nearest mapped hospital.';
      if (fireResult) fireResult.textContent = 'Not calculated outside study area';
      if (fireNote) fireNote.textContent = 'Choose a point on Hawaiʻi Island to calculate the nearest mapped fire station.';
      return;
    }

    if (hazardData) {
      const zoneFeature = hazardData.features.find((feature) => pointInFeature(point, feature));
      if (zoneFeature) {
        const zone = String(zoneFeature.properties?.hzone ?? zoneFeature.properties?.HZONE ?? '—');
        if (hazardResult) hazardResult.textContent = `Zone ${zone}${zone === '1' ? ' · highest classification' : ''}`;
        if (hazardNote) hazardNote.textContent = 'USGS 1991 long-term lava-flow hazard classification. This is not an eruption forecast or evacuation zone.';
      } else {
        if (hazardResult) hazardResult.textContent = 'No hazard-zone polygon matched';
        if (hazardNote) hazardNote.textContent = 'Check layer coverage and the selected point. Coastal/offshore points may fall outside the polygons.';
      }
    } else {
      if (hazardResult) hazardResult.textContent = 'Hazard layer unavailable';
    }

    const nearestHospital = hospitalData ? nearestPointFeature(point, hospitalData) : null;
    if (nearestHospital) {
      const name = nameOf(nearestHospital.feature, 'Mapped hospital');
      const p = nearestHospital.feature.properties || {};
      if (hospitalResult) hospitalResult.textContent = `${name} · ${nearestHospital.distance.miles.toFixed(1)} mi / ${nearestHospital.distance.km.toFixed(1)} km`;
      if (hospitalNote) hospitalNote.textContent = `${hospitalAddress(nearestHospital.feature)} · straight-line distance · State hospital GIS layer dated September 2026.`;
    } else if (hospitalResult) {
      hospitalResult.textContent = hospitalData ? 'No mapped hospital found' : 'Hospital layer unavailable';
    }

    const nearestFire = fireData ? nearestPointFeature(point, fireData) : null;
    if (nearestFire) {
      const name = nameOf(nearestFire.feature, 'Mapped fire station');
      const p = nearestFire.feature.properties || {};
      if (fireResult) fireResult.textContent = `${name} · ${nearestFire.distance.miles.toFixed(1)} mi / ${nearestFire.distance.km.toFixed(1)} km`;
      if (fireNote) fireNote.textContent = `${p.status ? `${p.status} station · ` : ''}straight-line distance · statewide fire-station data as of December 2025.`;
    } else if (fireResult) {
      fireResult.textContent = fireData ? 'No mapped fire station found' : 'Fire-station layer unavailable';
    }

    updateNearestLines(point, nearestHospital, nearestFire);
  };

  const clearPresetActive = () => presetControls.forEach((el) => el.classList.remove('is-active'));

  const selectLocation = ({ label, coords, source = 'Map click' }, { fly = true } = {}) => {
    currentSelection = { label, coords, source };
    clearPresetActive();

    if (selectedLocation) selectedLocation.textContent = label;
    if (selectedCoordinates) selectedCoordinates.textContent = `${coords[1].toFixed(5)}°, ${coords[0].toFixed(5)}° · ${source}`;

    if (inStudyArea(coords)) {
      selectionMarker.setLngLat(coords).addTo(map);
      if (fly) map.easeTo({ center: coords, zoom: Math.max(map.getZoom(), 10), duration: 900 });
      setStatus(`${label} selected. Calculating hazard and nearest mapped facilities in your browser…`);
    } else {
      selectionMarker.remove();
      setStatus(`${label} is outside the Hawaiʻi Island study area. No facility-distance result was calculated.`);
    }
    analyzeCurrentPoint();
  };

  const choosePreset = (key, options = {}) => {
    const preset = presetLocations[key];
    if (!preset) return;
    selectLocation(preset, options);
    presetControls
      .filter((el) => el.dataset.demoLocation === key)
      .forEach((el) => el.classList.add('is-active'));
  };

  presetControls.forEach((control) => {
    control.addEventListener('click', () => choosePreset(control.dataset.demoLocation));
  });

  map.on('click', (event) => {
    const coords = [event.lngLat.lng, event.lngLat.lat];
    selectLocation({ label: 'Selected map point', coords, source: 'Map click' }, { fly: false });
  });

  const popupForFeature = (kind, feature, lngLat) => {
    const props = feature?.properties || {};
    const title = nameOf(feature, kind === 'hospital' ? 'Hospital' : 'Fire station');
    const meta = kind === 'hospital'
      ? hospitalAddress(feature)
      : `${props.status || 'Mapped'} fire station · data as of Dec 2025`;
    const source = kind === 'hospital' ? 'State of Hawaiʻi GIS / DOH OHCA' : 'State of Hawaiʻi GIS / DOH EMSIPSB';
    new maplibregl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(lngLat)
      .setHTML(`<div class="map-popup-title">${String(title).replace(/[<>]/g, '')}</div><div class="map-popup-meta">${String(meta).replace(/[<>]/g, '')}</div><div class="map-popup-source">${source}</div>`)
      .addTo(map);
  };



  const loadReferenceData = async () => {
    const jobs = [
      fetchGeoJSON(HAZARD_URL, 'Hazard zones')
        .then((data) => {
          hazardData = data;
          if (hazardLayerCount) hazardLayerCount.textContent = `${data.features.length} polygons`;
          addReferenceLayers();
          analyzeCurrentPoint();
          return `hazard ${data.features.length}`;
        }),
      fetchGeoJSON(HOSPITAL_URL, 'Hospitals')
        .then((data) => {
          hospitalData = filterBigIslandPoints(data);
          if (hospitalLayerCount) hospitalLayerCount.textContent = `${hospitalData.features.length} on island`;
          addReferenceLayers();
          analyzeCurrentPoint();
          return `hospital ${hospitalData.features.length}`;
        }),
      fetchGeoJSON(FIRE_URL, 'Fire stations')
        .then((data) => {
          fireData = filterBigIslandPoints(data);
          if (fireLayerCount) fireLayerCount.textContent = `${fireData.features.length} on island`;
          addReferenceLayers();
          analyzeCurrentPoint();
          return `fire ${fireData.features.length}`;
        })
    ];

    const results = await Promise.allSettled(jobs);
    const failures = results.filter((r) => r.status === 'rejected');
    const successes = results.filter((r) => r.status === 'fulfilled');
    failures.forEach((r) => console.warn(r.reason));
    if (!hazardData && hazardLayerCount) hazardLayerCount.textContent = 'unavailable';
    if (!hospitalData && hospitalLayerCount) hospitalLayerCount.textContent = 'unavailable';
    if (!fireData && fireLayerCount) fireLayerCount.textContent = 'unavailable';

    if (failures.length === 0) {
      setStatus('Real map + all three public GIS reference layers loaded. Click anywhere to analyze a point.');
    } else if (successes.length) {
      setStatus(`Map loaded with ${successes.length}/3 reference datasets. One or more State GIS requests failed; available layers remain usable.`);
    } else {
      setStatus('Real basemap loaded, but the public GIS reference layers could not be reached.');
    }
  };

  const visibilityFor = (checked) => checked ? 'visible' : 'none';
  const setLayerVisible = (ids, checked) => {
    ids.forEach((id) => {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', visibilityFor(checked));
    });
  };
  const hazardToggle = document.querySelector('#layer-hazard');
  const hospitalToggle = document.querySelector('#layer-hospitals');
  const fireToggle = document.querySelector('#layer-fire');
  const applyLayerVisibility = () => {
    setLayerVisible(['lava-hazard-fill', 'lava-hazard-outline'], hazardToggle?.checked !== false);
    setLayerVisible(['hospital-points-layer'], hospitalToggle?.checked !== false);
    setLayerVisible(['nearest-facilities-halo','nearest-facilities-core','nearest-facilities-label'], (hospitalToggle?.checked !== false) || (fireToggle?.checked !== false));
    setLayerVisible(['fire-points-layer'], fireToggle?.checked !== false);
  };
  hazardToggle?.addEventListener('change', applyLayerVisibility);
  hospitalToggle?.addEventListener('change', applyLayerVisibility);
  fireToggle?.addEventListener('change', applyLayerVisibility);

  const runSearch = () => {
    const query = searchInput?.value.trim().toLowerCase() || '';
    if (!query) {
      setStatus('Enter a preset place name, or click directly on the map.');
      searchInput?.focus();
      return;
    }

    let key = null;
    if (query.includes('hilo')) key = 'hilo';
    else if (query.includes('pahoa') || query.includes('pāhoa')) key = 'pahoa';
    else if (query.includes('kona') || query.includes('kailua')) key = 'kona';
    else if (query.includes('volcano')) key = 'volcano';
    else if (query.includes('ocean view')) key = 'oceanview';

    if (key) {
      choosePreset(key);
      setStatus('Matched a verified Census preset locally. No address was sent to a geocoder.');
    } else {
      const match = query.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
      if (match) {
        const lat = Number(match[1]);
        const lng = Number(match[2]);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          selectLocation({ label: 'Entered coordinate', coords: [lng, lat], source: 'Manual coordinate' });
          return;
        }
      }
      setStatus('Full Esri address geocoding is not connected in this preview yet. Try a preset name, click the map, or enter latitude, longitude.');
    }
  };

  searchButton?.addEventListener('click', runSearch);
  searchInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runSearch();
    }
  });

  locationButton?.addEventListener('click', () => {
    if (!('geolocation' in navigator)) {
      setStatus('This browser does not support device geolocation.');
      return;
    }
    locationButton.disabled = true;
    locationButton.textContent = 'Locating…';
    setStatus('Waiting for browser location permission…');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = [position.coords.longitude, position.coords.latitude];
        selectLocation({ label: 'Device location · session only', coords, source: 'Browser geolocation' });
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

  // Basic deterrence only; public web assets can still be inspected or captured.
  document.addEventListener('contextmenu', (event) => event.preventDefault());
  document.addEventListener('dragstart', (event) => {
    if (event.target instanceof HTMLImageElement) event.preventDefault();
  });
})();
