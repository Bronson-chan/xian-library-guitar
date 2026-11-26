import {mountAlbumCoverTunnel} from './vendor/AlbumCoverTunnelEngine.js';
const el=id=>document.getElementById(id);
let controller,pool=[],active=null,paused=false,records={},catalog=[],offset=0,currentFilter='all';
try{records=JSON.parse(localStorage.getItem('wb_xiangu_v1')||'{}');}catch{}
function select(index){
 active=pool[index];if(!active)return;
 el('cover').hidden=false;el('open-label').textContent='打开曲谱';
 el('cover').src=active.cover;el('cover').alt=active.t+' 专辑封面';
 el('title').textContent=active.t;el('artist').textContent=active.a;
 el('open').href=el('song-link').href='../#song='+active.i;
 el('song-link').setAttribute('aria-label','打开《'+active.t+'》的曲谱');
}
function destroy(){controller?.destroy();controller=null;}
function mount(filter){
 currentFilter=filter;
 destroy();el('tunnel').replaceChildren();
 const matches=catalog.filter(s=>{
  const state=records.status?.[s.i]||((s.nl||s.f.startsWith('未学会/'))?'learning':'new');
  if(filter==='learning')return state==='learning';
  if(filter==='known')return state==='known';
  if(filter==='stale'){const last=records.last?.[s.i];return !last||(Date.now()-new Date(last+'T00:00:00').getTime())/86400000>=30;}
  return true;
 });
 // The official component accepts at most 96 images. Bound active textures to 48.
 if(offset>=matches.length)offset=0;
 pool=matches.slice(offset,offset+48);el('count').textContent=matches.length+' 首'+(matches.length>48?' · 本组 '+(offset+1)+'–'+Math.min(offset+48,matches.length):'');
 document.querySelectorAll('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===filter)));
 if(!pool.length){el('status').hidden=false;el('status').textContent='这个分类暂时没有歌曲，试试其他分类。';active=null;el('title').textContent='暂无曲目';el('artist').textContent='';el('cover').hidden=true;el('cover').removeAttribute('src');el('open-label').textContent='返回工作台';el('open').href=el('song-link').href='../';return;}
 el('status').hidden=true;
 const height=Math.max(300,el('stage').clientHeight);
 controller=mountAlbumCoverTunnel(el('tunnel'),{images:pool.map(s=>({src:new URL(s.cover,location.href).href,alt:s.t+' · '+s.a})),height,autoTravel:false,paused,active:0,reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,onSelect:select});
 // Blend at the actual 16:9 canvas edges, including ultrawide screens with side space.
 // A static overlay keeps the original rendering and pointer interactions intact.
 const blend=document.createElement('style');
 blend.textContent='.aw-scene{background:#101119}.aw-scene #stage::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg,#101119,transparent 14%,transparent 86%,#101119),linear-gradient(180deg,#101119,transparent 3%,transparent 93%,#101119)}';
 controller.root.append(blend);
 select(0);
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{offset=0;mount(b.dataset.filter);}));
el('batch').addEventListener('click',()=>{offset+=48;mount(currentFilter);});
el('pause').addEventListener('click',()=>{paused=!paused;controller?.update({paused});el('pause').textContent=paused?'继续':'暂停';el('pause').setAttribute('aria-pressed',String(paused));el('play-state').textContent=paused?'已暂停':'漫游中';el('play-state').dataset.paused=String(paused);});
el('open').addEventListener('click',destroy);
el('song-link').addEventListener('click',destroy);
addEventListener('pagehide',destroy);
document.addEventListener('visibilitychange',()=>controller?.update({paused:document.hidden||paused}));
try{
 const response=await fetch('./catalog.json');if(!response.ok)throw Error('曲库清单未加载');catalog=await response.json();mount('all');
 // The gallery and score links respond first; navigation is an independent module.
 import('./glass-nav.js?v=live-glass-2').catch(error=>{document.querySelector('.toolbar').hidden=false;console.error(error);});
}catch(error){el('status').hidden=false;el('status').textContent='隧道暂时无法启动，请返回工作台。';console.error(error);}
