import { ENVIRONMENTAL_MAP_STYLE, ENVIRONMENTAL_LIGHT_STYLE, installEnvironmentalMapTheme } from './mapTheme';import {loadEwMapLibre} from './ewMapLibre';
import {DEMO_EVENTS, categoryColor, categoryIcon, categoryLabel, displayDate, normalizeEonet, normalizeUsgs, normalizeNoaaSnapshot, validUrl, type EnvironmentalEvent} from './data';
const root=document.querySelector<HTMLElement>('.ew-app[data-page="detail"]');
if(root){
  const q=new URLSearchParams(location.search);
  const source=q.get('source'), id=q.get('id');
  const dashboardHref='/environmental-watch/#ew-live-map';
  document.querySelectorAll<HTMLAnchorElement>('.ew-return,.ew-back-site,.ew-detail-return-float').forEach(link=>{link.href=dashboardHref;});
  const byId=(id:string)=>document.getElementById(id)!;
  const setText=(id:string,t:string)=>{byId(id).textContent=t;};
  async function get():Promise<EnvironmentalEvent|null>{
    if(!id||!source)return null;
    if(source==='demo')return null; // EW-V1614-NO-SAMPLE
    if(source==='eonet'){
      if(!/^[\w-]{1,100}$/.test(id))return null;
      const r=await fetch(`https://eonet.gsfc.nasa.gov/api/v3/events/${encodeURIComponent(id)}`);
      if(!r.ok)throw new Error(`NASA EONET HTTP ${r.status}`);
      const e=await r.json();
      return normalizeEonet({events:[e]})[0]||null;
    }
    // EW-V16-NOAA-DETAIL — load the same first-party NOAA snapshot used by the dashboard.
    if(source==='noaa'){
      if(!/^\d{1,12}$/.test(id))return null;
      const r=await fetch('/environmental-watch/noaa-incidents.json',{cache:'no-store'});
      if(!r.ok)throw new Error('NOAA snapshot unavailable, HTTP '+r.status);
      const collection=normalizeNoaaSnapshot(await r.json());
      return collection.find(e=>e.id===id)||null;
    }
    if(source==='usgs'){
      if(!/^[\w-]{1,100}$/.test(id))return null;
      const r=await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&eventid=${encodeURIComponent(id)}`);
      if(!r.ok)throw new Error(`USGS HTTP ${r.status}`);
      const e=await r.json();
      return normalizeUsgs({features:[e]})[0]||null;
    }
    return null;
  }
  function textNode(tag:string,t:string,cls=''){const el=document.createElement(tag);el.textContent=t;if(cls)el.className=cls;return el;}
  async function render(e:EnvironmentalEvent){
    document.title=`${e.title} | SpatialGround Environmental Watch`;
    setText('ew-detail-category',`${categoryIcon(e.category)} ${categoryLabel(e.category).toUpperCase()}`);
    setText('ew-detail-title',e.title);
    setText('ew-detail-subtitle',e.sourceName);
    setText('ew-detail-status',e.status);
    setText('ew-detail-reported',displayDate(e.observed));
    setText('ew-detail-location',e.location);
    setText('ew-detail-type',categoryLabel(e.category));
    setText('ew-detail-provider',e.sourceName);
    setText('ew-detail-id',e.id);
    setText('ew-detail-coords',e.coordinates[1].toFixed(5)+'° lat, '+e.coordinates[0].toFixed(5)+'° lon');
    // EONET fallback language must agree with source open/closed flag.
    const desc=(e.source==='eonet' && e.status.startsWith('Closed') && /^An open natural event tracked by NASA EONET/.test(e.description))
      ? 'An event tracked by NASA EONET and marked closed in the current source record. Its reported location may be an observation or approximate geographic center; this is not an emergency warning.'
      : e.description;
    setText('ew-detail-desc',desc);
    setText('ew-detail-record',e.magnitude!==null?`Magnitude ${e.magnitude}${e.depthKm!==null?` · depth ${e.depthKm.toFixed(1)} km`:''}`:'No standardized area or intensity measurement provided for this record.');
    /* EW-V161-DETAIL-COORDINATES: auditable source coordinates. */
    const [longitude,latitude]=e.coordinates;
    const qa=document.createElement('p');qa.className='ew-v161-coordinates';
    qa.append(document.createTextNode('Source point: '+latitude.toFixed(5)+'°, '+longitude.toFixed(5)+'°. Open independent map: '));
    const qaLink=document.createElement('a');qaLink.textContent='View coordinate on OpenStreetMap ↗';
    qaLink.href='https://www.openstreetmap.org/?mlat='+latitude+'&mlon='+longitude+'#map=8/'+latitude+'/'+longitude;
    qaLink.target='_blank';qaLink.rel='noopener noreferrer';qa.append(qaLink);
    const mapSection=byId('ew-detail-map').closest('.ew-panel');
    mapSection?.querySelector('.ew-detail-map-shell')?.insertAdjacentElement('afterend',qa);
    const oldNote=document.getElementById('ew171-source-note');oldNote?.remove();
    const note=document.createElement('p');note.id='ew171-source-note';note.className='ew171-source-note';
    note.textContent=e.source==='usgs'?'USGS epicenter point, from earthquake GeoJSON; depth is measured separately.'
      :e.source==='eonet'?'Latest NASA EONET event geometry; polygon coordinates may be represented by an approximate bounding-box center. This is not an impact boundary.'
      :e.source==='noaa'?'NOAA response-notification point from the synchronized snapshot. It may be approximate and is not proof of a confirmed oil/chemical release.'
      :'Illustrative sample point; not a real incident.';
    byId('ew-detail-map').closest('.ew-panel')?.querySelector('.ew-panel-bar')?.insertAdjacentElement('afterend',note);
    const first=byId('ew-detail-link') as HTMLAnchorElement;first.href=validUrl(e.sourceUrl)||'https://eonet.gsfc.nasa.gov/';first.textContent=`Open ${e.sourceName} record ↗`;
    const second=byId('ew-detail-link2') as HTMLAnchorElement;second.href=first.href;
    const warning=byId('ew-detail-demo');warning.hidden=e.source!=='demo';
    byId('ew-detail-loading').hidden=true;
    byId('ew-detail-main').hidden=false;
    const impacts:Record<string,string[]>={
      wildfire:['Potential vegetation loss and changes to forest structure','Possible wildlife habitat disturbance and smoke exposure','Post-fire erosion and watershed runoff may require monitoring'],
      storm:['Possible wind damage and vegetation disturbance','Heavy rainfall can increase runoff and flood risk','Coastal ecosystems may be affected by surge or erosion'],
      flood:['Possible changes to riverbanks and floodplain habitats','Sediment transport and water quality may change','Potential effects on wetland and riparian ecosystems'],
      volcano:['Potential ashfall effects on vegetation and water','Hazards may include lava, gas or particulate matter','Long-term landscape change may create new habitats'],
      earthquake:['Potential landslides and geomorphic disturbance','Possible effects on infrastructure and aquatic habitats','Observed impacts require independent confirmation'],
      drought:['Water stress can affect vegetation and wildlife','Reduced streamflow may alter aquatic habitats','Drought effects vary by region and duration'],
      'oil-spill':['Potential contamination of coastal or freshwater habitats','Extent and actual released volume require official confirmation','Monitor shoreline and wildlife impact reports from response agencies'],
      'chemical-release':['Potential effects depend on the released substance and exposure','Water and air monitoring may be required if releases are confirmed','Check official incident reports for measured impacts'],
      other:['Environmental consequences depend on event type','Source data describe the event, not measured ecosystem harm','Follow official reporting for confirmed local impacts']
    };
    const list=byId('ew-impact-list');list.replaceChildren(...(impacts[e.category]||impacts.other).map(t=>textNode('li',t)));
    /* EW-V1612-DETAIL-STABILITY: verified independent engine and source-point overlay. */
    const ml=await loadEwMapLibre();
    const locationMap=new ml.Map({container:'ew-detail-map',style:ENVIRONMENTAL_MAP_STYLE,center:e.coordinates,zoom:e.category==='earthquake'?5.8:7,minZoom:1.7,maxZoom:19,cancelPendingTileRequestsWhileZooming:false,attributionControl:false});
    locationMap.addControl(new ml.NavigationControl({showCompass:false}),'top-right');
    installEnvironmentalMapTheme(locationMap);
    locationMap.addControl(new ml.AttributionControl({compact:true}),'bottom-right');
    /* EW-V161-DETAIL-SCALE */ locationMap.addControl(new ml.ScaleControl({maxWidth:120,unit:'metric'}),'bottom-left');
    /* EW-V1712-SHELL-MARKER — independent visible HTML layer on top of the map.
     * The source coordinate stays unchanged; map.project() positions the icon
     * in the SAME projection as the OpenFreeMap map. Drag/zoom updates it.
     * The icon is OUTSIDE the MapLibre container, so canvas/marker CSS cannot
     * cover or remove it, and it does not affect map pointer interaction. */
    const sourcePoint=e.coordinates;
    const mapElement=byId('ew-detail-map') as HTMLElement;
    const markerShell=mapElement.closest('.ew-detail-map-shell') as HTMLElement|null;
    if(markerShell){
      // Remove any obsolete HTML marker without modifying the map instance.
      markerShell.querySelectorAll('#ew-v1712-marker-layer').forEach(el=>el.remove());
      const overlay=document.createElement('div');
      overlay.id='ew-v1712-marker-layer';
      overlay.setAttribute('aria-hidden','true');
      overlay.style.setProperty('position','absolute','important');
      overlay.style.setProperty('inset','0','important');
      overlay.style.setProperty('z-index','2147483000','important');
      overlay.style.setProperty('pointer-events','none','important');
      overlay.style.setProperty('overflow','hidden','important');
      markerShell.appendChild(overlay);
      const pin=document.createElement('div');
      pin.id='ew-v1712-visible-source-pin';
      const color=categoryColor(e.category);
      pin.style.setProperty('position','absolute','important');
      pin.style.setProperty('display','flex','important');
      pin.style.setProperty('align-items','center','important');
      pin.style.setProperty('justify-content','center','important');
      pin.style.setProperty('width','48px','important');
      pin.style.setProperty('height','48px','important');
      pin.style.setProperty('box-sizing','border-box','important');
      pin.style.setProperty('border','3px solid '+color,'important');
      pin.style.setProperty('border-radius','50%','important');
      pin.style.setProperty('background','#08242f','important');
      pin.style.setProperty('box-shadow','0 0 0 5px rgba(4,24,31,.62), 0 0 20px 4px '+color,'important');
      pin.style.setProperty('transform','translate(-50%,-50%)','important');
      pin.style.setProperty('font-size','25px','important');
      pin.style.setProperty('line-height','1','important');
      pin.style.setProperty('color','#fff','important');
      pin.style.setProperty('opacity','1','important');
      const glyph=document.createElement('span');
      if(e.category==='earthquake'){
        glyph.innerHTML='<svg viewBox="0 0 24 24" width="30" height="30" aria-hidden="true" style="fill:none;stroke:#fff;stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round"><path d="M2 12h3l2.5-5 2.4 10 3.3-13 3.1 16 2.2-8H22"/></svg>';
      }else{
        glyph.textContent=categoryIcon(e.category);
      }
      pin.appendChild(glyph);
      overlay.appendChild(pin);
      const reposition=()=>{
        try{
          const mapRect=mapElement.getBoundingClientRect();
          const shellRect=markerShell.getBoundingClientRect();
          const p=locationMap.project(sourcePoint);
          const x=mapRect.left-shellRect.left+p.x;
          const y=mapRect.top-shellRect.top+p.y;
          const valid=Number.isFinite(x)&&Number.isFinite(y)
            &&x>=-24&&y>=-24&&x<=shellRect.width+24&&y<=shellRect.height+24;
          pin.style.setProperty('visibility',valid?'visible':'hidden','important');
          markerShell.dataset.ewSourcePin=valid?'visible':'outside-view';
          if(valid){
            pin.style.setProperty('left',x+'px','important');
            pin.style.setProperty('top',y+'px','important');
          }
        }catch(err){
          markerShell.dataset.ewSourcePin='projection-error';
          console.warn('[Environmental Watch source marker]',err);
        }
      };
      for(const evt of ['load','render','move','zoom','resize','style.load']){
        locationMap.on(evt,reposition);
      }
      if(typeof ResizeObserver!=='undefined'){
        const resize=new ResizeObserver(reposition);
        resize.observe(markerShell);
      }
      reposition();
      requestAnimationFrame(reposition);
      setTimeout(reposition,300);
      console.info('[Environmental Watch] External source icon initialized',e.category,sourcePoint);
    }
    const mapHolder=byId('ew-detail-map').closest('.ew-detail-map-shell');
    if(mapHolder && !document.getElementById('ew171-center-point')){
      const locate=document.createElement('button');locate.type='button';locate.id='ew171-center-point';
      locate.className='ew-small-btn';locate.textContent='Center on source point';
      locate.style.cssText='position:absolute;bottom:12px;left:12px;z-index:8;background:#082732;color:#67e6da;border:1px solid #35a5a2;padding:7px 10px;border-radius:6px';
      locate.addEventListener('click',()=>locationMap.easeTo({center:e.coordinates,zoom:Math.max(locationMap.getZoom(),8),duration:400}));
      mapHolder.append(locate);
    }
    locationMap.on('error',(e)=>{console.warn('[Environmental Watch offline detail map]',e.error);});
    for(const tab of document.querySelectorAll<HTMLAnchorElement>('.ew-tab'))tab.addEventListener('click',()=>{for(const t of document.querySelectorAll('.ew-tab'))t.classList.remove('is-selected');tab.classList.add('is-selected');});
  }
  get().then(async e=>{if(!e)throw new Error('Event not found or outside supported geographic/magnitude filters.');await render(e);}).catch(err=>{
    byId('ew-detail-loading').hidden=false;
    setText('ew-detail-loading',`Unable to load event: ${String(err.message||err)}. Return to the dashboard and choose an event again.`);
  });
}
