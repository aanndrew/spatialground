// SpatialGround Environmental Watch V1.6: EONET + USGS (90d) + NOAA source snapshots
// Sources: NASA EONET v3 and USGS Earthquake Hazards GeoJSON. No stored events.
export type EventCategory = 'wildfire' | 'storm' | 'flood' | 'volcano' | 'earthquake' | 'drought' | 'other' | 'oil-spill' | 'chemical-release';
export type EventSource = 'eonet' | 'usgs' | 'noaa' | 'demo';
export type EnvironmentalEvent = {
  id: string;
  source: EventSource;
  category: EventCategory;
  title: string;
  coordinates: [number, number];
  location: string;
  observed: string | null;
  status: string;
  description: string;
  magnitude: number | null;
  depthKm: number | null;
  sourceUrl: string;
  sourceName: string;
};

export const EONET_API = 'https://eonet.gsfc.nasa.gov/api/v3/events?status=all&limit=1000&days=90';
export const NOAA_SNAPSHOT = '/environmental-watch/noaa-incidents.json';
// Historical USGS query rather than weekly feed: make 30/60/90-day controls meaningful.
function usgsQueryUrl() {
  const start = new Date(Date.now() - 90 * 86400000).toISOString().slice(0,10);
  const q = new URLSearchParams({format:'geojson',starttime:start,minmagnitude:'5',orderby:'time',limit:'1200',minlatitude:'6',maxlatitude:'84',minlongitude:'-170',maxlongitude:'-50'});
  return `https://earthquake.usgs.gov/fdsnws/event/1/query?${q}`;
}

export const CATEGORIES: {id: string; label: string; icon: string; color: string}[] = [
  {id:'all', label:'All events', icon:'◈', color:'#53e1ce'},
  {id:'wildfire', label:'Wildfire', icon:'🔥', color:'#ff7555'},
  {id:'storm', label:'Storm', icon:'🌀', color:'#b38aff'},
  {id:'flood', label:'Flood', icon:'💧', color:'#59b8ff'},
  {id:'earthquake', label:'Earthquake', icon:'◆', color:'#ffc16b'},
  {id:'volcano', label:'Volcano', icon:'▲', color:'#ff6490'},
  {id:'drought', label:'Drought', icon:'☀', color:'#edc76e'},
  {id:'oil-spill', label:'Oil spill', icon:'🛢️', color:'#ffab63'},
  {id:'chemical-release', label:'Chemical', icon:'⚗️', color:'#db98ee'},
  {id:'other', label:'Other', icon:'◌', color:'#a0b7ba'},
];

const CATEGORY_MAP: Record<string, EventCategory> = {
  wildfires:'wildfire', severeStorms:'storm', floods:'flood', volcanoes:'volcano', drought:'drought',
  landslides:'other', seaLakeIce:'other', snow:'other', dustHaze:'other', temperatureExtremes:'other',
};

export function validUrl(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  try { const url = new URL(raw); return ['https:','http:'].includes(url.protocol) ? url.href : ''; }
  catch { return ''; }
}

export function isNorthAmerica(lon: number, lat: number): boolean {
  // Broad continental bbox, including Alaska, Mexico, Canada and Hawaii.
  // Geographic filter, not a land-polygon classification.
  return Number.isFinite(lon) && Number.isFinite(lat) && lon >= -170 && lon <= -50 && lat >= 6 && lat <= 84;
}

function centerOfGeometry(g: any): [number, number] | null {
  if (!g || !Array.isArray(g.coordinates)) return null;
  const positions: number[][] = [];
  function walk(v: any): void {
    if (!Array.isArray(v)) return;
    if (typeof v[0] === 'number' && typeof v[1] === 'number') { positions.push(v as number[]); return; }
    v.forEach(walk);
  }
  walk(g.coordinates);
  if (!positions.length) return null;
  const xs=positions.map(p=>p[0]), ys=positions.map(p=>p[1]);
  return [(Math.min(...xs)+Math.max(...xs))/2, (Math.min(...ys)+Math.max(...ys))/2];
}

export function normalizeEonet(data: any): EnvironmentalEvent[] {
  if (!Array.isArray(data?.events)) throw new Error('Unexpected NASA EONET response');
  return data.events.flatMap((e: any) => {
    const geometries = Array.isArray(e.geometry) ? e.geometry : [];
    const latest = [...geometries].sort((a:any,b:any)=> Date.parse(b.date || '') - Date.parse(a.date || ''))[0];
    const coords = centerOfGeometry(latest);
    if (!coords || !isNorthAmerica(coords[0],coords[1])) return [];
    const categoryId = (e.categories || [])[0]?.id || 'other';
    const cat = CATEGORY_MAP[categoryId] || 'other';
    const firstSource = (e.sources || []).find((s:any)=> validUrl(s.url));
    const sourceUrl = validUrl(firstSource?.url) || validUrl(e.link) || 'https://eonet.gsfc.nasa.gov/';
    const date = typeof latest?.date === 'string' && Number.isFinite(Date.parse(latest.date)) ? latest.date : null;
    return [{
      id: String(e.id || ''), source:'eonet' as const, category:cat,
      title: String(e.title || 'Unnamed natural event'), coordinates:coords,
      location: 'See official source for precise location', observed:date,
      status:(e.closed ? 'Closed (EONET)' : 'Open (EONET)'),
      description: String(e.description || 'An open natural event tracked by NASA EONET. Open status and coordinates are provided by source records; they are not an emergency warning.'),
      magnitude: e.magnitudeValue != null && Number.isFinite(Number(e.magnitudeValue)) ? Number(e.magnitudeValue) : null,
      depthKm: null, sourceUrl, sourceName:'NASA EONET',
    }];
  });
}

export function normalizeUsgs(data: any): EnvironmentalEvent[] {
  if (!Array.isArray(data?.features)) throw new Error('Unexpected USGS GeoJSON response');
  return data.features.flatMap((e:any) => {
    const pos = e.geometry?.coordinates;
    const mag = Number(e.properties?.mag);
    if (!Array.isArray(pos) || !isNorthAmerica(Number(pos[0]),Number(pos[1])) || !Number.isFinite(mag) || mag < 5) return [];
    const millis = e.properties?.time == null ? NaN : Number(e.properties.time);
    const date = Number.isFinite(millis) ? new Date(millis).toISOString() : null;
    const depth = Number(pos[2]);
    return [{
      id:String(e.id || ''), source:'usgs' as const, category:'earthquake' as const,
      title:`M${mag.toFixed(1)} · ${String(e.properties?.place || 'Earthquake')}`,
      coordinates:[Number(pos[0]),Number(pos[1])] as [number,number],
      location:String(e.properties?.place || 'Location not supplied'),
      observed:date, status:'Reported (USGS)',
      description:'USGS-reported earthquake within the selected recent-data window. This is a record of seismic activity, not necessarily a current emergency or documented ecological disaster.',
      magnitude:mag, depthKm:Number.isFinite(depth) ? depth : null,
      sourceUrl:validUrl(e.properties?.url) || 'https://earthquake.usgs.gov/', sourceName:'USGS Earthquake Hazards',
    }];
  });
}

export type FeedResult = { events: EnvironmentalEvent[]; successes: string[]; errors: string[]; fetchedAt: string; noaaSyncedAt: string|null; };

// NOAA's open_date is when NOAA OR&R was notified, NOT confirmed release time.
// NOAA records are selected OR&R-supported responses, NOT all pollution incidents.
export function normalizeNoaaSnapshot(data: any): EnvironmentalEvent[] {
  if (!data || data.available !== true || !Array.isArray(data.records))
    throw new Error('NOAA IncidentNews snapshot not synchronized');
  return data.records.flatMap((r:any) => {
    const id=String(r?.id||'');
    const date=String(r?.open_date||'');
    const lon=Number(r?.lon),lat=Number(r?.lat);
    const threat=String(r?.threat||'').toLowerCase();
    if(!/^\d+$/.test(id)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!isNorthAmerica(lon,lat)||!['oil','chemical'].includes(threat))return [];
    // EW-V161-VERIFIED-NOAA-ANCHOR: IncidentNews case 11230:
    // 37° 30.63′ N, 123° 42.80′ W = 37.5105, -123.713333.
    // https://incidentnews.noaa.gov/incident/11230
    const verifiedPoint = id==='11230' ? [-123.7133333333,37.5105] as [number,number] : [lon,lat] as [number,number];
    const category:EventCategory=threat==='oil'?'oil-spill':'chemical-release';
    const commodity=String(r?.commodity||'').trim();
    const potential=(r?.max_ptl_release_gallons==null?null:Number(r.max_ptl_release_gallons));
    const context=(Number.isFinite(potential)&&potential!==null?` Maximum potential release reported: ${potential.toLocaleString('en-US')} gallons (not confirmed actual volume).`:'' );
    return [{
      id,source:'noaa' as const,category,
      title:String(r.name||'NOAA response incident'),coordinates:verifiedPoint,
      location:String(r.location||'Location not specified'),observed:date,
      status:id==='11230'?'Suspected oil signature · not confirmed':'NOAA notified · status not verified',
      description:`NOAA notification date: ${date}. Coordinates may be approximate. ${String(r.description||'NOAA OR&R supported incident response.')}${commodity ? ' Commodity: '+commodity+'.' : ''}${context}`,
      magnitude:null,depthKm:null,
      sourceUrl:validUrl(r.sourceUrl)||`https://incidentnews.noaa.gov/incident/${id}`,
      sourceName:'NOAA IncidentNews'
    }];
  });
}

// EW-V163-PROGRESSIVE: report each official source as it arrives. One slow source
// must not delay the other sources or cause an empty Dashboard.
export type FeedProgress = {
  result: FeedResult;
  completed: number;
  total: number;
  source: string;
  outcome: 'ready' | 'failed';
};
// EW-V165-INTEGRATED: independent, progressive official source collection.
export async function fetchLiveEvents(onProgress?: (progress:FeedProgress)=>void, cancel?:AbortSignal):Promise<FeedResult>{
  const successes:string[]=[],errors:string[]=[],events:EnvironmentalEvent[]=[];
  let noaaSyncedAt:string|null=null,completed=0;
  const snapshot=():FeedResult=>({events:[...events].sort((a,b)=>Date.parse(b.observed||'')-Date.parse(a.observed||'')),successes:[...successes],errors:[...errors],fetchedAt:new Date().toISOString(),noaaSyncedAt});
  async function json(url:string, timeout:number){
    const time=AbortSignal.timeout(timeout);
    const signal=cancel&&typeof AbortSignal.any==='function'?AbortSignal.any([cancel,time]):time;
    const response=await fetch(url,{cache:'no-store',signal});
    if(!response.ok)throw new Error('HTTP '+response.status);
    return response.json();
  }
  async function settle(label:string, request:Promise<any>, receive:(value:any)=>void){
    let outcome:'ready'|'failed'='ready';
    try {const value=await request;receive(value);successes.push(label);}
    catch(error){outcome='failed';errors.push(label+': '+(error instanceof Error?error.message:String(error)));}
    finally{completed++;try{onProgress?.({source:label,outcome,completed,total:3,result:snapshot()});}catch(e){console.warn('[EW V1.6.5] Progress rendering issue',e);}}
  }
  await Promise.all([
    settle('NOAA IncidentNews',json(NOAA_SNAPSHOT+'?t='+Date.now(),5000).then((v:any)=>({events:normalizeNoaaSnapshot(v),generatedAt:typeof v.generatedAt==='string'?v.generatedAt:null})),
      (v:any)=>{events.push(...v.events);noaaSyncedAt=v.generatedAt;}),
    settle('USGS',json(usgsQueryUrl(),13000).then(normalizeUsgs),(v:any)=>events.push(...v)),
    settle('NASA EONET',json(EONET_API,9000).then(normalizeEonet),(v:any)=>events.push(...v))
  ]);
  return snapshot();
}

// Explicitly labeled demonstration data. Never silently replace a failing live feed.
export const DEMO_EVENTS: EnvironmentalEvent[] = [
  {id:'sample-1',source:'demo',category:'wildfire',title:'Illustrative Wildfire — British Columbia',coordinates:[-122.45,53.5],location:'British Columbia, Canada',observed:'2026-10-10T08:00:00Z',status:'Illustrative',description:'Sample wildfire record for testing map filters and details. NOT A REAL-TIME INCIDENT.',magnitude:null,depthKm:null,sourceUrl:'https://eonet.gsfc.nasa.gov/',sourceName:'Sample / NASA reference'},
  {id:'sample-2',source:'demo',category:'storm',title:'Illustrative Tropical Storm — Gulf Coast',coordinates:[-90.6,27.6],location:'Gulf of Mexico',observed:'2026-10-09T19:00:00Z',status:'Illustrative',description:'Fictional sample storm for interface testing.',magnitude:null,depthKm:null,sourceUrl:'https://eonet.gsfc.nasa.gov/',sourceName:'Sample'},
  {id:'sample-3',source:'demo',category:'flood',title:'Illustrative Flood — Texas',coordinates:[-96.8,30.3],location:'Texas, USA',observed:'2026-10-08T15:00:00Z',status:'Illustrative',description:'Fictional flood example.',magnitude:null,depthKm:null,sourceUrl:'https://eonet.gsfc.nasa.gov/',sourceName:'Sample'},
  {id:'sample-4',source:'demo',category:'earthquake',title:'Illustrative M5.8 — Alaska',coordinates:[-149.2,61.2],location:'Alaska, USA',observed:'2026-10-06T12:00:00Z',status:'Illustrative',description:'Fictional seismic example.',magnitude:5.8,depthKm:26,sourceUrl:'https://earthquake.usgs.gov/',sourceName:'Sample / USGS reference'},
  {id:'sample-5',source:'demo',category:'volcano',title:'Illustrative Volcano Activity — Hawaiʻi',coordinates:[-155.3,19.4],location:'Hawaiʻi, USA',observed:'2026-10-04T09:00:00Z',status:'Illustrative',description:'Fictional volcano example.',magnitude:null,depthKm:null,sourceUrl:'https://eonet.gsfc.nasa.gov/',sourceName:'Sample'},
  {id:'sample-6',source:'demo',category:'wildfire',title:'Illustrative Wildfire — Oregon',coordinates:[-121.2,44.5],location:'Oregon, USA',observed:'2026-10-02T09:00:00Z',status:'Illustrative',description:'Fictional wildfire example.',magnitude:null,depthKm:null,sourceUrl:'https://eonet.gsfc.nasa.gov/',sourceName:'Sample'},
  {id:'sample-7',source:'demo',category:'oil-spill',title:'Illustrative Oil Spill — Gulf Coast',coordinates:[-90.1,29.5],location:'Gulf Coast, USA',observed:'2026-10-12',status:'Illustrative',description:'FICTIONAL NOAA-style oil notification for testing only. NOT AN ACTUAL INCIDENT.',magnitude:null,depthKm:null,sourceUrl:'https://incidentnews.noaa.gov/',sourceName:'Sample / NOAA reference'},
  {id:'sample-8',source:'demo',category:'chemical-release',title:'Illustrative Chemical Release — New York',coordinates:[-73.9,40.7],location:'New York, USA',observed:'2026-10-13',status:'Illustrative',description:'FICTIONAL environmental release used for Demo mode. NOT A REAL INCIDENT.',magnitude:null,depthKm:null,sourceUrl:'https://incidentnews.noaa.gov/',sourceName:'Sample / NOAA reference'},
];

export const categoryColor = (cat:string) => CATEGORIES.find(c=>c.id===cat)?.color || '#a0b7ba';
export const categoryIcon = (cat:string) => CATEGORIES.find(c=>c.id===cat)?.icon || '◌';
export const categoryLabel = (cat:string) => CATEGORIES.find(c=>c.id===cat)?.label || 'Other';
export const displayDate = (v:string|null) => {
  if(!v||!Number.isFinite(Date.parse(v))) return 'Not provided';
  if(/^\d{4}-\d{2}-\d{2}$/.test(v))return new Date(v+'T12:00:00Z').toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'})+' · date only';
  return new Date(v).toLocaleString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'UTC',hour:'numeric',minute:'2-digit'})+' UTC';
};
export function detailHref(e:EnvironmentalEvent) { return `/environmental-watch/event/?source=${encodeURIComponent(e.source)}&id=${encodeURIComponent(e.id)}`; }
