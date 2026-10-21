import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
execFileSync('tar', ['-cf', 'packed/workbuddy-assets.tar', 'workbuddy/site/assets'], { cwd: root });
const bytes = await readFile(resolve(root, 'packed/workbuddy-assets.tar'));
for (let offset = 0, part = 0; offset < bytes.length; offset += 8*1024*1024, part++) {
  await writeFile(resolve(root, `packed/workbuddy-assets.tar.part-${String(part).padStart(3, '0')}`), bytes.subarray(offset, offset + 8*1024*1024));
}
console.log(`Packaged ${bytes.length} bytes of WorkBuddy assets`);
