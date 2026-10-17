const tabs=[...document.querySelectorAll('.map-tab')];
const mapImage=document.querySelector('#map-image');
const mapCaption=document.querySelector('#map-caption');
const dialog=document.querySelector('#map-dialog');
const dialogImage=document.querySelector('#dialog-image');
const dialogCaption=document.querySelector('#dialog-caption');

tabs.forEach(tab=>tab.addEventListener('click',()=>{
  tabs.forEach(item=>{item.classList.remove('active');item.setAttribute('aria-selected','false')});
  tab.classList.add('active');tab.setAttribute('aria-selected','true');
  mapImage.style.opacity='.2';
  const src=`/lava-risk/assets/${tab.dataset.map}`;
  const next=new Image();
  next.onload=()=>{mapImage.src=src;mapImage.style.opacity='1'};
  next.src=src;
  mapCaption.textContent=tab.dataset.caption;
}));

document.querySelector('.map-frame').addEventListener('click',()=>{
  dialogImage.src=mapImage.src;
  dialogCaption.textContent=mapCaption.textContent;
  dialog.showModal();
  document.body.classList.add('map-dialog-open');
});
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()});

const menuButton=document.querySelector('.menu-button');
const nav=document.querySelector('#site-nav');
menuButton.addEventListener('click',()=>{
  const open=nav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded',String(open));
});
nav.querySelectorAll('a').forEach(link=>link.addEventListener('click',()=>{
  nav.classList.remove('open');menuButton.setAttribute('aria-expanded','false');
}));

const revealObserver=new IntersectionObserver(entries=>{
  entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('revealed');revealObserver.unobserve(entry.target)}})
},{threshold:.15});
document.querySelectorAll('.workflow li,.finding-card,.warning-grid article').forEach(item=>{
  item.style.opacity='0';item.style.transform='translateY(18px)';item.style.transition='opacity .55s ease,transform .55s ease';
  revealObserver.observe(item);
});

const style=document.createElement('style');
style.textContent='.revealed{opacity:1!important;transform:none!important}';
document.head.appendChild(style);


// Keep floating navigation out of the way while the full-map dialog is open.
dialog.addEventListener('close',()=>document.body.classList.remove('map-dialog-open'));

// Phase 2A: responsive floating “Back to Selected Work” navigation.
const selectedWorkReturn=document.querySelector('.selected-work-return');
let returnIdleTimer;

const returnRevealThreshold=()=>Math.max(96,Math.min(window.innerHeight*.18,180));

function syncSelectedWorkReturn(){
  if(!selectedWorkReturn)return;
  const canShow=window.scrollY>returnRevealThreshold()&&!dialog.open;
  selectedWorkReturn.classList.toggle('is-ready',canShow);
  if(!canShow)selectedWorkReturn.classList.remove('is-scrolling');
}

function markReturnScrolling(){
  if(!selectedWorkReturn)return;
  syncSelectedWorkReturn();
  if(!selectedWorkReturn.classList.contains('is-ready'))return;

  selectedWorkReturn.classList.add('is-scrolling');
  window.clearTimeout(returnIdleTimer);
  returnIdleTimer=window.setTimeout(()=>{
    selectedWorkReturn.classList.remove('is-scrolling');
    syncSelectedWorkReturn();
  },800);
}

window.addEventListener('scroll',markReturnScrolling,{passive:true});
window.addEventListener('resize',syncSelectedWorkReturn,{passive:true});
syncSelectedWorkReturn();
