/* EW v1.6.13: source attribution, optionally displaying user-supplied permitted agency logos.
   No government logo assets are bundled; the previous icons remain unless original files exist. */
(() => {
  'use strict';
  const agencies=[
    {test:/NASA/i,id:'nasa',name:'NASA EONET',domain:'nasa.gov'},
    {test:/USGS/i,id:'usgs',name:'USGS Earthquakes',domain:'usgs.gov'},
    {test:/NOAA/i,id:'noaa',name:'NOAA IncidentNews',domain:'noaa.gov'}
  ];
  const base='/environmental-watch/agency-logos/';
  let scheduled=false;
  function enhance(){
    scheduled=false;
    const root=document.querySelector('.ew-app[data-page="dashboard"] .ew-v15-sidebar');
    if(!root)return;
    for(const source of root.querySelectorAll('.ew-v15-source')){
      const anchor=source.querySelector('a');
      const mark=source.querySelector('.ew-v15-source-mark');
      if(!anchor||!mark)continue;
      const agency=agencies.find(x=>x.test.test(anchor.textContent||''));
      if(!agency)continue;
      const info=anchor.parentElement;
      if(info&&!info.querySelector('.ew1613-agency-domain')){
        const domain=document.createElement('span');domain.className='ew1613-agency-domain';
        domain.textContent=agency.domain+' · official data source';
        info.appendChild(domain);
      }
      if(mark.dataset.ew1613LogoAttempt==='done')continue;
      mark.dataset.ew1613LogoAttempt='done';
      // Only original assets supplied by the site owner after confirming usage rights.
      const logo=new Image();
      logo.alt=agency.name+' agency logo';logo.decoding='async';
      logo.onload=()=>{
        if(!mark.isConnected)return;
        mark.replaceChildren(logo);mark.classList.add('ew1613-agency-logo');
      };
      logo.onerror=()=>{}; // retain the original working custom icon
      logo.src=base+agency.id+'.png';
    }
    const panel=root.querySelector('.ew-v15-aside-sources');
    if(panel&&!panel.querySelector('.ew1613-attribution-note')){
      const note=document.createElement('p');note.className='ew1613-attribution-note';
      note.textContent='Agency data links are provided for attribution; SpatialGround is not affiliated with or endorsed by these agencies.';
      panel.appendChild(note);
    }
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
  function start(){
    schedule();
    const app=document.querySelector('.ew-app[data-page="dashboard"]');
    if(!app)return;
    const observer=new MutationObserver(schedule);
    observer.observe(app,{childList:true,subtree:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
