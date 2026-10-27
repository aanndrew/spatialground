/**
 * Environmental Watch V1.3c — independent browser-SVG geographic overlay.
 * Draws geographic features from the ALREADY BUNDLED Natural Earth GeoJSON.
 * Does not require WebGL polygon-layer support, image tiles or network access.
 * Geographic coordinates are projected by the active MapLibre camera so they
 * pan/zoom together with event markers. SVG is inserted above the GL canvas,
 * below HTML event markers; pointer events pass through to the map.
 */
import type {Map as LibreMap} from 'maplibre-gl';
import {localBaseStyle} from './basemap';

type Position = [number, number];
type Geometry = {type:'Polygon'|'MultiPolygon';coordinates:Position[][]|Position[][][]};
type Feature = {type:'Feature';properties?:{name?:string};geometry:Geometry};
const NS='http://www.w3.org/2000/svg';
const HUES:Record<string,string>={
  Canada:'#497966', 'United States of America':'#4c7763',Mexico:'#7d8761',
  Greenland:'#73929b',Russia:'#53706e',Cuba:'#8e9269',
};
const COUNTRY_LABELS:[string,Position][]=[
  ['CANADA',[-104.5,56.5]], ['UNITED STATES',[-99.5,39.5]],
  ['MEXICO',[-102.5,23.8]], ['ALASKA',[-152.5,65]], ['GREENLAND',[-44.5,72]]
];
function createSvg(tag:string):SVGElement {return document.createElementNS(NS,tag);}
function sourceFeatures():Feature[]{
  // The basemap data is read from the same bundled GeoJSON used by V1.3b.
  // Do not fetch a remote URL or depend on the MapLibre style worker.
  const source=(localBaseStyle.sources as any)?.['ew-land'];
  const value=source?.data;
  if(value?.type!=='FeatureCollection'||!Array.isArray(value.features))return [];
  return value.features.filter((f:any)=>f?.geometry?.coordinates&&(f.geometry.type==='Polygon'||f.geometry.type==='MultiPolygon')) as Feature[];
}

/** Returns whether local geography was installed. Idempotent per map. */
export function installOfflineGeographyOverlay(map:LibreMap):boolean{
  const already=(map as any).__ewOverlayV13c;
  if(already)return true;
  const features=sourceFeatures();
  if(!features.length){console.error('[EW offline overlay] Natural Earth source not present in basemap.ts');return false;}
  const host=map.getCanvasContainer();
  const svg=createSvg('svg') as SVGSVGElement;
  svg.setAttribute('class','ew-projected-atlas');
  svg.setAttribute('aria-hidden','true');
  svg.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:1;display:block;';
  const grid=createSvg('g');grid.setAttribute('fill','none');grid.setAttribute('stroke','#7ab9c2');grid.setAttribute('stroke-width','.65');grid.setAttribute('stroke-opacity','.18');
  const land=createSvg('g'); land.setAttribute('fill-rule','evenodd');
  const labels=createSvg('g'); labels.setAttribute('fill','#e7f5e6'); labels.setAttribute('opacity','.88');
  labels.setAttribute('font-family','Segoe UI,Arial,sans-serif'); labels.setAttribute('font-size','11');labels.setAttribute('font-weight','700');
  labels.setAttribute('letter-spacing','1.2');labels.setAttribute('text-anchor','middle');
  labels.setAttribute('paint-order','stroke');labels.setAttribute('stroke','#05232b');labels.setAttribute('stroke-width','3');
  svg.append(grid,land,labels);
  const landPaths=features.map(feature=>{
    const path=createSvg('path') as SVGPathElement;
    path.setAttribute('fill',HUES[feature.properties?.name||'']||'#526f66');
    path.setAttribute('stroke','#a6d6bd'); path.setAttribute('stroke-width','.85');
    path.setAttribute('stroke-opacity','.7');path.setAttribute('stroke-linejoin','round');
    land.append(path); return {feature,path};
  });
  const gridPaths: {coords:Position[];element:SVGPathElement}[]=[];
  for(let lon=-165;lon<=-45;lon+=15){
    const coords=Array.from({length:35},(_,i)=>[lon,5+i*2.2] as Position);
    const element=createSvg('path') as SVGPathElement;grid.append(element);gridPaths.push({coords,element});
  }
  for(let lat=10;lat<=80;lat+=10){
    const coords=Array.from({length:73},(_,i)=>[-180+i*2.5,lat] as Position);
    const element=createSvg('path') as SVGPathElement;grid.append(element);gridPaths.push({coords,element});
  }
  const labelElements=COUNTRY_LABELS.map(([name,coord])=>{
    const text=createSvg('text') as SVGTextElement;text.textContent=name;labels.append(text);
    return {coord,text};
  });
  // Insert after the GL canvas but before the first HTML marker.
  // The map's HTML markers stay visible on top of polygon fills.
  const marker=host.querySelector('.maplibregl-marker');
  if(marker)host.insertBefore(svg,marker);else host.appendChild(svg);
  (map as any).__ewOverlayV13c=svg;
  let scheduled=false;
  let disposed=false;
  const project=(coord:Position)=>{
    const p=map.project(coord);
    return [Math.round(p.x*10)/10,Math.round(p.y*10)/10] as const;
  };
  function ringD(ring:Position[]):string{
    if(ring.length<3)return '';
    // MapLibre projects the same geographic coordinates as its event markers.
    const pieces:string[]=[];
    for(let i=0;i<ring.length;i++){
      const [x,y]=project(ring[i]);
      if(Number.isFinite(x)&&Number.isFinite(y))pieces.push(`${i?'L':'M'}${x} ${y}`);
    }
    return pieces.length>=3?pieces.join(' ')+' Z':'';
  }
  function lineD(coords:Position[]):string{
    return coords.map((coord,i)=>{
      const [x,y]=project(coord);return `${i?'L':'M'}${x} ${y}`;
    }).join(' ');
  }
  function draw(){
    scheduled=false;
    if(disposed||!host.isConnected)return;
    const width=host.clientWidth,height=host.clientHeight;
    if(!width||!height)return;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    for(const {feature,path} of landPaths){
      const geo=feature.geometry;
      const polygons=geo.type==='Polygon'?[geo.coordinates as Position[][]]:geo.coordinates as Position[][][];
      path.setAttribute('d',polygons.map(poly=>poly.map(ringD).join(' ')).join(' '));
    }
    for(const {coords,element} of gridPaths)element.setAttribute('d',lineD(coords));
    for(const {coord,text} of labelElements){
      const [x,y]=project(coord);text.setAttribute('x',String(x));text.setAttribute('y',String(y));
    }
    svg.dataset.rendered='true';
    svg.dataset.regions=String(features.length);
  }
  function update(){if(!scheduled&&!disposed){scheduled=true;requestAnimationFrame(draw);}}
  map.on('move',update);map.on('resize',update);map.on('load',update);
  map.on('remove',()=>{
    disposed=true;map.off('move',update);map.off('resize',update);map.off('load',update);svg.remove();
  });
  draw();
  console.info(`[EW offline overlay] SVG geography initialized: ${features.length} Natural Earth regions`);
  return true;
}
