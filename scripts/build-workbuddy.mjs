import { cp, mkdir, readFile, readdir, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const meta = JSON.parse(await readFile(join(root, 'workbuddy/source/meta.json'), 'utf8'));
if (meta.songs.length < 162 || meta.totalFiles !== meta.songs.length || new Set(meta.songs.map(s => s.i)).size !== meta.songs.length) throw Error('Expected at least 162 distinct songs and a matching catalog total');
const avatars = JSON.parse(await readFile(join(root, 'workbuddy/source/img_report.json'), 'utf8')).avatar_map;
for (const song of meta.songs) {
  if (!song.previewWidth || !(await stat(join(root,'workbuddy/site/score-preview',song.i+'.webp'))).size) throw Error('Missing fast preview: '+song.t);
  if (!(await stat(join(root,'workbuddy/site/tunnel/covers',song.i+'.webp'))).size) throw Error('Missing small cover: '+song.t);
  // Every song added since the handoff needs verified recording metadata and real album artwork.
  if (song.i >= 156) {
    if (!song.a || !song.album || !song.albumArtist || !song.artworkVerified || !song.artworkSource?.startsWith('https://') || !song.trackSource?.startsWith('https://') || !song.coverPath?.startsWith('album-art/')) throw Error(`Verify singer, recording album and real artwork before publishing ${song.t}`);
    if (!avatars[song.a]) throw Error(`Missing singer portrait for ${song.t}`);
    if (!(await stat(join(root, 'workbuddy/site', song.coverPath))).size) throw Error(`Missing verified album artwork: ${song.t}`);
  }
  for (const kind of song.coverPath ? ['tabs'] : ['tabs', 'covers']) {
    const info = await stat(join(root, `workbuddy/site/assets/${kind}/${song.i}.jpg`));
    if (!info.size) throw Error(`Missing ${kind} for ${song.t}`);
  }
}
for (const value of Object.values(avatars)) {
  const info = await stat(join(root, 'workbuddy/site', value));
  if (!info.size) throw Error(`Missing artist photo ${value}`);
}
const replacement = await readFile(join(root, 'workbuddy/site/assets/tabs/156.jpg'));
let dimensions;
for (let offset = 2; offset < replacement.length;) {
  if (replacement[offset++] !== 255) continue;
  const marker = replacement[offset++];
  if (marker === 218 || marker === 217) break;
  const length = replacement.readUInt16BE(offset);
  if ([192,193,194].includes(marker)) { dimensions = [replacement.readUInt16BE(offset + 5), replacement.readUInt16BE(offset + 3)]; break; }
  offset += length;
}
if (dimensions?.join('x') !== '6648x3366') throw Error('Original score must remain 6648x3366');
const html = await readFile(join(root, 'workbuddy/site/index.html'), 'utf8');
if (html.includes('__SONGS_JSON__') || !html.includes('original-20261021')) throw Error('Rebuild the WorkBuddy template first');
await import('./build-pages.mjs');
const output = join(root, 'pages-dist');
const legacy = join(root, '.legacy-build');
await rename(output, legacy);
await mkdir(output);
await cp(join(root, 'workbuddy/site'), output, { recursive: true });
await rename(legacy, join(output, 'legacy'));
await writeFile(join(output, '.nojekyll'), '');
const tunnelCatalog=await Promise.all(meta.songs.map(async s=>{
 const cover=await readFile(join(output,'tunnel/covers',s.i+'.webp'));
 return {i:s.i,t:s.t,a:s.a,f:s.f,nl:s.nl,previewWidth:s.previewWidth,cover:'./covers/'+s.i+'.webp',album:s.album||'',coverGroup:createHash('sha256').update(cover).digest('hex').slice(0,20)};
}));
await writeFile(join(output,'tunnel/catalog.json'),JSON.stringify(tunnelCatalog));
const worker=await readFile(join(root,'workbuddy/site/offline-worker.js'),'utf8');
const gallery=await readFile(join(output,'tunnel/index.html'),'utf8');
const pwaBoot=`<link rel="manifest" href="../manifest.webmanifest"><meta name="theme-color" content="#101119"><script>
if(/^#(?:song=\\d+|home|tools|lib|fav|log|tags|learning)$/.test(location.hash))location.replace(new URL('../workbench.html'+location.hash,document.baseURI));
if('serviceWorker' in navigator){let controlled=!!navigator.serviceWorker.controller;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(controlled){controlled=false;location.reload();}});navigator.serviceWorker.register(new URL('../sw.js',document.baseURI),{scope:new URL('../',document.baseURI).pathname,updateViaCache:'none'}).then(r=>r.update()).catch(()=>{});}
</script>`;
await writeFile(join(output,'workbench.html'),html);
await writeFile(join(output,'index.html'),gallery.replace('<head>','<head><base href="./tunnel/">'+pwaBoot));
const release=createHash('sha256').update(html+gallery+worker+pwaBoot).digest('hex').slice(0,12);
await writeFile(join(output,'offline-worker.js'),worker.replaceAll('__RELEASE__',release));
await writeFile(join(output,'sw.js'),"importScripts('./offline-worker.js?release="+release+"');");
const offline=new Set(['index.html','workbench.html','manifest.webmanifest','icon-192.png','icon-512.png','assets/hero.jpg',...Object.values(avatars)]);
for(const path of await readdir(join(output,'tunnel'),{recursive:true}))if(/\.(js|json|html|css|webp)$/.test(path))offline.add('tunnel/'+path.replaceAll('\\','/'));
for(const s of meta.songs){offline.add('assets/tabs/'+s.i+'.jpg'+(s.i===156?'?v=original-20261021':''));offline.add(s.coverPath||'assets/covers/'+s.i+'.jpg');}
const originals=JSON.parse(await readFile(join(root,'catalog/scores.json'),'utf8')).songs;
for(const s of meta.songs)if(s.previewWidth)offline.add('score-preview/'+s.i+'.webp');
for(const s of originals)if(s.coverUrl)offline.add('legacy/'+s.coverUrl.replace(/^\.\//,''));
await writeFile(join(output,'offline-manifest.json'),JSON.stringify([...offline]));
console.log(`Verified ${meta.songs.length} songs, all covers and artist photos; original 6648x3366 score. Previous app preserved at legacy/.`);
