/* SpatialGround Environmental Watch 1.6.7. Presentation-only enhancement. */
(() => {
  'use strict';
  const S='http://www.w3.org/2000/svg';
  const assetRoot='/environmental-watch/';
  const wave='<path d="M2 12H5l2.5-5 2.4 10 3.3-13 3.1 16 2.2-8H22"/>';
  function svg(content, view='0 0 24 24'){
    const node=document.createElementNS(S,'svg');
    node.setAttribute('viewBox',view);
    node.setAttribute('fill','none');
    node.setAttribute('stroke','currentColor');
    node.setAttribute('stroke-width','2.1');
    node.setAttribute('stroke-linecap','round');
    node.setAttribute('stroke-linejoin','round');
    node.setAttribute('aria-hidden','true');
    node.innerHTML=content;
    return node;
  }
  const SYMBOLS={
    quake:wave,
    nasa:'<circle cx="12" cy="12" r="7.4"/><path d="M4.8 12h14.4M12 4.6c-2 2.2-3.2 4.5-3.2 7.4s1.2 5.2 3.2 7.4c2-2.2 3.2-4.5 3.2-7.4S14 6.8 12 4.6"/><path d="M3.3 17.6c4.3 2.2 11.4.8 17.4-4.2" stroke-width="1.6"/>',
    noaa:'<path d="M12 2.7C9.7 7 6.9 9.3 6.9 13a5.1 5.1 0 0 0 10.2 0c0-3.7-2.8-6-5.1-10.3Z"/><path d="M3 20c2-1.3 4-1.3 6 0s4 1.3 6 0 4-1.3 6 0" stroke-width="1.5"/>'
  };
  function setSymbol(node, kind){
    if(!node || node.dataset.ew167Icon===kind)return;
    node.replaceChildren(svg(SYMBOLS[kind]));
    node.dataset.ew167Icon=kind;
    node.classList.add('ew-v167-svg-symbol',kind==='quake'?'ew-v167-quake':'ew-v167-source-symbol');
  }
  function inlineMonitor(){
    const panel=document.getElementById('ew-v165-monitor');
    if(!panel||panel.classList.contains('ew-v167-monitor-inline'))return;
    const summary=panel.querySelector('.ew-v165-summary');
    const progress=panel.querySelector('#ew-v165-progress');
    const clock=panel.querySelector('.ew-v165-clock');
    if(!summary||!progress||!clock)return;
    progress.classList.add('ew-v167-feed-pills');
    progress.setAttribute('aria-label','Individual official source statuses');
    summary.insertBefore(progress,clock);
    panel.querySelector('#ew-v165-toggle')?.remove();
    panel.querySelector('#ew-v165-details')?.remove();
    panel.classList.add('ew-v167-monitor-inline');
    panel.title='Next check is a browser refresh, not a guarantee that agencies have published new incidents.';
  }
  const categories=['wildfire','storm','flood','volcano','earthquake','drought','oil-spill','chemical-release','other'];
  function artwork(){
    const sidebar=document.querySelector('.ew-app[data-page="dashboard"] .ew-v15-sidebar');
    if(!sidebar)return;
    for(const card of sidebar.querySelectorAll('.ew-v15-mini-event')){
      if(card.dataset.ew167Card==='done')continue;
      const art=card.querySelector('.ew-v15-mini-art');
      const info=card.querySelector('.ew-v15-mini-info');
      if(!art||!info)continue;
      let cat=categories.find(x=>art.classList.contains('ew-art-'+x))||'other';
      card.dataset.ew167Category=cat;
      card.classList.add('ew-v167-event-row');
      card.setAttribute('aria-label',card.textContent.trim().replace(/\s+/g,' '));
      art.setAttribute('title','Category illustration — not a photograph of this incident');
      // Background is an illustration by type, NEVER an attribution to the specific incident.
      const scenery=document.createElement('span');scenery.className='ew-v167-scenery';
      scenery.style.backgroundImage=`url("${assetRoot}v167-scene-${cat}.svg")`;
      art.prepend(scenery);
      const arrow=document.createElement('span');arrow.className='ew-v167-card-arrow';
      arrow.appendChild(svg('<path d="m9 5 7 7-7 7"/>'));
      card.append(arrow);
      card.dataset.ew167Card='done';
    }
  }
  function sources(){
    const sidebar=document.querySelector('.ew-app[data-page="dashboard"] .ew-v15-sidebar');
    if(!sidebar)return;
    for(const entry of sidebar.querySelectorAll('.ew-v15-source')){
      const mark=entry.querySelector('.ew-v15-source-mark');
      const name=entry.querySelector('a')?.textContent||'';
      if(!mark)continue;
      const kind=/NASA/i.test(name)?'nasa':/USGS/i.test(name)?'quake':/NOAA/i.test(name)?'noaa':null;
      if(!kind)continue;
      setSymbol(mark,kind);
      entry.classList.add('ew-v167-source-card','ew-v167-source-'+kind);
    }
  }
  function earthquakes(){
    // All other category symbols are deliberately kept intact.
    for(const node of document.querySelectorAll('.ew-art-earthquake .ew-event-big-icon'))setSymbol(node,'quake');
    for(const node of document.querySelectorAll('.ew-filter[data-category="earthquake"] > span:first-child'))setSymbol(node,'quake');
    for(const node of document.querySelectorAll('.ew-pin, .ew-pin-large')){
      if(node.dataset.ew167Icon)continue;
      if(node.textContent.trim()==='◆')setSymbol(node,'quake');
    }
    for(const node of document.querySelectorAll('.ew-eyebrow, #ew-detail-category')){
      if(node.dataset.ew167Processed)continue;
      const first=node.firstChild;
      if(first?.nodeType===Node.TEXT_NODE&&first.textContent.trimStart().startsWith('◆')){
        first.textContent=first.textContent.replace('◆','');
        node.prepend(svg(wave));node.classList.add('ew-v167-eyebrow-wave');
      }
      // Detail page updates this node asynchronously; do not freeze a non-earthquake label.
      if(node.querySelector('svg'))node.dataset.ew167Processed='yes';
    }
  }
  let scheduled=false;
  function enhance(){
    scheduled=false;
    inlineMonitor();artwork();sources();earthquakes();
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;requestAnimationFrame(enhance);
  }
  function start(){
    schedule();
    const root=document.querySelector('.ew-app');
    if(!root)return;
    // Original cards, latest list, pins, map selection can all be re-rendered by live filters.
    const targetIds=['ew-event-cards','ew-filters','ew-map','ew-map-selection','ew-detail-map','ew-detail-category'];
    const nodes=targetIds.map(id=>document.getElementById(id)).filter(Boolean);
    nodes.push(...root.querySelectorAll('.ew-v15-sidebar'));
    const observer=new MutationObserver(schedule);
    for(const node of nodes)observer.observe(node,{childList:true,subtree:true});
    // Monitor is generated on DOMContentLoaded, after our script in some routes.
    if(!document.getElementById('ew-v165-monitor')){
      const head=new MutationObserver(()=>{if(document.getElementById('ew-v165-monitor')){head.disconnect();schedule();}});
      head.observe(root,{childList:true,subtree:true});
      setTimeout(()=>head.disconnect(),8000);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
