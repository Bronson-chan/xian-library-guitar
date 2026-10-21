import { cp, mkdir, readFile, rename, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const meta = JSON.parse(await readFile(join(root, 'workbuddy/source/meta.json'), 'utf8'));
if (meta.songs.length !== 157 || new Set(meta.songs.map(s => s.i)).size !== 157) throw Error('Expected 157 distinct songs');
const avatars = JSON.parse(await readFile(join(root, 'workbuddy/source/img_report.json'), 'utf8')).avatar_map;
for (const song of meta.songs) {
  for (const kind of ['tabs', 'covers']) {
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
console.log('Verified 157 songs, all covers and artist photos; original 6648x3366 score. Previous app preserved at legacy/.');
