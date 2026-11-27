const SHELL='xian-shell-__RELEASE__',MEDIA='xian-offline-media-v2',COVERS='xian-cover-art-v1',scope=self.registration.scope;
const absolute=p=>new URL(p,scope).href,shellURL=absolute('index.html');
self.addEventListener('install',e=>e.waitUntil((async()=>{const c=await caches.open(SHELL);await c.addAll(['./','index.html','workbench.html','manifest.webmanifest','icon-192.png','icon-512.png'].map(p=>new Request(absolute(p),{cache:'reload'})));await self.skipWaiting();})()));
self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));
async function download(request){const c=new AbortController(),t=setTimeout(()=>c.abort(),10000);try{const r=await fetch(request,{signal:c.signal});if(!r.ok)throw Error('HTTP '+r.status);return r;}finally{clearTimeout(t);}}
self.addEventListener('fetch',e=>{
 const req=e.request,u=new URL(req.url);if(req.method!=='GET'||u.origin!==self.location.origin||!u.href.startsWith(scope))return;
 // The workbench shell must never replace the separate cover-roaming document.
 // Keep its modules on normal HTTP caching so a new deployment is immediately visible.
 if(u.pathname.startsWith(new URL('tunnel/',scope).pathname)){
  const coverArt=u.pathname.startsWith(new URL('tunnel/covers/',scope).pathname);
  if((coverArt||u.pathname===new URL('tunnel/catalog.json',scope).pathname)&&u.searchParams.has('v')){
   e.respondWith((async()=>{
    const c=await caches.open(coverArt?COVERS:SHELL),hit=await c.match(req)||await caches.match(req);
    if(hit)return hit;
    try{
     const response=await download(req);
     e.waitUntil(c.put(req,response.clone()).catch(()=>{}));
     return response;
    }catch{return await caches.match(req,{ignoreSearch:true})||Response.error();}
   })());return;
  }
  e.respondWith(fetch(req).catch(async()=>await caches.match(req,{ignoreSearch:true})||Response.error()));return;
 }
 if(req.mode==='navigate'&&u.pathname.includes('/legacy/'))return;
 e.respondWith((async()=>{const nav=req.mode==='navigate',c=await caches.open(nav?SHELL:MEDIA),key=nav?(u.pathname===new URL('workbench.html',scope).pathname?absolute('workbench.html'):shellURL):req.url;
 const hit=await c.match(key)||(!nav?await caches.match(req):undefined);
 async function update(){const r=await download(req);await c.put(key,r.clone());return r;}
 if(hit){if(nav)e.waitUntil(update().catch(()=>{}));return hit;}
 try{return await update();}catch{try{return await update();}catch{return Response.error();}}
 })());
});
let saving=false,cancelled=false;
self.addEventListener('message',e=>{
 if(e.data?.type==='CANCEL_OFFLINE'){cancelled=true;return;}if(e.data?.type!=='SAVE_OFFLINE'||saving)return;
 saving=true;cancelled=false;e.waitUntil((async()=>{let done=0,failed=0;const send=d=>e.source?.postMessage({type:'OFFLINE_PROGRESS',...d});
 try{const list=await(await download(absolute('offline-manifest.json'))).json(),c=await caches.open(MEDIA);
 for(const path of list){if(cancelled)break;const url=absolute(path);try{if(!await c.match(url))await c.put(url,await download(url));done++;}catch{failed++;}send({done,failed,total:list.length});}
 send({done,failed,total:list.length,finished:true,cancelled});
 }catch(error){send({finished:true,error:String(error)});}finally{saving=false;}})());
});
