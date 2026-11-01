'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
execFileSync(process.execPath, [path.join(root, 'tools/build-chat-client.cjs'), '--check'], { stdio: 'inherit' });
// Copy an explicit public asset allowlist. The repository and private corpus
// must never become a Workers asset directory.
const assets = ['chat-assistant.js', 'chat-request-details.js', 'chat-assistant.css', 'chat-evidence.json',
  'assets/fonts/manrope-latin.woff2', 'assets/fonts/plus-jakarta-sans-latin.woff2', 'assets/fonts/ibm-plex-mono-400-latin.woff2',
  'assets/jb-mark.svg', 'assets/jb-logo-transparent.png',
  'assets/personal/josh-portrait-main.jpg', 'assets/personal/josh-portrait-smiling.jpg', 'assets/optimized-extra/personal/josh-portrait-vest-640.webp',
  'assets/skills-mountain-horizon-bg.jpg',
  'assets/personal/josh-avatar-idle.mp4', 'assets/personal/josh-intro-voice.mp3',
  'assets/chat/elevenlabs-voice-orb.webp',
  'assets/chat/elevenlabs-alpine-footer.webp'];
for (const relative of assets) {
  const target = path.join(__dirname, 'build/assets', relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(path.join(root, 'dist', relative), target);
}
fs.copyFileSync(path.join(__dirname, 'chat-preview.html'), path.join(__dirname, 'build/assets/chat-preview.html'));
console.log('Built private preview assets from the explicit allowlist.');
