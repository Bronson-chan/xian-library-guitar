import {execFileSync} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
execFileSync('tar',['-cf','packed/fast-library.tar','workbuddy/site/tunnel/covers','workbuddy/site/score-preview']);
const bytes=await readFile('packed/fast-library.tar');
for(let offset=0,part=0;offset<bytes.length;offset+=8*1024*1024,part++)await writeFile('packed/fast-library.tar.part-'+String(part).padStart(3,'0'),bytes.subarray(offset,offset+8*1024*1024));
console.log('Packaged',bytes.length,'bytes of fast display assets');
