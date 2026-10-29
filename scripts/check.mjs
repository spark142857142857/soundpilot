import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const extension = path.join(root, 'extension');
const manifest = JSON.parse(fs.readFileSync(path.join(extension, 'manifest.json'), 'utf8'));
if (manifest.action.default_popup !== 'popup.html') throw Error('Action popup missing');
if (manifest.host_permissions.join() !== 'http://*/*,https://*/*') throw Error('Unexpected host scope');
for (const name of fs.readdirSync(extension).filter(name => name.endsWith('.js'))) {
  const result = spawnSync(process.execPath, ['--check', path.join(extension, name)], { encoding: 'utf8' });
  if (result.status !== 0) throw Error(result.stderr);
}
for (const size of [16, 32, 48, 128]) if (!fs.existsSync(path.join(extension, 'icons', `${size}.png`))) throw Error('Missing icon');
console.log('Manifest, JavaScript syntax and icons: pass');
