import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..','pages-dist');
const base='/xian-library-guitar/';
const port=Number(process.env.PORT||43129);
const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.webmanifest':'application/manifest+json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp'};

createServer(async(request,response)=>{
  const path=new URL(request.url,'http://127.0.0.1').pathname;
  if(!path.startsWith(base)){response.writeHead(404);response.end('Not found');return}
  const relative=decodeURIComponent(path.slice(base.length))||'index.html';
  const file=normalize(join(root,relative));
  if(!file.startsWith(root)){response.writeHead(403);response.end('Forbidden');return}
  try{
    const info=await stat(file);
    if(!info.isFile())throw Error();
    response.writeHead(200,{'Content-Type':types[extname(file).toLowerCase()]||'application/octet-stream','Cache-Control':'no-cache'});
    response.end(await readFile(file));
  }catch{response.writeHead(404);response.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log(`Static Pages QA: http://127.0.0.1:${port}${base}`));
