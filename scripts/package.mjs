import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'extension/manifest.json'), 'utf8'));
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const destination = path.join(root, 'dist', `soundpilot-${manifest.version}.zip`);
// Package runtime files and their license. The ZIP has no enclosing directory.
const command = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression
$source = $env:SOUNDPILOT_SOURCE
$stream = [IO.File]::Open($env:SOUNDPILOT_ZIP, [IO.FileMode]::Create)
$zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $source -File -Recurse | ForEach-Object {
    $name = $_.FullName.Substring($source.Length + 1).Replace('\\', '/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $name) | Out-Null
  }
  [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $env:SOUNDPILOT_LICENSE, 'LICENSE') | Out-Null
} finally { $zip.Dispose(); $stream.Dispose() }
$read = [IO.Compression.ZipFile]::OpenRead($env:SOUNDPILOT_ZIP)
try { ConvertTo-Json -Compress -InputObject @($read.Entries | ForEach-Object { $_.FullName }) }
finally { $read.Dispose() }
`;
const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
  encoding: 'utf8', env: { ...process.env, SOUNDPILOT_SOURCE: path.join(root, 'extension'), SOUNDPILOT_ZIP: destination, SOUNDPILOT_LICENSE: path.join(root, 'LICENSE') }
});
if (result.status !== 0) throw Error(result.stderr || result.stdout);
const entries = JSON.parse(result.stdout.trim());
if (!entries.includes('manifest.json') || !entries.includes('LICENSE') || entries.some(name => name.includes('\\') || name.startsWith('/') || name.includes('..'))) throw Error('Invalid package layout');
const digest = createHash('sha256').update(fs.readFileSync(destination)).digest('hex');
fs.writeFileSync(`${destination}.sha256`, `${digest}  ${path.basename(destination)}\n`);
console.log(destination);
console.log(`Verified ${entries.length} files; SHA-256 ${digest}`);
