// Position and drag follow the Album Flow HTML supplied with the design.
export function albumLayout(songs,baseURL=document.baseURI){
 const collator=new Intl.Collator('zh-Hans-u-co-pinyin');
 const initials='ABCDEFGHJKLMNOPQRSTWXYZ', bounds='阿芭擦搭蛾发噶哈击喀垃妈拿哦啪期然撒塌挖夕压匝';
 function initialOf(name){
  const first=String(name||'').trim()[0]?.toUpperCase()||'#';
  if(/^[A-Z]$/.test(first))return first;
  if(!/\p{Script=Han}/u.test(first))return '#';
  for(let i=bounds.length-1;i>=0;i--)if(collator.compare(first,bounds[i])>=0)return initials[i];
  return 'A';
 }
 const groups=new Map();
 for(const song of songs){
  const key=song.a+'|'+(song.album||song.coverGroup||song.i);
  if(!groups.has(key)){
   const cover=new URL(song.cover,baseURL);
   if(song.coverGroup)cover.searchParams.set('v',song.coverGroup);
   groups.set(key,{artist:song.a,album:song.album,cover:cover.href,pack:song.coverPack&&new URL(song.coverPack,baseURL).href,initial:initialOf(song.a),songs:[]});
  }
  groups.get(key).songs.push(song);
 }
 const albums=[...groups.values()].sort((a,b)=>
  a.initial.localeCompare(b.initial)||collator.compare(a.artist,b.artist)||Number(b.songs.length>1)-Number(a.songs.length>1));
 const mid=(albums.length-1)/2;
 const initialIndex=albums.reduce((best,album,i)=>album.songs.length>1&&Math.abs(i-mid)<Math.abs(best-mid)?i:best,-albums.length);
 return {albums,firstIndex:initialIndex<0?Math.floor(mid):initialIndex};
}

const wrapIndex=(index,length)=>((index%length)+length)%length;

export function coverWindow(center,length){
 if(!length)return [];
 const indexes=new Set([wrapIndex(center,length)]);
 for(let distance=1;distance<=5;distance++){
  indexes.add(wrapIndex(center+distance,length));
  indexes.add(wrapIndex(center-distance,length));
 }
 return [...indexes];
}

export async function albumCoverSource(album,packs){
 if(!album.pack)return album.cover;
 if(!packs.has(album.pack)){
  packs.set(album.pack,fetch(album.pack,{signal:AbortSignal.timeout(5000)}).then(response=>{
   if(!response.ok)throw Error('封面包未加载');
   return response.json();
  }).catch(()=>{
   packs.delete(album.pack);
   return null;
  }));
 }
 const image=(await packs.get(album.pack))?.[album.songs[0].i];
 return image?'data:image/webp;base64,'+image:album.cover;
}

export function mountAlbumFlow(view,{albums,firstIndex},{onSelect,onOpen}){
 view.innerHTML=`<div class="flow" id="flow" role="region" aria-label="专辑封面" tabindex="0"></div>
 <div class="foot"><span id="album-initial" aria-hidden="true"></span><div class="controls"><button class="arrow" id="prev" aria-label="上一张专辑">‹</button><button id="flip" aria-expanded="false">查看谱单</button><button class="arrow" id="next" aria-label="下一张专辑">›</button></div>
 <nav id="album-index" aria-label="按歌手首字母跳转"></nav><p class="hint">左右拖动、滚轮或方向键选专辑 · 点击中央封面翻面</p></div>`;
 view.hidden=false;
const ANG=72,GAP=.62,STEP=.2,DEPTH=.42;
const el=id=>document.getElementById(id);
const flow=el('flow');
const reading=()=>document.getElementById('cover-reader')?.hidden===false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const cards=new Map();
const covers=new Map();
const packs=new Map();
const lighting=document.createElement('canvas');lighting.width=lighting.height=8;
const light=lighting.getContext('2d',{willReadFrequently:true});
const palette=new Map();
const index=document.getElementById('album-index');
const indexLight=document.createElement('span');
indexLight.className='index-light';
indexLight.setAttribute('aria-hidden','true');
index.append(indexLight);
const indexButtons=new Map();
const initialsByAlbum=new Map();
albums.forEach((a,i)=>{if(!initialsByAlbum.has(a.initial))initialsByAlbum.set(a.initial,i);});
for(const letter of [...initialsByAlbum.keys()]){
 const button=document.createElement('button');button.textContent=letter;
 button.setAttribute('aria-label',letter+' 开头的歌手');
 button.onclick=()=>goToAlbum(initialsByAlbum.get(letter),true);index.append(button);indexButtons.set(letter,button);
}
let activeInitial;
function positionIndexLight(){
 const button=indexButtons.get(activeInitial);
 if(!button)return;
 indexLight.style.transform='translate3d('+button.offsetLeft+'px,'+button.offsetTop+'px,0)';
 index.dataset.ready='';
}
function setInitial(letter){
 if(activeInitial===letter)return;
 indexButtons.get(activeInitial)?.removeAttribute('aria-current');
 activeInitial=letter;
 indexButtons.get(letter)?.setAttribute('aria-current','true');
 positionIndexLight();
}
function tint(i,img){
 if(!img)return;
 if(!palette.has(i)&&img.complete&&img.naturalWidth){
  light.drawImage(img,0,0,8,8);
  const pixels=light.getImageData(0,0,8,8).data,rgb=[0,0,0];
  for(let p=0;p<pixels.length;p+=4)for(let c=0;c<3;c++)rgb[c]+=pixels[p+c]/64;
  const gain=Math.min(2.1,180/Math.max(1,...rgb));
  palette.set(i,rgb.map(v=>Math.round(v*gain)).join(','));
 }
 if(i===current&&palette.has(i))view.style.setProperty('--glow',palette.get(i));
}
const albumIndex=i=>wrapIndex(i,albums.length);
const half=Math.floor(albums.length/2);
const shortestOffset=distance=>albumIndex(distance+half)-half;
let target=firstIndex,pos=target,current=-1,flipped=false,flipProgress=0,frame=0,last=0,drag=null,returnFocus=null,width=360,wheelCarry=0,wheelAt=0;
let glassPromise,glassDirty=true,glassPending=false;
let preparedCenter=-1,preparedTarget=-1,jump=false;
function loadCover(i,priority){
 if(covers.has(i))return;
 const image=new Image(),entry={image,state:'loading'};
 covers.set(i,entry);
 image.alt='';image.draggable=false;image.fetchPriority=priority;
 const finish=state=>{
  clearTimeout(entry.timer);
  if(covers.get(i)!==entry||entry.state!=='loading')return;
  entry.state=state;
  if(state==='error')image.removeAttribute('src');
  wake();
 };
 entry.timer=setTimeout(()=>finish('error'),11000);
 albumCoverSource(albums[i],packs).then(src=>{
  if(covers.get(i)!==entry||entry.state!=='loading')return;
  image.src=src;
  return image.decode().then(()=>finish('ready'));
 }).catch(()=>finish('error'));
}
function prepareCovers(center){
 center=albumIndex(center);
 const destination=albumIndex(target);
 const visible=coverWindow(center,albums.length);
 if(center!==preparedCenter||destination!==preparedTarget){
  preparedCenter=center;preparedTarget=destination;
  const wanted=new Set([...visible,...coverWindow(destination,albums.length)]);
  // Read ahead in both directions, with extra room in the direction of travel.
  for(let offset=-8;offset<=8;offset++){
   wanted.add(albumIndex(target+offset+Math.sign(target-pos)*3));
  }
  for(const [i,entry] of covers){
   if(wanted.has(i)||cards.has(i))continue;
   if(entry.state!=='loading'&&covers.size<=44)continue;
   covers.delete(i);clearTimeout(entry.timer);
   if(entry.state==='loading')entry.image.removeAttribute('src');
  }
  for(const i of wanted)loadCover(i,i===center?'high':visible.includes(i)?'auto':'low');
 }
 return visible.every(i=>['ready','error'].includes(covers.get(i)?.state));
}
function refreshGlass(){
 if(!flipped||flipProgress!==1||glassPending||!glassDirty||reading())return;
 glassDirty=false;glassPending=true;
 glassPromise??=import('./album-glass.js?v=2').then(module=>module.createAlbumGlass()).catch(()=>null);
 glassPromise.then(glass=>{
  if(glass&&flipped&&flipProgress===1&&!reading()){
   try{glass.render(cards.get(albumIndex(target)).back,flow,cards.values());}catch(error){console.warn('专辑玻璃折射暂不可用',error);}
  }
 }).finally(()=>{glassPending=false;if(glassDirty)refreshGlass();});
}
function size(){
 width=Math.round(Math.min(innerHeight*.4,innerWidth<650?innerWidth*.63:innerWidth*.37,456));
 glassDirty=true;
 view.closest('.shell').style.setProperty('--W',width+'px');positionIndexLight();wake();
}
function makeCard(i){
 const album=albums[i],card=document.createElement('article');card.className='card';
 const front=document.createElement('button');front.className='face front';front.type='button';front.dataset.album=i;
 front.setAttribute('aria-label','选择'+(album.album||album.songs[0].t));
 const entry=covers.get(i);
 if(entry.state==='ready')front.append(entry.image);
 else{
  const label=document.createElement('span');label.className='cover-unavailable';
  label.textContent=album.album||album.songs[0].t;front.append(label);
 }
 const mirror=document.createElement('img');mirror.className='album-reflection';mirror.alt='';mirror.draggable=false;
 const back=document.createElement('section');back.className='face back';
 const heading=document.createElement('h2');heading.textContent=album.album||album.songs[0].t;
 const note=document.createElement('p');note.textContent=album.artist+' · '+album.songs.length+' 首曲谱';
 const tracks=document.createElement('div');tracks.className='tracks';
 for(const song of album.songs){
  const button=document.createElement('button');button.className='track';
  const label=document.createElement('b');label.textContent=song.t;
  const action=document.createElement('span');action.textContent='开谱 ›';button.append(label,action);
  button.onclick=()=>openScore(song,button);tracks.append(button);
 }
 const haze=document.createElement('img');haze.className='jacket-haze';haze.alt='';
 const thumb=document.createElement('img');thumb.className='jacket-thumb';thumb.alt='';
 const detail=document.createElement('div');detail.className='jacket-detail';detail.append(heading,note);
 const close=document.createElement('button');close.type='button';close.className='jacket-close';close.textContent='×';close.setAttribute('aria-label','合上谱单');
 close.onclick=()=>{flip();el('flip').focus({preventScroll:true});};
 const jacket=document.createElement('header');jacket.className='jacket-heading';jacket.append(thumb,detail,close);
 if(entry.state==='ready')for(const layer of [mirror,haze,thumb])layer.src=entry.image.src;
 else for(const layer of [mirror,haze,thumb])layer.hidden=true;
 back.append(haze,jacket,tracks);card.append(front,mirror,back);flow.append(card);cards.set(i,{card,front,back});
}
function paint(){
 const positionIndex=Math.round(pos);
 const center=albumIndex(positionIndex),selected=albumIndex(target);
 const visible=coverWindow(center,albums.length);
 for(const [i,item] of cards)if(!visible.includes(i)){item.card.remove();cards.delete(i);}
 for(const i of visible)if(!cards.has(i))makeCard(i);
 for(const [i,{card,front,back}] of cards){
  const d=shortestOffset(i-center)+(positionIndex-pos),s=Math.sign(d),a=Math.abs(d);
  const x=a<1?d*GAP:s*(GAP+(a-1)*STEP),rotation=a<1?-d*ANG:-s*ANG;
  const k=i===selected?flipProgress:0;
  const flipAngle=(k<.5?2*k*k:1-2*(1-k)*(1-k))*180;
  const z=-Math.min(a,1)*DEPTH+Math.sin(Math.min(1,k*1.4)*Math.PI/2)*.55;
  card.classList.toggle('turning',k>0||i===selected&&flipped);
  const zoom=1+(innerWidth>650?.16:.12)*Math.max(0,1-a)*(1-k);
  const lift=-(zoom-1)*width*.5;
  card.style.transform='translate3d('+x*width+'px,'+lift+'px,'+z*width+'px) rotateY('+(rotation+flipAngle)+'deg) scale('+zoom+')';
  card.style.zIndex=String(k>0?999:500-Math.round(a*10));
  front.inert=i===selected&&(flipped||k>.5);front.tabIndex=i===center&&!flipped?0:-1;
  back.inert=i!==selected||!flipped||k<.55;
 }
 if(center!==current){
  current=center;const a=albums[center];el('title').textContent=a.album||a.songs[0].t;
  el('count').textContent=(center+1)+' / '+albums.length+' 组封面';
  el('album-initial').textContent=a.initial;
  setInitial(a.initial);
  tint(center,cards.get(center).front.querySelector('img'));
  onSelect(a.songs[0]);
  el('title').textContent=a.album||a.songs[0].t;
  el('artist').textContent=a.artist+' · '+a.songs.length+' 首曲谱';
 }
}
function tick(now){
 frame=0;
 const dt=last?Math.min(.06,(now-last)/1000):.016;last=now;
 const ease=reduced.matches?1:1-Math.exp(-dt*13);
 const distance=target-pos;
 let next=target;
 if(drag)next=drag.moved?drag.position:pos;
 else if(!jump&&Math.abs(distance)<=8&&Math.abs(distance)>=.001)next=pos+distance*ease;
 const ready=prepareCovers(Math.round(next));
 if(ready){pos=next;jump=false;}
 const goal=flipped?1:0;
 flipProgress=reduced.matches?goal:Math.max(0,Math.min(1,flipProgress+Math.sign(goal-flipProgress)*Math.min(Math.abs(goal-flipProgress),dt/.45)));
 const moving=Math.abs(pos-target)>.001||flipProgress!==goal;
 view.classList.toggle('is-browsing',Boolean(drag?.moved)||Math.abs(pos-target)>.001);
 if(ready||current>=0)paint();
 refreshGlass();
 if(ready&&moving&&!drag||flipProgress!==goal)wake();else last=0;
}
function wake(){if(!frame&&!document.hidden)frame=requestAnimationFrame(tick);}
function setFlipped(value){
 if(value)glassDirty=true;
 flipped=value;view.classList.toggle('has-flip',value);
 const button=el('flip');button.textContent=value?'合上谱单':'查看谱单';button.setAttribute('aria-expanded',String(value));
}
function go(value,skip=false){target=albums.length>1?value:0;jump=skip;setFlipped(false);flipProgress=0;wake();}
function goToAlbum(index,skip=false){
 const positionIndex=Math.round(pos);
 go(positionIndex+shortestOffset(index-albumIndex(positionIndex)),skip);
}
function flip(){if(current<0)return;target=Math.round(pos);jump=true;setFlipped(!flipped);wake();}
flow.addEventListener('wheel',e=>{
 if(e.ctrlKey||flipped||reading())return;
 e.preventDefault();const now=performance.now();if(now-wheelAt>200)wheelCarry=0;wheelAt=now;
 wheelCarry+=(e.deltaMode===1?16:1)*(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY);
 if(Math.abs(wheelCarry)>=60){go(target+Math.sign(wheelCarry));wheelCarry=0;}
},{passive:false});
flow.addEventListener('pointerdown',e=>{
 if(e.button!==0||e.target.closest('.back'))return;
 drag={id:e.pointerId,x:e.clientX,p:pos,lastX:e.clientX,at:performance.now(),v:0,moved:false,album:e.target.closest('[data-album]')?.dataset.album};
});
flow.addEventListener('pointermove',e=>{
 if(drag?.id!==e.pointerId)return;
 const dx=e.clientX-drag.x;
 if(!drag.moved&&Math.abs(dx)<6)return;
 if(!drag.moved){flow.setPointerCapture(e.pointerId);flow.classList.add('drag');setFlipped(false);flipProgress=0;}
 drag.moved=true;
 const now=performance.now();drag.v=-(e.clientX-drag.lastX)/Math.max(12,now-drag.at);drag.at=now;drag.lastX=e.clientX;
 drag.position=albums.length>1?drag.p-dx/(width*STEP*2.2):0;wake();
});
flow.addEventListener('pointerup',e=>{
 if(drag?.id!==e.pointerId)return;
 const d=drag;drag=null;flow.classList.remove('drag');
 if(d.moved){go(Math.round(d.position+(performance.now()-d.at<100?Math.max(-2,Math.min(2,d.v*1.5)):0)));return;}
});
flow.addEventListener('pointercancel',()=>{if(drag){drag=null;flow.classList.remove('drag');go(Math.round(pos));}});
flow.addEventListener('click',e=>{const front=e.target.closest('[data-album]');if(!front)return;const i=+front.dataset.album;if(i===current)flip();else goToAlbum(i);});
addEventListener('keydown',e=>{
 if(reading()||e.target.closest('input')||e.altKey||e.ctrlKey||e.metaKey)return;
 if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();go(target+(e.key==='ArrowRight'?1:-1));}
 if(e.key==='Escape'&&flipped)flip();
 if(e.key==='Enter'&&e.target===flow){e.preventDefault();flip();}
});
el('prev').onclick=()=>go(target-1);el('next').onclick=()=>go(target+1);el('flip').onclick=flip;
el('prev').disabled=el('next').disabled=albums.length<2;


function openScore(song,trigger){
 returnFocus=trigger;onOpen(song);
}
addEventListener('xian-cover-active',event=>{
 if(event.detail&&returnFocus?.isConnected)requestAnimationFrame(()=>returnFocus.focus({preventScroll:true}));
});
addEventListener('resize',size);document.addEventListener('visibilitychange',wake);
size();
}
