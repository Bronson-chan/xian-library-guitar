import {mountLiquidGlassNavigation} from './vendor/glass/LiquidGlassNavigationEngine.js?v=live-glass-2';
const host=document.getElementById('glass-nav');
const filters={'全部歌曲':'all','新学曲目':'learning','拿手歌曲':'known','很久没弹':'stale'};
let disposed=false,sampling=false,timer=null,lastFrame='';
const snapshot=document.createElement('canvas');
const nav=mountLiquidGlassNavigation(host,{menu:null,height:330,onMenuChange:sampleMenu,onAction(menu,label){
 if(filters[label])document.querySelector('[data-filter="'+filters[label]+'"]').click();
 else if(label==='换一组封面')document.getElementById('batch').click();
 else if(label==='暂停漫游'||label==='继续漫游'){
  const shouldPause=label==='暂停漫游';
  if((document.getElementById('pause').getAttribute('aria-pressed')==='true')!==shouldPause)document.getElementById('pause').click();
 }else if(label==='打开工作台')location.href=new URL('../workbench.html',document.baseURI).href;
 else if(label==='我的歌单')location.href=new URL('../workbench.html#lib',document.baseURI).href;
 else if(label==='练习记录')location.href=new URL('../workbench.html#log',document.baseURI).href;
 sampleMenu(null);nav.update({menu:null});sync();
}});
function sync(){
 const selected=document.querySelector('[data-filter][aria-pressed=true]')?.dataset.filter;
 const label=Object.keys(filters).find(key=>filters[key]===selected)||'全部歌曲';
 nav.root.querySelector('[data-menu=product] span').textContent=label;
 nav.root.querySelectorAll('[data-pane=product] .menu-item').forEach(item=>item.dataset.selected=String(filters[item.textContent.trim()]===selected));
}
// Sample the real canvas behind the panel, aligned in screen space. Keep crisp
// detail for the supplied optical shader; never pre-blur or darken the source.
const cover=document.getElementById('cover');
function captureFrame(){
 if(disposed||document.hidden)return;
 const source=document.querySelector('#tunnel')?.firstElementChild?.shadowRoot?.querySelector('canvas');
 if(!source?.width||!source.height)return;
 const region=nav.root.querySelector('#glassNavigation').getBoundingClientRect(),rect=source.getBoundingClientRect();
 const scene=source.closest('.aw-scene');
 const key=[scene?.dataset.frame,source.width,source.height,rect.x,rect.y,region.x,region.y,region.width,region.height].join(':');
 if(key===lastFrame)return;lastFrame=key;
 const width=Math.max(1,Math.min(900,Math.round(region.width))),height=Math.round(region.height*width/region.width);
 if(snapshot.width!==width||snapshot.height!==height){snapshot.width=width;snapshot.height=height;}
 const ctx=snapshot.getContext('2d');ctx.setTransform(width/region.width,0,0,height/region.height,0,0);
 ctx.fillStyle='#101119';ctx.fillRect(0,0,region.width,region.height);
 ctx.translate(rect.left-region.left,rect.top-region.top);ctx.drawImage(source,0,0,rect.width,rect.height);
 // Match the gallery's side/top fades, so straight edges line up outside glass.
 const horizontal=ctx.createLinearGradient(0,0,rect.width,0);
 for(const [stop,colour] of [[0,'#101119'],[.14,'#10111900'],[.86,'#10111900'],[1,'#101119']])horizontal.addColorStop(stop,colour);
 ctx.fillStyle=horizontal;ctx.fillRect(0,0,rect.width,rect.height);
 const vertical=ctx.createLinearGradient(0,0,0,rect.height);
 for(const [stop,colour] of [[0,'#101119'],[.03,'#10111900'],[.93,'#10111900'],[1,'#101119']])vertical.addColorStop(stop,colour);
 ctx.fillStyle=vertical;ctx.fillRect(0,0,rect.width,rect.height);
 nav.setBackground(snapshot);
}
function sampleMenu(menu){
 sampling=Boolean(menu);clearTimeout(timer);timer=null;
 if(sampling&&!document.hidden){lastFrame='';captureFrame();tick();}
}
function tick(){
 if(disposed||!sampling||document.hidden)return;
 timer=setTimeout(()=>{captureFrame();tick();},1000/15);
}
function visibility(){clearTimeout(timer);timer=null;if(!document.hidden&&sampling){captureFrame();tick();}}
document.addEventListener('visibilitychange',visibility);
cover.addEventListener('load',captureFrame);captureFrame();sync();
document.getElementById('nav-fallback').hidden=true;
addEventListener('pagehide',()=>{disposed=true;clearTimeout(timer);cover.removeEventListener('load',captureFrame);document.removeEventListener('visibilitychange',visibility);nav.destroy();snapshot.width=snapshot.height=1;},{once:true});
