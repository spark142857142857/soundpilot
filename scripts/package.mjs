import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json'), 'utf8'));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const destination = path.join(root, 'dist', `soundpilot-mvp-${manifest.version}.zip`);
// Only the extension directory is packaged. No research, profiles or local evidence.
const result = spawnSync('powershell.exe', ['-NoProfile', '-Command',
  "Compress-Archive -Path (Join-Path $env:SOUNDPILOT_SOURCE '*') -DestinationPath $env:SOUNDPILOT_ZIP -Force"], {
  encoding: 'utf8', env: { ...process.env, SOUNDPILOT_SOURCE: path.join(root, 'extension'), SOUNDPILOT_ZIP: destination }
});
if (result.status !== 0) throw Error(result.stderr || result.stdout);
console.log(destination);
