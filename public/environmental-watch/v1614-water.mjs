// Independent featured map. Never changes the main event map or its sources.
// Presentation preference, not a hazard warning or official risk ranking.
export function chooseWater(drought,flood){
  const d=drought?.geo.features, f=flood?.geo.features;
  if(!d&&!f)return {kind:null,reason:'Neither source available; no recommendation.'};
  if(!d)return {kind:'flood',reason:'Drought unavailable; showing available river observations.'};
  if(!f)return {kind:'drought',reason:'Flood unavailable; showing available drought assessment.'};
  const serious=f.filter(x=>['major','moderate'].includes(x.properties?.status)).length;
  if(serious)return {kind:'flood',reason:`${serious} moderate/major flood gauges reported; flood featured.`};
  if(d.some(x=>[3,4].includes(Number(x.properties?.DM))))return {kind:'drought',reason:'D3/D4 drought reported; no moderate/major flood gauges returned.'};
  if(f.some(x=>x.properties?.status==='minor'))return {kind:'flood',reason:'Minor flooding reported; no D3/D4 or moderate/major flood gauges returned.'};
  return {kind:'drought',reason:'Default background drought assessment; no higher-priority conditions returned.'};
}
const panel=typeof document==='undefined'?null:document.getElementById('ew1614-water');
if(panel){
 const $=id=>document.getElementById('ew1614-'+id);
 const definitions={
  drought:{title:'Drought & Water Stress',desc:'Current U.S. Drought Monitor classifications. D0 is abnormal dryness; D1–D4 indicate drought intensity.',url:'https://www.drought.gov/data-maps-tools/us-drought-monitor-usdm',attribution:'U.S. Drought Monitor / NDMC, USDA, NOAA, NASA',endpoint:'https://services5.arcgis.com/0OTVzJS4K09zlixn/ArcGIS/rest/services/USDM_current/FeatureServer/0/query',where:'DM >= 0 AND DM <= 4',fields:'OBJECTID,DM,MapDate',oid:'OBJECTID',limit:100,legend:[['D0 Dry','#ffff00'],['D1 Moderate','#fcd37f'],['D2 Severe','#ffaa00'],['D3 Extreme','#e60000'],['D4 Exceptional','#730000']]},
  flood:{title:'Flood / River Stages',desc:'Observed river gauges at action stage or in minor, moderate or major flooding. Points represent gauges, not inundation boundaries or forecasts.',url:'https://water.noaa.gov/',attribution:'NOAA / NWS National Water Prediction Service',endpoint:'https://mapservices.weather.noaa.gov/eventdriven/rest/services/water/riv_gauges/MapServer/0/query',where:"status IN ('action','minor','moderate','major')",fields:'objectid,gaugelid,status,location,waterbody,state,obstime,observed,units',oid:'objectid',limit:500,legend:[['Action / near flood','#ffff00'],['Minor','#ff9900'],['Moderate','#ff0000'],['Major','#cc33ff']]}
 };
 let active='drought',mode='auto',map=null,engine=null,started=false,mapReady=false,popup=null,drawn=null;
 const kinds=['drought','flood'],interval=15*60*1000,states=new Map(),inflight=new Map();
 try{const saved=localStorage.getItem('sg-ew-water-mode');if(['auto',...kinds].includes(saved))mode=saved;}catch{}
 if(mode!=='auto')active=mode;
 const cache=new Map();
 function status(s,error=false){$('status').textContent=s;$('status').dataset.error=String(error);}
 function updateUI(){const d=definitions[active];$('title').textContent=d.title;$('desc').textContent=d.desc;$('source').href=d.url;$('source').textContent=active==='drought'?'U.S. Drought Monitor ↗':'NOAA / NWS water data ↗';$('legend').replaceChildren(...d.legend.map(([label,color])=>{const s=document.createElement('span'),i=document.createElement('i');i.style.background=color;s.append(i,document.createTextNode(label));return s;}));panel.querySelectorAll('[data-water]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.water===mode)));}
 async function fetchJSON(url,signal){const response=await fetch(url,{signal,cache:'no-store'});if(!response.ok)throw Error('HTTP '+response.status);const data=await response.json();if(data.error)throw Error(data.error.message||'GIS service error');return data;}
 async function query(kind,signal){const d=definitions[kind];const params=new URLSearchParams({where:d.where,outFields:d.fields,returnGeometry:'true',outSR:'4326',f:'geojson',orderByFields:d.oid+' ASC',resultRecordCount:String(d.limit)});if(kind==='drought'){params.set('maxAllowableOffset','0.015');params.set('geometryPrecision','4');}
 const countParams=new URLSearchParams({where:d.where,returnCountOnly:'true',f:'json'});const count=await fetchJSON(d.endpoint+'?'+countParams,signal);if(!Number.isInteger(count.count)||count.count<0)throw Error('GIS count unavailable');const features=[];const seen=new Set();let offset=0;for(let page=0;page<100;page++){params.set('resultOffset',String(offset));const data=await fetchJSON(d.endpoint+'?'+params,signal);if(data.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Unexpected GIS response');for(const f of data.features){const p=f.properties||{},key=p[d.oid]??f.id;if(key==null||seen.has(key))throw Error('Duplicate or missing GIS feature ID');seen.add(key);const valid=kind==='drought'?p.DM!=null&&[0,1,2,3,4].includes(Number(p.DM))&&['Polygon','MultiPolygon'].includes(f.geometry?.type):['action','minor','moderate','major'].includes(p.status)&&f.geometry?.type==='Point'&&Array.isArray(f.geometry.coordinates)&&Number.isFinite(f.geometry.coordinates[0])&&Number.isFinite(f.geometry.coordinates[1])&&Math.abs(f.geometry.coordinates[0])<=180&&Math.abs(f.geometry.coordinates[1])<=90;if(!valid)throw Error('Unexpected geometry or class from '+kind);features.push(f);}if(features.length===count.count)return {type:'FeatureCollection',features};if(features.length>count.count)throw Error('GIS data changed during query; retry');if(data.features.length<d.limit&&!data.exceededTransferLimit&&!data.properties?.exceededTransferLimit)throw Error('GIS query incomplete or changed; retry');if(!data.features.length)throw Error('GIS pagination incomplete');offset+=data.features.length;}throw Error('GIS result exceeded safe page limit');}
 function clearLayer(){popup?.remove();popup=null;for(const id of ['ew1614-fill','ew1614-line','ew1614-points'])if(map?.getLayer(id))map.removeLayer(id);if(map?.getSource('ew1614-data'))map.removeSource('ew1614-data');}
 function render(kind,result){clearLayer();const d=definitions[kind];map.addSource('ew1614-data',{type:'geojson',data:result.geo,attribution:d.attribution});if(kind==='drought'){
 const paint=['match',['to-number',['get','DM'] ],0,'#ffff00',1,'#fcd37f',2,'#ffaa00',3,'#e60000',4,'#730000','#999999'];const firstLabel=map.getStyle().layers.find(l=>l.type==='symbol')?.id;map.addLayer({id:'ew1614-fill',type:'fill',source:'ew1614-data',paint:{'fill-color':paint,'fill-opacity':0.67}},firstLabel);map.addLayer({id:'ew1614-line',type:'line',source:'ew1614-data',paint:{'line-color':paint,'line-width':0.5}},firstLabel);
 }else{map.addLayer({id:'ew1614-points',type:'circle',source:'ew1614-data',paint:{'circle-radius':['interpolate',['linear'],['zoom'],2,4,8,7,14,10],'circle-color':['match',['get','status'],'action','#ffff00','minor','#ff9900','moderate','#ff0000','major','#cc33ff','#888888'],'circle-stroke-color':'#273341','circle-stroke-width':1.3}});}
 const fetched=new Date(result.at).toLocaleString();const old=Date.now()-result.at>=15*60*1000?' · previous retrieval; refreshing':'';
 if(kind==='drought'){const dates=result.geo.features.map(f=>f.properties?.MapDate).filter(v=>v!=null).map(v=>typeof v==='number'?v:Date.parse(v)).filter(Number.isFinite);status((dates.length?'Map valid: '+new Date(Math.max(...dates)).toISOString().slice(0,10):'Map validity date not supplied')+' · Retrieved '+fetched+old);}
 else{const counts={action:0,minor:0,moderate:0,major:0};for(const f of result.geo.features){const s=f.properties?.status;if(Object.hasOwn(counts,s))counts[s]++;}status(`Observed gauges: ${counts.action} action · ${counts.minor} minor · ${counts.moderate} moderate · ${counts.major} major. Retrieved ${fetched}${old}. Zero marks here does not establish absence of flooding.`);}}
 function updateFeeds(){
  for(const k of kinds){const s=states.get(k);const el=document.getElementById('ew1615-'+k+'-state');el.dataset.state=s?.state||'waiting';el.textContent=(k==='drought'?'Drought':'Flood')+' · '+({loading:'Checking…',ready:'Ready',failed:cache.has(k)?'Previous data':'Unavailable'}[s?.state]||'Waiting');}
 }
 function evaluate(){
  if(!mapReady)return; updateFeeds();
  const fresh=k=>states.get(k)?.state==='ready'?cache.get(k):undefined;
  const ready=kinds.filter(k=>fresh(k));
  const waiting=kinds.filter(k=>states.get(k)?.state==='loading'||!states.has(k));
  let reason='';let next=mode;
  if(mode==='auto'){
   if(waiting.length){next=fresh(active)?active:ready[0]||active;reason='Auto · Comparing official sources: '+waiting.join(' / ')+'…';}
   else {const choice=chooseWater(fresh('drought'),fresh('flood'));next=choice.kind||active;reason='Auto · '+choice.reason;}
  } else reason='Manual · '+(mode==='drought'?'Drought selected':'Flood selected')+' · selection retained on refresh.';
  active=next;updateUI();document.getElementById('ew1615-reason').textContent=reason;
  const result=cache.get(active),state=states.get(active);
  if(result){
   if(drawn!==result){try{render(active,result);drawn=result;}catch(e){drawn=null;status('Unable to draw official water layer: '+String(e?.message||e),true);return;}}
   if(state?.state==='loading')status('Showing previous retrieval · checking '+active+' source…');
   if(state?.state==='failed')status('Previous retrieval '+new Date(result.at).toLocaleString()+' remains visible · '+state.error,true);
  }else{if(drawn){clearLayer();drawn=null;}status(state?.state==='failed'?'Official '+active+' data unavailable: '+state.error:(state?.state==='ready'?'No water data returned.':'Loading official '+(active==='drought'?'drought geometry':'river observations')+'…'),state?.state==='failed');}
 }
 function getLayer(kind,force=false){
  if(inflight.has(kind))return inflight.get(kind);
  const existing=cache.get(kind);
  if(!force&&existing&&states.get(kind)?.state==='ready'&&Date.now()-existing.at<interval)return Promise.resolve();
  states.set(kind,{state:'loading'});
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
  const task=(async()=>{try{const geo=await query(kind,controller.signal);cache.set(kind,{geo,at:Date.now()});states.set(kind,{state:'ready'});}catch(e){states.set(kind,{state:'failed',error:e?.name==='AbortError'?'Request timed out':String(e?.message||e)});}finally{clearTimeout(timer);inflight.delete(kind);evaluate();}})();
  inflight.set(kind,task);return task;
 }
 function refresh(force=false){if(!mapReady)return;const targets=mode==='auto'?kinds:[mode];for(const k of targets)getLayer(k,force);evaluate();}
 async function start(){if(started)return;started=true;status('Loading water map…');try{await import('./ew-maplibre-bridge.mjs');engine=window.__EW_MAPLIBRE_API__;if(!engine?.Map)throw Error('MapLibre module not ready');map=new engine.Map({container:$('map'),style:'https://tiles.openfreemap.org/styles/liberty',center:[-98,39],zoom:2.7,minZoom:1,maxZoom:15,attributionControl:{compact:true,customAttribution:'<a href="https://maplibre.org/" target="_blank" rel="noopener noreferrer">MapLibre</a>'},scrollZoom:true});map.addControl(new engine.NavigationControl({showCompass:false}),'top-right');
 /* EW-V1619-COLLAPSE-CREDIT */
 const collapseWaterCredit=()=>{
   const credit=$('map').querySelector('.maplibregl-ctrl-attrib.maplibregl-compact');
   if(!credit)return;
   credit.classList.remove('maplibregl-compact-show');
   if(credit.tagName==='DETAILS')credit.removeAttribute('open');
 };
 collapseWaterCredit();
 map.once('load',collapseWaterCredit);
 map.on('movestart',collapseWaterCredit);
 map.on('resize',collapseWaterCredit);
 const observer=new ResizeObserver(()=>map.resize());observer.observe($('map'));map.on('load',()=>{mapReady=true;map.fitBounds([[-126,24],[-65,50]],{padding:12,duration:0});refresh();});map.on('click',e=>{const layers=active==='drought'?['ew1614-fill']:['ew1614-points'];if(!map.getLayer(layers[0]))return;const f=map.queryRenderedFeatures(e.point,{layers})[0];if(!f)return;const p=f.properties||{};const content=document.createElement('div');content.textContent=active==='drought'?'D'+p.DM+' · '+(definitions.drought.legend[Number(p.DM)]?.[0]||'Drought class'):[p.location,p.waterbody,p.state,p.status,p.observed!=null?`${p.observed} ${p.units||''}`:'',p.obstime?'Observed: '+p.obstime:''].filter(Boolean).join(' · ');popup?.remove();popup=new engine.Popup().setLngLat(e.lngLat).setDOMContent(content).addTo(map);});map.on('error',e=>{console.warn('[EW water map]',e.error);});setTimeout(()=>{if(!mapReady)status('Basemap is taking longer than expected. Use official source or reload the page.',true);},18000);}catch(e){status('Water map unavailable: '+String(e?.message||e)+'. Open official source.',true);}}
 panel.querySelectorAll('[data-water]').forEach(b=>b.addEventListener('click',()=>{const choice=b.dataset.water;if(!['auto',...kinds].includes(choice))return;mode=choice;if(mode!=='auto')active=mode;try{localStorage.setItem('sg-ew-water-mode',mode);}catch{}updateUI();if(!started)start();else refresh();}));
 $('refresh').addEventListener('click',()=>{if(!started)start();else refresh(true);});updateUI();updateFeeds();
 if('IntersectionObserver' in window){const io=new IntersectionObserver(es=>{if(es.some(e=>e.isIntersecting)){io.disconnect();start();}},{rootMargin:'100px'});io.observe(panel);}else start();
 setInterval(()=>{if(started&&document.visibilityState==='visible'&&mapReady)refresh(true);},interval);
}
