import {prepareReader,openReader} from './reader-bridge.js?v=fast-1';
const albumMode=new URLSearchParams(location.search).get('view')==='album';
const engineReady=albumMode?null:import('./vendor/AlbumCoverTunnelEngine.js?v=fast-1');
const loadAlbumFlow=()=>import('./album-flow.js?v=loop-1');
const albumFlowReady=albumMode?loadAlbumFlow():null;
const el=id=>document.getElementById(id);
let controller,pool=[],active=null,paused=false,records={},catalog=[],offset=0,currentFilter='all',mountVersion=0,reading=false;
let albumWarmup;
function warmAlbumCovers(){
 if(albumWarmup||albumMode||!catalog.length)return;
 albumWarmup=loadAlbumFlow().then(async ({albumLayout,albumCoverSource,coverWindow})=>{
  const {albums,firstIndex}=albumLayout(catalog);
  const packs=new Map();
  await Promise.allSettled(coverWindow(firstIndex,albums.length).map(i=>albumCoverSource(albums[i],packs)));
 }).catch(()=>{albumWarmup=null;});
}
if(!albumMode){
 el('album-mode').addEventListener('pointerenter',warmAlbumCovers);
 el('album-mode').addEventListener('focus',warmAlbumCovers);
}
try{records=JSON.parse(localStorage.getItem('wb_xiangu_v1')||'{}');}catch{}
function select(index){selectSong(pool[index]);}
function selectSong(song){
 active=song;if(!active)return;
 el('cover').hidden=albumMode;el('open-label').textContent='打开曲谱';if(!albumMode)el('cover').src=active.cover;el('cover').alt=active.t+' 专辑封面';
 el('title').textContent=active.t;el('artist').textContent=active.a;
 el('open').href=el('song-link').href='../workbench.html#song='+active.i;
 el('song-link').setAttribute('aria-label','打开《'+active.t+'》的曲谱');prepareReader(active);
}
function destroy(){controller?.destroy();controller=null;}
async function mount(filter){
 const version=++mountVersion;currentFilter=filter;
 const matches=catalog.filter(s=>{
  const state=records.status?.[s.i]||((s.nl||s.f.startsWith('未学会/'))?'learning':'new');
  if(filter==='learning')return state==='learning';if(filter==='known')return state==='known';
  if(filter==='stale'){const last=records.last?.[s.i];return !last||(Date.now()-new Date(last+'T00:00:00').getTime())/86400000>=30;}return true;
 });
 if(offset>=matches.length)offset=0;const next=matches.slice(offset,offset+48);
 el('count').textContent=matches.length+' 首'+(matches.length>48?' · 本组 '+(offset+1)+'–'+Math.min(offset+48,matches.length):'');
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 if(!next.length){controller?.update({paused:true});el('tunnel').hidden=true;el('first-frame').hidden=true;el('status').hidden=false;el('status').textContent='这个分类暂时没有歌曲，试试其他分类。';active=null;el('title').textContent='暂无曲目';el('artist').textContent='';el('cover').hidden=true;el('open-label').textContent='返回工作台';el('open').href=el('song-link').href='../workbench.html';return;}
 el('status').hidden=true;el('tunnel').hidden=false;if(!controller){pool=next;select(0);}
 try{
  const {mountAlbumCoverTunnel}=await engineReady;if(version!==mountVersion)return;
  const images=next.map(s=>({src:new URL(s.cover,document.baseURI).href,alt:s.t+' · '+s.a})),height=Math.max(300,el('stage').clientHeight);
  if(controller)controller.update({images,height,paused:paused||reading,active:0,onSelect:()=>{}});
  else{
   controller=mountAlbumCoverTunnel(el('tunnel'),{images,height,autoTravel:false,paused:paused||reading,active:0,onSelect:select});
   const blend=document.createElement('style');blend.textContent='.aw-scene{background:#101119}.aw-scene #stage::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#101119,transparent 14%,transparent 86%,#101119),linear-gradient(180deg,#101119,transparent 3%,transparent 93%,#101119)}';controller.root.append(blend);
  }
  await controller.ready;if(version!==mountVersion)return;pool=next;controller.update({onSelect:select});select(0);
  if(controller.root.querySelector('[data-ready=true]')){
   el('first-frame').hidden=true;
   if(!navigator.connection?.saveData&&!navigator.connection?.effectiveType?.endsWith('2g')){
    setTimeout(()=>{if(!document.hidden&&!reading)warmAlbumCovers();},750);
   }
  }
 }catch(error){el('status').hidden=false;el('status').textContent='封面暂未加载，仍可打开曲谱或进入工作台。';console.error(error);}
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{offset=0;mount(b.dataset.filter);}));
el('batch').addEventListener('click',()=>{offset+=48;mount(currentFilter);});
el('pause').addEventListener('click',()=>{paused=!paused;controller?.update({paused:paused||reading});el('pause').textContent=paused?'继续':'暂停';el('pause').setAttribute('aria-pressed',String(paused));el('play-state').textContent=paused?'已暂停':'漫游中';el('play-state').dataset.paused=String(paused);});
function enterScore(e){if(!active||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;e.preventDefault();openReader(active);}
el('open').addEventListener('click',enterScore);el('song-link').addEventListener('click',enterScore);
addEventListener('xian-cover-active',e=>{reading=!e.detail;controller?.update({paused:paused||reading});if(e.detail){try{records=JSON.parse(localStorage.getItem('wb_xiangu_v1')||'{}');}catch{}if(!albumMode&&currentFilter!=='all')mount(currentFilter);}});
addEventListener('pagehide',e=>{if(e.persisted)controller?.update({paused:true});else destroy();});
addEventListener('pageshow',e=>{if(e.persisted){if(controller)controller.update({paused:paused||reading});else if(!albumMode)mount(currentFilter);}});
document.addEventListener('visibilitychange',()=>controller?.update({paused:document.hidden||paused||reading}));
if(albumMode){
 document.querySelector('.shell').classList.add('album-mode');
 el('tunnel-mode').removeAttribute('aria-current');el('album-mode').setAttribute('aria-current','page');
 el('nav-fallback').hidden=true;el('first-frame').hidden=true;el('play-state').textContent='专辑浏览';
 el('stage').setAttribute('aria-label','曲库专辑');el('status').textContent='正在加载专辑…';
}
try{
 const response=await fetch(el('cover-catalog').href);if(!response.ok)throw Error('曲库清单未加载');catalog=await response.json();
 if(albumMode){
  const {albumLayout,mountAlbumFlow}=await albumFlowReady;
  mountAlbumFlow(el('album-view'),albumLayout(catalog),{onSelect:song=>{
   el('status').hidden=true;
   selectSong(song);
  },onOpen:openReader});
 }else mount('all');
 if(!albumMode)import('./glass-nav.js?v=fast-1').catch(error=>{document.querySelector('.toolbar').hidden=false;console.error(error);});
}catch(error){el('status').hidden=false;el('status').textContent='曲库暂未加载，请进入工作台。';console.error(error);}
