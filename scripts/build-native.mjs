import { spawnSync } from 'node:child_process';
import { writeFile } from 'node:fs/promises';

const environment = process.argv[2];
if (!['sandbox', 'production'].includes(environment)) {
  throw new Error('Choose sandbox for iOS development, production for TestFlight/App Store.');
}
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'native'], {
  stdio: 'inherit',
  env: { ...process.env, VITE_NATIVE_APNS_ENVIRONMENT: environment },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
await import('./prepare-native.mjs');
await writeFile('dist-native/apns-environment.txt', environment + '\n');
