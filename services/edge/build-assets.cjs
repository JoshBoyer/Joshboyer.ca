'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
execFileSync(process.execPath, [path.join(root, 'tools/build-chat-client.cjs'), '--check'], { stdio: 'inherit' });
// Copy an explicit public asset allowlist. The repository and private corpus
// must never become a Workers asset directory.
const assets = ['chat-assistant.js', 'chat-assistant.css', 'chat-evidence.json',
  'assets/fonts/manrope-latin.woff2', 'assets/fonts/plus-jakarta-sans-latin.woff2', 'assets/fonts/ibm-plex-mono-400-latin.woff2'];
for (const relative of assets) {
  const target = path.join(__dirname, 'build/assets', relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, 'dist', relative), target);
}
fs.copyFileSync(path.join(__dirname, 'chat-preview.html'), path.join(__dirname, 'build/assets/chat-preview.html'));
console.log('Built private preview assets from the explicit allowlist.');
