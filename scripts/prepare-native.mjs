import { rename, readFile } from 'node:fs/promises';
await rename('dist-native/native.html', 'dist-native/index.html');
const html = await readFile('dist-native/index.html', 'utf8');
for (const forbidden of ['googletagmanager.com', 'plausible.io', 'manifest.webmanifest', 'registerSW']) {
  if (html.includes(forbidden)) throw new Error(`Native bundle contains ${forbidden}`);
}
console.log('Native app bundled without web trackers or service worker registration.');
