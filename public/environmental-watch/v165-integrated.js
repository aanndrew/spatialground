/* SpatialGround V1.6.5 — one honest, compact source activity/status/countdown strip. */
(function(){
  'use strict';
  const labels=['NOAA IncidentNews','USGS','NASA EONET'];
  function setup(){
    const root=document.querySelector('.ew-app[data-page="dashboard"]');
    const title=root&&root.querySelector('#ew-live-map .ew-map-title');
    if(!root||!title||document.getElementById('ew-v165-monitor'))return;
    const panel=document.createElement('section');panel.id='ew-v165-monitor';panel.className='ew-v165-monitor';
    panel.setAttribute('aria-label','Data loading and next automatic check');
    panel.innerHTML='<div class="ew-v165-summary"><span id="ew-v165-led" class="ew-v165-led"></span><strong class="ew-v165-activity" id="ew-v165-activity" role="status" aria-live="polite">Preparing official data…</strong><span class="ew-v165-clock">Next check <b id="ew-v165-clock">--:--</b></span><button type="button" id="ew-v165-toggle" aria-expanded="false" aria-controls="ew-v165-details">Feed details ▾</button></div><div class="ew-v165-details" id="ew-v165-details" hidden><div id="ew-v165-progress"></div><p>NASA EONET, USGS and NOAA are checked independently. NOAA is a locally synchronized snapshot. Countdown indicates the next browser check, not an agency publication or an emergency alert.</p></div>';
    title.insertAdjacentElement('afterend',panel);
    const activity=panel.querySelector('#ew-v165-activity');
    const clock=panel.querySelector('#ew-v165-clock');
    const toggle=panel.querySelector('#ew-v165-toggle');
    const details=panel.querySelector('#ew-v165-details');
    const progress=panel.querySelector('#ew-v165-progress');
    let mode=root.getAttribute('data-ew-v165-mode')||(new URLSearchParams(location.search).get('demo')==='1'?'demo':'live');
    let nextAt=Number(root.getAttribute('data-ew-v165-next'))||0;
    let working=mode==='live';
    let statuses=Object.fromEntries(labels.map(k=>[k,'waiting']));
    function paint(){
      const ready=labels.filter(k=>statuses[k]==='ready'),failed=labels.filter(k=>statuses[k]==='failed'),waiting=labels.filter(k=>statuses[k]==='waiting');
      panel.classList.toggle('ew-v165-has-errors',failed.length>0);
      if(mode==='demo'){
        activity.textContent='Demo mode · illustrative records';clock.textContent='Paused';
      }else{
        if(working&&waiting.length)activity.textContent=(ready.length+failed.length)+'/3 checked · Trying '+waiting.join(', ');
        else if(failed.length===3)activity.textContent='Official feeds unavailable · retry with Refresh';
        else activity.textContent=ready.length+'/3 official feeds ready'+(failed.length?' · '+failed.length+' unavailable':'');
        if(document.visibilityState==='hidden')clock.textContent='Paused (tab hidden)';
        else if(nextAt){const secs=Math.max(0,Math.ceil((nextAt-Date.now())/1000));clock.textContent=secs?String(Math.floor(secs/60)).padStart(2,'0')+':'+String(secs%60).padStart(2,'0'):'Due';}
        else clock.textContent='--:--';
      }
      progress.replaceChildren();
      for(const label of labels){
        const s=statuses[label];const pill=document.createElement('span');pill.className='ew-v165-source ew-v165-'+s;
        pill.textContent=(s==='ready'?'✓ ':s==='failed'?'! ':'◌ ')+label+' · '+(s==='ready'?'Ready':s==='failed'?'Unavailable':'Trying');
        progress.append(pill);
      }
    }
    toggle.addEventListener('click',()=>{details.hidden=!details.hidden;toggle.setAttribute('aria-expanded',String(!details.hidden));});
    document.addEventListener('ew:v165-cycle',event=>{
      const d=event.detail;if(!d)return;
      mode=d.mode;nextAt=d.nextAt;working=d.stage==='start'&&mode==='live';
      if(working)statuses=Object.fromEntries(labels.map(k=>[k,'waiting']));
      paint();
    });
    document.addEventListener('ew:v165-sources',event=>{if(event.detail?.statuses){statuses={...event.detail.statuses};paint();}});
    document.addEventListener('visibilitychange',paint);
    paint();setInterval(paint,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup,{once:true});else setup();
})();
