import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {resolve,dirname,relative} from 'node:path';
const source=resolve(process.argv[2]),out=resolve('workbuddy/site/tunnel/vendor/three'),seen=new Set();
async function copy(file){
 file=resolve(file);if(seen.has(file))return;seen.add(file);
 const path=relative(source,file);if(path.startsWith('..'))throw Error('Outside Three.js package');
 const dest=resolve(out,path);await mkdir(dirname(dest),{recursive:true});await copyFile(file,dest);
 const code=await readFile(file,'utf8');
 for(const m of code.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){
  const spec=m[1];if(spec.startsWith('.'))await copy(resolve(dirname(file),spec));
  else if(spec==='three')await copy(resolve(source,'build/three.module.js'));
  else if(spec.startsWith('three/addons/'))await copy(resolve(source,'examples/jsm',spec.slice(13)));
 }
}
await copy(resolve(source,'build/three.module.js'));
for(const module of ['EffectComposer','RenderPass','UnrealBloomPass','ShaderPass','OutputPass'])await copy(resolve(source,'examples/jsm/postprocessing/'+module+'.js'));
await copy(resolve(source,'examples/jsm/utils/BufferGeometryUtils.js'));
await copyFile(resolve(source,'LICENSE'),resolve(out,'LICENSE'));
console.log('Copied',seen.size,'Three.js modules (0.185.1)');
