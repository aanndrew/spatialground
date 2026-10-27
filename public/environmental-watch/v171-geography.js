/* Environmental Watch v1.6.11 — local coordinate verification links.
   Event data and coordinate values are never changed here. */
(() => {
  'use strict';
  const root = document.querySelector('.ew-app');
  if (!root) return;
  function convert(anchor){
    if (!(anchor instanceof HTMLAnchorElement) || anchor.dataset.ew171Local === 'yes') return;
    const label = (anchor.textContent || '').trim();
    if (!/Check location|View coordinate on OpenStreetMap/i.test(label)) return;
    let u;
    try { u = new URL(anchor.href); } catch { return; }
    const lat = Number(u.searchParams.get('mlat'));
    const lon = Number(u.searchParams.get('mlon'));
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat)>90 || Math.abs(lon)>180) return;
    let source='', id='', name='';
    const detailQuery = document.querySelector('.ew-app[data-page="detail"]') ? new URLSearchParams(location.search) : null;
    if (detailQuery) {source=detailQuery.get('source')||'';id=detailQuery.get('id')||'';name=document.getElementById('ew-detail-title')?.textContent || '';}
    else {
      const card=anchor.closest('#ew-map-selection');
      const href=card?.querySelector('a.ew-primary-link')?.getAttribute('href');
      if(href){try{const q=new URL(href,location.origin).searchParams;source=q.get('source')||'';id=q.get('id')||'';}catch{}}
      name=card?.querySelector('h3')?.textContent || '';
    }
    const next = new URL('/environmental-watch/location-check-v171.html',location.origin);
    next.searchParams.set('lat',String(lat));next.searchParams.set('lon',String(lon));
    if (['eonet','usgs','noaa','demo'].includes(source))next.searchParams.set('source',source);
    if(id.length<130)next.searchParams.set('id',id);
    if(name)next.searchParams.set('name',name.slice(0,180));
    anchor.href=next.pathname+next.search;
    anchor.textContent=detailQuery ? 'Verify source coordinate ↗' : 'Check coordinate ↗';
    anchor.target='_blank';anchor.rel='noopener noreferrer';
    anchor.dataset.ew171Local='yes';
  }
  function refresh(){
    for(const a of root.querySelectorAll('a'))convert(a);
  }
  let pending=false;
  function schedule(){if(pending)return;pending=true;requestAnimationFrame(()=>{pending=false;refresh();});}
  refresh();
  new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
  // Click capture handles freshly generated map-selection panels before the observer runs.
  root.addEventListener('click',e=>{const a=e.target.closest?.('a');if(a)convert(a);},true);
})();
