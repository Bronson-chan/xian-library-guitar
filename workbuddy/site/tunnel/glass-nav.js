import {mountLiquidGlassNavigation} from './vendor/glass/LiquidGlassNavigationEngine.js';
const host=document.getElementById('glass-nav');
const filters={'全部歌曲':'all','新学曲目':'learning','拿手歌曲':'known','很久没弹':'stale'};
let disposed=false;
const nav=mountLiquidGlassNavigation(host,{menu:null,height:330,onAction(menu,label){
 if(filters[label])document.querySelector('[data-filter="'+filters[label]+'"]').click();
 else if(label==='换一组封面')document.getElementById('batch').click();
 else if(label==='暂停漫游'||label==='继续漫游'){
  const shouldPause=label==='暂停漫游';
  if((document.getElementById('pause').getAttribute('aria-pressed')==='true')!==shouldPause)document.getElementById('pause').click();
 }else if(label==='打开工作台')location.href='../';
 else if(label==='我的歌单')location.href='../#lib';
 else if(label==='练习记录')location.href='../#log';
 nav.update({menu:null});sync();
}});
function sync(){
 const selected=document.querySelector('[data-filter][aria-pressed=true]')?.dataset.filter;
 const label=Object.keys(filters).find(key=>filters[key]===selected)||'全部歌曲';
 nav.root.querySelector('[data-menu=product] span').textContent=label;
 nav.root.querySelectorAll('[data-pane=product] .menu-item').forEach(item=>item.dataset.selected=String(filters[item.textContent.trim()]===selected));
}
// A bounded 640px texture uses already-loaded album art. The supplied garden
// photograph/font are absent; no network image or video dependency is added.
const cover=document.getElementById('cover');
function texture(){
 if(disposed||!cover.complete||!cover.naturalWidth)return;
 const canvas=document.createElement('canvas');canvas.width=640;canvas.height=320;
 const ctx=canvas.getContext('2d');ctx.filter='blur(14px)';ctx.drawImage(cover,-60,-80,760,480);ctx.filter='none';ctx.fillStyle='#10172788';ctx.fillRect(0,0,640,320);
 nav.root.querySelector('#bg-source').src=canvas.toDataURL('image/jpeg',.75);
}
cover.addEventListener('load',texture);texture();sync();
document.getElementById('nav-fallback').hidden=true;
addEventListener('pagehide',()=>{disposed=true;cover.removeEventListener('load',texture);nav.destroy();},{once:true});
