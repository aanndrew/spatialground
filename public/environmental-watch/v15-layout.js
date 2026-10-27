/* Environmental Watch V1.5: presentation-only progressive enhancement. */
(function () {
  'use strict';
  function setup() {
    const app = document.querySelector('.ew-app[data-page="dashboard"]');
    if (!app || app.dataset.ewV15Layout === 'ready') return;
    const metrics = app.querySelector('.ew-metrics');
    const feature = app.querySelector('#ew-feature');
    const mapPanel = app.querySelector('#ew-live-map');
    const originalCards = app.querySelector('#ew-event-cards');
    if (!metrics || !feature || !mapPanel || !originalCards) {
      console.warn('[EW V1.5] Expected Dashboard sections missing; previous layout was left unchanged.');
      return;
    }

    // Fifth KPI states a stable geographic SCOPE, not a fabricated incident count.
    if (!metrics.querySelector('.ew-v15-scope-stat')) {
      const scope = document.createElement('div');
      scope.className = 'ew-stat ew-v15-scope-stat';
      scope.innerHTML = '<div class="ew-stat-icon ew-v15-globe" aria-hidden="true">◎</div><div><strong>North America</strong><span>Geographic scope</span></div>';
      const stats = metrics.querySelectorAll('.ew-stat');
      if (stats.length > 2) metrics.insertBefore(scope, stats[2]);
      else metrics.append(scope);
    }

    const grid = document.createElement('div');
    grid.className = 'ew-v15-grid';
    const main = document.createElement('div');
    main.className = 'ew-v15-primary';
    const aside = document.createElement('aside');
    aside.className = 'ew-v15-sidebar';
    aside.setAttribute('aria-label', 'Latest incidents and sources');
    const latest = document.createElement('section');
    latest.className = 'ew-panel ew-v15-latest';
    latest.innerHTML = '<div class="ew-panel-bar"><h2>Latest Events</h2><a href="#ew-significant">All events →</a></div><p class="ew-v15-aside-explainer">Current matching feed records · not a severity ranking</p><div class="ew-v15-latest-items" aria-live="polite"><p class="ew-empty">Loading events…</p></div>';
    const sources = document.createElement('section');
    sources.className = 'ew-panel ew-v15-aside-sources';
    sources.innerHTML = '<div class="ew-panel-bar"><h2>Data Sources</h2><a href="#ew-sources">Details →</a></div><div class="ew-v15-source"><span class="ew-v15-source-mark">N</span><div><a href="https://eonet.gsfc.nasa.gov/" target="_blank" rel="noopener noreferrer">NASA EONET ↗</a><small>Natural event reports</small></div></div><div class="ew-v15-source"><span class="ew-v15-source-mark is-usgs">U</span><div><a href="https://earthquake.usgs.gov/earthquakes/feed/" target="_blank" rel="noopener noreferrer">USGS Earthquakes ↗</a><small>M5+ earthquake feed</small></div></div><p class="ew-v15-source-note">NOAA IncidentNews is included when an official NOAA snapshot has been synchronized. NOAA notifications are not active-status reports.</p>';
    /* EW-V16-NOAA-SIDEBAR */
    const noaaSource=document.createElement('div');
    noaaSource.className='ew-v15-source';
    noaaSource.innerHTML='<span class="ew-v15-source-mark">O</span><div><a href="https://incidentnews.noaa.gov/" target="_blank" rel="noopener noreferrer">NOAA IncidentNews ↗</a><small>Oil / chemical notifications · selected responses</small></div>';
    sources.querySelector('.ew-v15-source-note')?.before(noaaSource);
    aside.append(latest, sources);
    metrics.insertAdjacentElement('afterend', grid);
    grid.append(main,aside);
    main.append(feature,mapPanel);
    app.dataset.ewV15Layout = 'ready';

    const list = latest.querySelector('.ew-v15-latest-items');
    const renderLatest = () => {
      const originals = Array.from(originalCards.querySelectorAll('.ew-event-card')).slice(0, 6);
      list.replaceChildren();
      if (originals.length === 0) {
        const blank = document.createElement('p');
        blank.className = 'ew-empty';
        blank.textContent = originalCards.textContent?.trim() || 'No matching events in the selected period.';
        list.appendChild(blank);
        return;
      }
      for (const card of originals) {
        const row = document.createElement('a');
        row.className = 'ew-v15-mini-event';
        row.href = card.getAttribute('href') || '#ew-significant';
        if (card.style.getPropertyValue('--event-color')) row.style.setProperty('--event-color', card.style.getPropertyValue('--event-color'));
        const art = card.querySelector('.ew-event-art');
        if (art) {
          const visual = art.cloneNode(true);
          visual.classList.add('ew-v15-mini-art');
          visual.setAttribute('aria-hidden','true');
          row.appendChild(visual);
        }
        const info = document.createElement('div');
        info.className = 'ew-v15-mini-info';
        const category = card.querySelector('.ew-event-type');
        const title = card.querySelector('.ew-event-body h3');
        const source = card.querySelector('.ew-event-body p');
        const date = card.querySelector('.ew-event-body small');
        const typeLine = document.createElement('span');typeLine.className='ew-v15-mini-category';typeLine.textContent = category?.textContent?.trim() || 'Incident';
        const eventTitle = document.createElement('strong');eventTitle.textContent = title?.textContent?.trim() || 'Event details';
        const meta = document.createElement('small');meta.textContent = [source?.textContent?.trim(),date?.textContent?.trim()].filter(Boolean).join(' · ');
        info.append(typeLine,eventTitle,meta);
        row.appendChild(info);
        list.appendChild(row);
      }
    };
    const observer = new MutationObserver(renderLatest);
    observer.observe(originalCards,{childList:true});
    renderLatest();
    // If MapLibre initialized during the layout move, inform it of the new width.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    window.addEventListener('load', () => window.dispatchEvent(new Event('resize')), { once:true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',setup,{once:true});
  else setup();
})();
