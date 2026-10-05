import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const output=join(root,'pages-dist');
const catalog=JSON.parse(await readFile(join(root,'catalog','scores.json'),'utf8'));
if(!Array.isArray(catalog.songs)||catalog.songs.length!==156)throw Error('The published catalog must contain all 156 imported songs');
const previewIndex=JSON.parse(await readFile(join(root,'assets','score-previews','index.json'),'utf8'));
const previewSet=new Set(previewIndex.map(path=>path.replace(/^\.\//,'')));

for(const song of catalog.songs){
  if(!song.id||!song.title||!song.artist||!song.pages?.length)throw Error(`Incomplete song: ${song.id||song.title}`);
  const preview=`assets/score-previews/${song.id}.webp`;
  if(!previewSet.has(preview))throw Error(`Missing preview: ${song.id}`);
  for(const path of [preview,...song.pages.map(page=>page.url),song.coverUrl,song.artistImageUrl].filter(Boolean)){
    const relative=path.replace(/^\.\//,'');
    if(!relative.startsWith('assets/')&&!relative.startsWith('catalog/'))throw Error(`Invalid public asset path: ${path}`);
    const info=await stat(join(root,relative));
    if(!info.isFile()||!info.size)throw Error(`Missing or empty public asset: ${relative}`);
  }
}

await rm(output,{recursive:true,force:true});
await mkdir(output,{recursive:true});
for(const file of ['index.html','app.css','app.js','manifest.webmanifest','sw.js'])await cp(join(root,file),join(output,file));
for(const folder of ['assets','catalog'])await cp(join(root,folder),join(output,folder),{recursive:true});
await writeFile(join(output,'.nojekyll'),'');
console.log(`Built GitHub Pages PWA with ${catalog.songs.length} complete songs`);
