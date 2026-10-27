import type * as maplibregl from 'maplibre-gl';

/** Environmental Watch V1.6.8: same key-free OpenFreeMap Liberty style as Hawaiʻi Lava Risk.
 * Appearance buttons intentionally DO NOT call setStyle(): a failed style reload should
 * never replace a previously visible basemap with an empty canvas.
 */
export const ENVIRONMENTAL_MAP_STYLE = 'https://tiles.openfreemap.org/styles/liberty';
// Keep both legacy exports compatible with older pages that import this constant.
export const ENVIRONMENTAL_LIGHT_STYLE = ENVIRONMENTAL_MAP_STYLE;

type Appearance = 'street' | 'contrast' | 'muted';

export function installEnvironmentalMapTheme(map: maplibregl.Map): void {
  const parent=map.getContainer();
  if (parent.dataset.ew168Ready==='yes') return;
  parent.dataset.ew168Ready='yes';
  const canvas=map.getCanvas();
  const initialCenter=map.getCenter();
  const initialZoom=map.getZoom();
  let current:Appearance='street';
  let tileErrors:number[]=[];
  let resizeFrame=0;
  const ui=document.createElement('div');
  ui.className='maplibregl-ctrl ew168-control';
  ui.setAttribute('aria-label','Environmental Watch basemap controls');
  const tabs=document.createElement('div');tabs.className='ew168-appearance';
  const modes:[Appearance,string,string][]=[
    ['street','Street','Original OpenFreeMap Liberty streets and labels'],
    ['contrast','Contrast','Same basemap with higher visual contrast'],
    ['muted','Muted','Same basemap with subdued color for incident symbols']
  ];
  const buttons:HTMLButtonElement[]=[];
  function applyAppearance(){
    canvas.classList.remove('ew-map-muted','ew168-map-contrast','ew168-map-muted');
    canvas.classList.toggle('ew168-map-contrast',current==='contrast');
    canvas.classList.toggle('ew168-map-muted',current==='muted');
    modes.forEach(([mode],i)=>{
      const active=current===mode;
      buttons[i].classList.toggle('is-selected',active);
      buttons[i].setAttribute('aria-pressed',String(active));
    });
  }
  for(const [mode,label,help] of modes){
    const button=document.createElement('button');
    button.type='button';button.textContent=label;button.title=help;
    button.className='ew168-mode';
    button.addEventListener('click',()=>{current=mode;applyAppearance();});
    buttons.push(button);tabs.append(button);
  }
  ui.append(tabs);
  const meta=document.createElement('div');meta.className='ew168-map-meta';
  meta.setAttribute('aria-label','Map zoom and center coordinates');ui.append(meta);
  const warning=document.createElement('div');warning.className='ew168-map-warning';warning.hidden=true;
  warning.setAttribute('role','status');
  const warningText=document.createElement('span');
  const retry=document.createElement('button');retry.type='button';retry.textContent='Retry map';
  retry.title='Reload Liberty map tiles only if the basemap has failed';
  warning.append(warningText,retry);ui.append(warning);
  const bottom=document.createElement('div');bottom.className='ew168-map-actions';
  const reset=document.createElement('button');reset.type='button';reset.textContent='Reset view';
  reset.title='Return to initial map center and zoom';
  reset.addEventListener('click',()=>map.easeTo({center:[initialCenter.lng,initialCenter.lat],zoom:initialZoom,bearing:0,pitch:0,duration:450}));
  bottom.append(reset);ui.append(bottom);
  function updateMeta(){
    const center=map.getCenter();
    meta.textContent=`Zoom ${map.getZoom().toFixed(1)} · ${center.lat.toFixed(3)}°, ${center.lng.toFixed(3)}°`;
  }
  function markHealthy(){tileErrors=[];warning.hidden=true;warningText.textContent='';}
  function showFailure(message:string){warningText.textContent=message;warning.hidden=false;}
  retry.addEventListener('click',()=>{
    warning.hidden=true;tileErrors=[];
    // Explicit user action only: avoids spontaneous style reset while zooming.
    map.setStyle(ENVIRONMENTAL_MAP_STYLE);
    requestAnimationFrame(()=>map.resize());
  });
  const scheduleResize=()=>{
    cancelAnimationFrame(resizeFrame);
    resizeFrame=requestAnimationFrame(()=>{map.resize();updateMeta();});
  };
  const parentShell=parent.parentElement;
  const observer=typeof ResizeObserver!=='undefined'&&parentShell
    ?new ResizeObserver(scheduleResize):null;
  if(parentShell)observer?.observe(parentShell);
  map.on('load',()=>{markHealthy();scheduleResize();});
  map.on('style.load',()=>{markHealthy();applyAppearance();scheduleResize();});
  map.on('moveend',updateMeta);
  map.on('zoomend',updateMeta);
  map.on('error',(event)=>{
    const error=(event as unknown as {error?:unknown}).error;
    const message=error instanceof Error?error.message:String(error||'Tile request failed');
    console.warn('[EW basemap]',error);
    const now=Date.now();tileErrors=tileErrors.filter(t=>now-t<12000);tileErrors.push(now);
    // One lost tile should not obscure an otherwise useful map.
    if(tileErrors.length>=4)showFailure('Map tile requests are failing. Check your connection, or retry the basemap.');
    if(/webgl|context lost/i.test(message))showFailure('The graphics renderer lost its context. Try reloading the page.');
  });
  canvas.addEventListener('webglcontextlost',(event)=>{event.preventDefault();showFailure('WebGL rendering interrupted. The browser will try to restore the map.');});
  canvas.addEventListener('webglcontextrestored',()=>{markHealthy();scheduleResize();});
  window.addEventListener('load',scheduleResize,{once:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleResize();});
  map.addControl({onAdd:()=>ui,onRemove:()=>{observer?.disconnect();cancelAnimationFrame(resizeFrame);canvas.classList.remove('ew168-map-contrast','ew168-map-muted');ui.remove();}} as maplibregl.IControl,'top-left');
  applyAppearance();updateMeta();
  requestAnimationFrame(()=>requestAnimationFrame(scheduleResize));
}
