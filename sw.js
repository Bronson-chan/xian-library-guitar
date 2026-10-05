const CACHE='xian-pages-shell-v1';
const SCORE_CACHE='xian-pages-scores-v1';
const PREVIEW_CACHE='xian-pages-previews-v1';
const SHELL=['./','./index.html','./app.css','./app.js','./manifest.webmanifest','./assets/app-icon.svg','./assets/app-icon-192.png','./assets/app-icon-512.png','./assets/guitar-room.jpg'];
const scopePath=new URL(self.registration.scope).pathname;

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  await Promise.all(keys.filter(key=>key.startsWith('xian-pages-')&&![CACHE,SCORE_CACHE,PREVIEW_CACHE].includes(key)).map(key=>caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{
  if(event.data?.type!=='PRECACHE_PREVIEWS')return;
  event.waitUntil((async()=>{
    try{
      const response=await fetch('./assets/score-previews/index.json',{cache:'no-cache'});
      if(!response.ok)return;
      const urls=await response.json(),cache=await caches.open(PREVIEW_CACHE);
      for(let i=0;i<urls.length;i+=12)await Promise.allSettled(urls.slice(i,i+12).map(url=>cache.add(url)));
    }catch{}
  })());
});
self.addEventListener('fetch',event=>{
  const request=event.request;
  if(request.method!=='GET')return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin||!url.pathname.startsWith(scopePath))return;
  const relative=url.pathname.slice(scopePath.length);
  if(relative.startsWith('catalog/pages/')||relative.startsWith('catalog/media/')||(relative.startsWith('assets/score-previews/')&&!relative.endsWith('/index.json'))){
    const bucket=relative.startsWith('assets/score-previews/')?PREVIEW_CACHE:SCORE_CACHE;
    event.respondWith(caches.open(bucket).then(async cache=>{
      const hit=await cache.match(request);
      if(hit)return hit;
      const response=await fetch(request);
      if(response.ok)cache.put(request,response.clone());
      return response;
    }));
    return;
  }
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE);
    try{
      const response=await fetch(request,{cache:'no-cache'});
      if(response.ok)cache.put(request,response.clone());
      return response;
    }catch{
      return await cache.match(request)||await cache.match('./index.html')||Response.error();
    }
  })());
});
