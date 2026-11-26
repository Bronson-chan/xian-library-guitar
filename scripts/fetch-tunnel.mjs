import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {stripTypeScriptTypes} from 'node:module';
const pkg=JSON.parse(await readFile(process.argv[2],'utf8'));
const out='workbuddy/site/tunnel/vendor';
await mkdir(out,{recursive:true});
for(const file of pkg.files){
 if(!/^[\w.-]+$/.test(file.path))throw Error('Unsafe package path');
 const hash=createHash('sha256').update(file.content).digest('hex');
 if(hash!==file.sha256)throw Error('Source checksum mismatch: '+file.path);
 let content=file.content;
 if(file.path==='AlbumCoverTunnelEngine.js')content=content.replace(/^var DEFAULT_COVERS = .*;$/m,'var DEFAULT_COVERS = [];').replace('from "./motion-runtime"','from "./motion-runtime.js"');
 await writeFile(out+'/'+file.path,content);
 if(file.path==='motion-runtime.ts')await writeFile(out+'/motion-runtime.js',stripTypeScriptTypes(content));
 console.log(file.path,file.content.length);
}
