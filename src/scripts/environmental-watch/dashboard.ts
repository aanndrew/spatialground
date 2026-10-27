import { ENVIRONMENTAL_MAP_STYLE, ENVIRONMENTAL_LIGHT_STYLE, installEnvironmentalMapTheme } from './mapTheme';import type * as maplibregl from 'maplibre-gl';
import {loadEwMapLibre} from './ewMapLibre';
import {CATEGORIES, DEMO_EVENTS, categoryColor, categoryIcon, categoryLabel, displayDate, detailHref, fetchLiveEvents, type EnvironmentalEvent, type FeedResult} from './data';

const root=document.querySelector<HTMLElement>('.ew-app[data-page="dashboard"]');
if(root){
  const byId=(id:string)=>document.getElementById(id)!;
  let ml: typeof import('maplibre-gl') | null = null;
  const state:{events:EnvironmentalEvent[];mode:'live'|'demo';category:string;days:number;map:maplibregl.Map|null;markers:maplibregl.Marker[];errors:string[];group:'all'|'natural'|'human';}={
    events:[],mode:new URLSearchParams(location.search).get('demo')==='1'?'demo':'live',category:'all',days:30,map:null,markers:[],errors:[],group:'all'
  };
  function el(tag:string,cls='',text=''):HTMLElement {
    const node=document.createElement(tag); if(cls)node.className=cls;if(text)node.textContent=text;return node;
  }
  function setText(id:string,t:string){const n=byId(id);if(n)n.textContent=t;}
  function updateStatus(note:string,warning=false){const n=byId('ew-status');n.textContent=note;n.classList.toggle('ew-warning',warning);}
  /* EW-V16-SOURCE-AND-CONTROLS */
  const isHumanIncident=(cat:string)=>cat==='oil-spill'||cat==='chemical-release';
  const inGroup=(event:EnvironmentalEvent)=> state.group==='all' || (state.group==='human' ? isHumanIncident(event.category) : !isHumanIncident(event.category));
  // NOAA open_date is date-only. User-defined windows are all rolling UTC-based horizons.
  const inTimeWindow=(event:EnvironmentalEvent)=>{
    if(state.mode==='demo')return true;
    if(!event.observed || !Number.isFinite(Date.parse(event.observed)))return false;
    // Date-only NOAA notifications use calendar-day windows, not an invented hour.
    if(/^\d{4}-\d{2}-\d{2}$/.test(event.observed)){
      const now=new Date();
      const day=Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate());
      return Date.parse(event.observed)>=day-(state.days-1)*86400000;
    }
    return Date.parse(event.observed)>=Date.now()-state.days*86400000;
  };
  function filtered(){return state.events.filter(e=>inGroup(e)&&inTimeWindow(e)&&(state.category==='all'||e.category===state.category));}
  function allWithinDate(){return state.events.filter(e=>inGroup(e)&&inTimeWindow(e));}
  function makeFilters(){
    const wrap=byId('ew-filters');wrap.replaceChildren();
    for(const cat of CATEGORIES){
      if(cat.id!=='all' && (state.group==='human' ? !isHumanIncident(cat.id) : (state.group==='natural' && isHumanIncident(cat.id))))continue;
      const b=el('button','ew-filter') as HTMLButtonElement;b.type='button'; b.dataset.category=cat.id;
      b.classList.toggle('is-selected',cat.id===state.category);
      const icon=el('span','',cat.icon);b.append(icon,document.createTextNode(' '+cat.label+' '));
      const count=el('span','ew-filter-count',String(cat.id==='all'?allWithinDate().length:allWithinDate().filter(e=>e.category===cat.id).length));b.append(count);
      b.addEventListener('click',()=>{state.category=cat.id;render();});wrap.append(b);
    }
  }
  function renderCards(){
    const wrap=byId('ew-event-cards');wrap.replaceChildren();
    const events=filtered();
    if(!events.length){wrap.append(el('p','ew-empty','No events match these filters. Try “All events” or a longer time window.'));return;}
    for (const event of events.slice(0,12)){
      const a=el('a','ew-event-card') as HTMLAnchorElement;a.href=detailHref(event);
      a.style.setProperty('--event-color',categoryColor(event.category));
      const art=el('div',`ew-event-art ew-art-${event.category}`);
      const glyph=el('span','ew-event-big-icon',categoryIcon(event.category));art.append(glyph);
      const body=el('div','ew-event-body');
      body.append(el('span','ew-event-type',categoryLabel(event.category)),el('h3','',event.title),el('p','',event.sourceName));
      body.append(el('small','',displayDate(event.observed)));
      a.append(art,body);wrap.append(a);
    }
  }
  function renderMapMarkers(){
    if(!state.map||!ml)return;
    for (const m of state.markers)m.remove();state.markers=[];
    for(const event of filtered()){
      // Reject invalid source coordinates rather than breaking all incident markers.
      const point=event.coordinates;
      if(!Array.isArray(point)||point.length!==2||!Number.isFinite(point[0])||!Number.isFinite(point[1])||Math.abs(point[0])>180||Math.abs(point[1])>90)continue;
      const dot=el('button','ew-pin') as HTMLButtonElement;
      dot.type='button';dot.title=event.title;dot.setAttribute('aria-label',`View ${event.title}`);
      dot.style.setProperty('--pin-color',categoryColor(event.category));dot.textContent=categoryIcon(event.category);
      const marker=new ml.Marker({element:dot,anchor:'center'}).setLngLat(event.coordinates).addTo(state.map);
      dot.addEventListener('click',()=>showSelection(event));state.markers.push(marker);
    }
  }
  function showSelection(event:EnvironmentalEvent){
    const panel=byId('ew-map-selection');panel.hidden=false;panel.replaceChildren();
    panel.append(el('span','ew-eyebrow',`${categoryIcon(event.category)} ${categoryLabel(event.category)} · ${event.sourceName}`));
    panel.append(el('h3','',event.title));
    panel.append(el('p','',displayDate(event.observed)));
    /* EW-V161-COORDINATE-PANEL */
    const [lon,lat]=event.coordinates;
    const coordinateRow=el('p','ew-v161-coordinates');
    coordinateRow.append(document.createTextNode('Source position: '+lat.toFixed(4)+'°, '+lon.toFixed(4)+'° · '));
    const verifyLink=el('a','','Check location ↗') as HTMLAnchorElement;
    verifyLink.href='https://www.openstreetmap.org/?mlat='+lat+'&mlon='+lon+'#map=8/'+lat+'/'+lon;
    verifyLink.target='_blank';verifyLink.rel='noopener noreferrer';
    coordinateRow.append(verifyLink);panel.append(coordinateRow);
    const link=el('a','ew-primary-link','View event details →') as HTMLAnchorElement;link.href=detailHref(event);panel.append(link);
    const close=el('button','ew-panel-close','×') as HTMLButtonElement;close.type='button';close.setAttribute('aria-label','Close event');close.addEventListener('click',()=>{panel.hidden=true;});panel.append(close);
    state.map?.flyTo({center:event.coordinates,zoom:Math.max(state.map.getZoom(),4),duration:850});
  }
  function render(){
    /* EW-V162-STATE-REPAIR: selection popup must match the current event set. */
    const selection=byId('ew-map-selection');
    if(selection){selection.hidden=true;selection.replaceChildren();}
    makeFilters();renderCards();renderMapMarkers();
    setText('ew-kpi-events',String(allWithinDate().length));
    const cats=new Set(allWithinDate().map(e=>e.category));setText('ew-kpi-types',String(cats.size));
    setText('ew-map-count',`${filtered().length} shown`);
    for(const b of document.querySelectorAll<HTMLElement>('[data-days]')) b.classList.toggle('is-selected',Number(b.dataset.days)===state.days);
    for(const b of document.querySelectorAll<HTMLElement>('[data-mode]'))b.classList.toggle('is-selected',b.dataset.mode===state.mode);
    byId('ew-demo-banner').hidden=state.mode!=='demo';
    setText('ew-mode-label',state.mode==='demo'?'Sample data · not live':'Official feeds');
  }
  /* EW-V165-INTEGRATED: fast first paint, source health and real next-check clock. */
  type SourceState='waiting'|'ready'|'failed';
  const sourceNames=['NOAA IncidentNews','USGS','NASA EONET'];
  const cacheKey='spatialground-ew-v165-session';
  const checkMs=15*60*1000;
  let seq=0,loading=false,nextAt=0,lastMode:'demo'|'live'|null=null;
  let states:Record<string,SourceState>={};
  let lastResult:FeedResult|null=null;
  let abort:AbortController|null=null;
  function feedback(message:string,warning=false){
    const node=byId('ew-v165-health');if(node){node.textContent=message;node.classList.toggle('ew-v165-warning',warning);}
  }
  function cycle(stage:'start'|'complete'){
    root?.setAttribute('data-ew-v165-next',String(nextAt));
    root?.setAttribute('data-ew-v165-mode',state.mode);
    document.dispatchEvent(new CustomEvent('ew:v165-cycle',{detail:{stage,mode:state.mode,nextAt}}));
  }
  function paintSources(){
    const node=byId('ew-v165-sources');if(!node)return;
    node.replaceChildren();
    for(const name of sourceNames){
      const status=states[name]||'waiting';
      const tag=el('span','ew-v165-source ew-v165-'+status,(status==='ready'?'✓ ':status==='failed'?'! ':'◌ ')+name+' · '+(status==='ready'?'Ready':status==='failed'?'Unavailable':'Trying'));
      node.appendChild(tag);
    }
    document.dispatchEvent(new CustomEvent('ew:v165-sources',{detail:{statuses:{...states}}}));
  }
  function readSession():FeedResult|null{
    try{const saved=JSON.parse(sessionStorage.getItem(cacheKey)||'null');
      if(!saved||typeof saved.at!=='number'||Date.now()-saved.at>20*60*1000||saved.at>Date.now()+60000)return null;
      return Array.isArray(saved.result?.events)&&Array.isArray(saved.result?.successes)?saved.result:null;
    }catch{return null;}
  }
  function writeSession(result:FeedResult){
    if(result.successes.length)try{sessionStorage.setItem(cacheKey,JSON.stringify({at:Date.now(),result}));}catch{}
  }
  function rangeHint(){
    if(state.mode!=='live'||loading||!lastResult)return;
    const count=filtered().length;
    feedback(count?count+' displayed · checked: '+lastResult.successes.join(', ')+(lastResult.errors.length?' · unavailable: '+lastResult.errors.join(' | '):'')
      :'No matching records in '+state.days+' days. Try 30 / 60 / 90 days.'+(lastResult.errors.length?' Unavailable: '+lastResult.errors.join(' | '):''),lastResult.errors.length>0);
  }
  function setNoaaNote(result:FeedResult){
    const note=document.querySelector<HTMLElement>('.ew-v16-feed-note');if(!note)return;
    if(result.successes.includes('NOAA IncidentNews')){
      const date=result.noaaSyncedAt&&Number.isFinite(Date.parse(result.noaaSyncedAt))?new Date(result.noaaSyncedAt).toLocaleString():'not supplied';
      note.textContent='NOAA: selected agency response notifications; notification date is not incident start or active status. Snapshot generated: '+date+'.';
    }else note.textContent='NOAA local snapshot unavailable. Other official feeds are checked independently.';
  }
  function initialPending(){
    const cards=byId('ew-event-cards');
    if(!state.events.length){cards.replaceChildren(el('p','ew-v165-loading','Contacting official feeds… incidents will appear as each source responds.'));setText('ew-kpi-events','…');setText('ew-kpi-types','…');setText('ew-map-count','Checking feeds…');}
  }
  async function load(){
    const id=++seq;
    abort?.abort();abort=new AbortController();
    const requested=state.mode;
    nextAt=requested==='live'?Date.now()+checkMs:0;
    cycle('start');
    if(requested==='demo'){
      loading=false;lastMode='demo';lastResult=null;state.events=DEMO_EVENTS;state.errors=[];
      states={};setText('ew-kpi-sources','Demo');setText('ew-kpi-update','Paused');setText('ew-updated','Illustrative records');
      render();feedback('DEMO MODE · These incidents are fictional samples, not official observations.');
      byId('ew-v165-sources')?.replaceChildren();
      updateStatus('DEMO MODE — Sample data. Live refresh paused.');cycle('complete');return;
    }
    loading=true;
    const continuing=lastMode==='live'&&state.events.length>0;
    if(!continuing){state.events=[];const saved=readSession();if(saved)state.events=saved.events;}
    lastMode='live';lastResult=null;state.errors=[];
    states=Object.fromEntries(sourceNames.map(n=>[n,'waiting'])) as Record<string,SourceState>;
    render();paintSources();initialPending();
    setText('ew-kpi-sources','…');setText('ew-kpi-update','15 min');
    setText('ew-updated',state.events.length?'Showing previous results · checking updates…':'Connecting to official sources…');
    feedback(state.events.length?'Previously retrieved records are shown temporarily while official feeds are rechecked.':'Checking NOAA, USGS and NASA independently. First available records will appear immediately.');
    updateStatus('Checking official environmental records…');
    try{
      const result=await fetchLiveEvents(progress=>{
        if(id!==seq||state.mode!==requested)return;
        states[progress.source]=progress.outcome;
        paintSources();
        const current=progress.result;
        if(current.successes.length){
          state.events=current.events;state.errors=current.errors;render();setNoaaNote(current);
          setText('ew-kpi-sources',String(current.successes.length));
          setText('ew-updated','Checked '+progress.completed+'/3 · '+new Date().toLocaleTimeString());
          feedback(filtered().length+' records displayed · '+progress.completed+'/3 checked · '+(3-progress.completed)+' still trying'+(current.errors.length?' · '+current.errors.join(' | '):''),current.errors.length>0);
          document.dispatchEvent(new CustomEvent('ew:feed-retrieved',{detail:{iso:current.fetchedAt}}));
        }else feedback(progress.completed+'/3 feeds checked; still trying other sources…'+(current.errors.length?' · '+current.errors.join(' | '):''),current.errors.length>0);
      },abort.signal);
      if(id!==seq||state.mode!==requested)return;
      loading=false;cycle('complete');lastResult=result;state.errors=result.errors;
      if(result.successes.length){
        state.events=result.events;render();writeSession(result);setNoaaNote(result);
        setText('ew-kpi-sources',String(result.successes.length));setText('ew-updated','Checked '+new Date(result.fetchedAt).toLocaleString());rangeHint();
        updateStatus(result.successes.join(' + ')+' · '+result.events.length+' source records collected'+(result.errors.length?' · Partial coverage':''),result.errors.length>0);
      }else{
        setText('ew-kpi-sources','0');setText('ew-updated','All feeds unavailable');
        if(!state.events.length){render();feedback('Live feeds unavailable. Try Refresh. No demo records have been substituted.',true);}
        else feedback('All checks failed. PREVIOUS RESULTS are shown and may be out of date.',true);
        updateStatus('Official feeds unavailable. See source statuses.',true);
      }
    }catch(error){
      if(id!==seq||state.mode!==requested)return;
      loading=false;cycle('complete');
      feedback('Unexpected feed error: '+(error instanceof Error?error.message:String(error)),true);
      updateStatus('Live check failed. Previously displayed records may be stale.',true);
    }
  }
  async function initMap(){
    try{
      ml=await loadEwMapLibre();
      state.map=new ml.Map({
        container:'ew-map',style:'https://tiles.openfreemap.org/styles/liberty',
        center:[-107,41],zoom:2.5,minZoom:1.7,maxZoom:19,cancelPendingTileRequestsWhileZooming:false,attributionControl:false
      });

      // EW-V168-MAP-REPAIR: one control supplied by installEnvironmentalMapTheme.

      state.map.addControl(new ml.NavigationControl({showCompass:false}),'bottom-left');
      installEnvironmentalMapTheme(state.map);
      state.map.addControl(new ml.AttributionControl({compact:true}),'bottom-right');
      /* EW-V161-SCALE */ state.map.addControl(new maplibregl.ScaleControl({maxWidth:120,unit:'metric'}),'bottom-left');
      state.map.on('load',()=>{renderMapMarkers();byId('ew-map-help').hidden=true;});
      state.map.on('error',(e)=>{console.warn('[Environmental Watch OpenFreeMap]',e.error);});
    }catch{
      byId('ew-map-help').hidden=false;
    }
  }
  // V1.6: date windows and natural vs. human-caused incidents; preserve legacy controls.
  function installV16Controls(){
    const toolbar=byId('ew-filters').closest('.ew-map-toolbar');
    if(!toolbar) return;
    const days=toolbar.querySelector<HTMLButtonElement>('[data-days="30"]');
    const row=days?.parentElement;
    if(row&&days){
      for(const value of [60,90]) if(!row.querySelector('[data-days="'+value+'"]')){
        const button=document.createElement('button');
        button.type='button';button.className='ew-small-btn';button.dataset.days=String(value);button.textContent=value+' days';
        row.appendChild(button);
      }
    }
    if(!toolbar.previousElementSibling?.classList.contains('ew-v16-groupbar')){
      const groupbar=document.createElement('div');groupbar.className='ew-v16-groupbar';groupbar.setAttribute('aria-label','Select event origin');
      for(const [group,label] of [['all','All events'],['natural','Natural hazards'],['human','Oil & chemical']] as const){
        const button=document.createElement('button');button.type='button';button.dataset.ewGroup=group;button.textContent=label;
        button.addEventListener('click',()=>{state.group=group;state.category='all';render();updateV16GroupButtons();});
        groupbar.append(button);
      }
      toolbar.insertAdjacentElement('beforebegin',groupbar);
    }
    if(!document.querySelector('.ew-v16-feed-note')){
      const note=document.createElement('div');note.className='ew-v16-feed-note';note.textContent='NOAA IncidentNews: selected oil/chemical responses; notified date, not verified active status.';
      toolbar.insertAdjacentElement('afterend',note);
    }
    updateV16GroupButtons();
  }
  function updateV16GroupButtons(){
    document.querySelectorAll<HTMLButtonElement>('[data-ew-group]').forEach(b=>{
      b.classList.toggle('is-selected',b.dataset.ewGroup===state.group);
      b.setAttribute('aria-pressed',String(b.dataset.ewGroup===state.group));
    });
  }
  installV16Controls();
  if(!document.getElementById('ew-v165-health')){
    const health=el('div','ew-v165-health');health.id='ew-v165-health';health.setAttribute('role','status');health.setAttribute('aria-live','polite');
    document.querySelector('.ew-v16-feed-note')?.insertAdjacentElement('afterend',health);
    const sources=el('div','ew-v165-sources');sources.id='ew-v165-sources';sources.setAttribute('aria-label','Official source status');
    health.insertAdjacentElement('afterend',sources);
  }
  for(const b of document.querySelectorAll<HTMLElement>('[data-mode]')) b.addEventListener('click',()=>{
    state.mode=b.dataset.mode as 'demo'|'live';state.category='all';load();
    const url=new URL(location.href);if(state.mode==='demo')url.searchParams.set('demo','1');else url.searchParams.delete('demo');history.replaceState({},'',url);
  });
  for(const b of document.querySelectorAll<HTMLElement>('[data-days]')) b.addEventListener('click',()=>{state.days=Number(b.dataset.days)||30;render();rangeHint();});
  byId('ew-refresh').addEventListener('click',load);
  initMap();void load();
  function checkDue(){if(state.mode==='live'&&document.visibilityState==='visible'&&nextAt>0&&Date.now()>=nextAt&&!loading)void load();}
  setInterval(checkDue,1000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')checkDue();});

}
