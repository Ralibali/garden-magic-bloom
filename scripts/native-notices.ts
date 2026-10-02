import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Plugin } from 'vite';

type PackageInfo = { name: string; version: string; license?: string };
type PackageEntry = PackageInfo & { directory: string };

// These published npm tarballs omit their upstream license files. Keep the
// fallback tied to the reviewed version; upgrades must review the license too.
const FALLBACKS: Record<string, string> = {
  '@lovable.dev/cloud-auth-js@1.1.2': 'cloud-auth-js-MIT-declaration.txt',
  '@pdf-lib/fontkit@1.1.1': 'fontkit-MIT-declaration.txt',
  '@radix-ui/number@1.1.1': 'radix-primitives-LICENSE.txt',
  '@radix-ui/primitive@1.1.2': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-focus-guards@1.1.2': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-use-previous@1.1.1': 'radix-primitives-LICENSE.txt',
  'next-themes@0.3.0': 'next-themes-LICENSE.txt',
  '@supabase/functions-js@2.98.0': 'supabase-LICENSE.txt',
  '@supabase/postgrest-js@2.98.0': 'supabase-LICENSE.txt',
  '@supabase/realtime-js@2.98.0': 'supabase-LICENSE.txt',
  '@supabase/storage-js@2.98.0': 'supabase-LICENSE.txt',
  '@supabase/supabase-js@2.98.0': 'supabase-LICENSE.txt',
  '@radix-ui/react-compose-refs@1.1.2': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-context@1.1.2': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-direction@1.1.1': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-id@1.1.1': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-use-callback-ref@1.1.1': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-use-escape-keydown@1.1.1': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-use-layout-effect@1.1.1': 'radix-primitives-LICENSE.txt',
  '@radix-ui/react-use-size@1.1.1': 'radix-primitives-LICENSE.txt',
  'react-remove-scroll-bar@2.3.8': 'react-remove-scroll-bar-LICENSE.txt',
};

const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const read = (file: string) => readFileSync(file, 'utf8').replace(/\r\n/g, '\n').trim();

function packageForModule(id: string): PackageEntry | null {
  if (!id.includes('/node_modules/')) return null;
  let directory = path.dirname(id.replace(/^\0+/, '').split('?')[0]);
  while (directory.includes('/node_modules')) {
    const file = path.join(directory, 'package.json');
    if (existsSync(file)) {
      const info = JSON.parse(readFileSync(file, 'utf8')) as PackageInfo;
      if (info.name && info.version) return { ...info, directory };
    }
    directory = path.dirname(directory);
  }
  throw new Error(`Cannot identify native dependency: ${id}`);
}

/** Preserve notices independently of minifiers stripping source comments. */
export function nativeNotices(): Plugin {
  let root = '';
  return {
    name: 'native-third-party-notices',
    apply: 'build',
    configResolved(config) { root = config.root; },
    generateBundle(_options, bundle) {
      const sources = JSON.parse(readFileSync(path.join(root, 'licenses/native/sources.json'), 'utf8')) as { file: string; sha256: string }[];
      for (const source of sources) {
        const bytes = readFileSync(path.join(root, 'licenses/native', source.file));
        if (createHash('sha256').update(bytes).digest('hex') !== source.sha256) {
          throw new Error(`Native notice differs from its reviewed provenance: ${source.file}`);
        }
      }
      const packages = new Map<string, PackageEntry>();
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk') continue;
        for (const [id, module] of Object.entries(chunk.modules)) {
          if (module.renderedLength === 0) continue;
          const entry = packageForModule(id);
          if (entry) packages.set(`${entry.name}@${entry.version}`, entry);
        }
      }
      // Platform runtimes are compiled outside Rollup, but need notices too.
      for (const name of ['@capacitor/android', '@capacitor/ios']) {
        const directory = path.join(root, 'node_modules', name);
        const entry = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8')) as PackageInfo;
        packages.set(`${entry.name}@${entry.version}`, { ...entry, directory });
      }

      const sections = [
        'Odlingsdagboken — third-party notices',
        'Licenses for JavaScript included in this native build, its native runtimes and bundled fonts.\nPackages that are removed from the native build are not listed. Original copyright and permission notices follow.',
      ];
      const manifest: { package: string; license: string; files: string[] }[] = [];
      const missing: string[] = [];
      for (const [key, entry] of [...packages].sort(([a], [b]) => compare(a, b))) {
        const files = readdirSync(entry.directory, { withFileTypes: true })
          .filter(file => file.isFile() && /^(licen[sc]e|copying|notice|authors|copyright)(?:[._-]|$)/i.test(file.name))
          .map(file => file.name).sort(compare);
        let texts: string[];
        if (files.length) texts = files.map(file => `${file}\n\n${read(path.join(entry.directory, file))}`);
        else {
          const fallback = FALLBACKS[key];
          if (!fallback) { missing.push(`${key} (${entry.license ?? 'unspecified'})`); continue; }
          files.push(`licenses/native/${fallback}`);
          texts = [read(path.join(root, 'licenses/native', fallback))];
        }
        if (texts.some(text => text.length < 100)) throw new Error(`Incomplete native notice for ${key}`);
        sections.push(`${key}\nLicense: ${entry.license ?? 'See the original notices below'}\n\n${texts.join('\n\n')}`);
        manifest.push({ package: key, license: entry.license ?? '', files });
      }
      if (missing.length) throw new Error(`Missing native license text for: ${missing.join(', ')}. Add verified upstream notices before shipping.`);

      const resolved = JSON.parse(readFileSync(path.join(root, 'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved'), 'utf8')) as {
        pins: { identity: string; state: { revision: string } }[];
      };
      const native = [
        {
                "name": "capacitor-swift-pm",
                "revision": "6afa7424fd2fcd8ca1e577478e8a00af284b7e82"
        },
        {
                "name": "ion-ios-camera",
                "revision": "00c3dfdd6267f80db299d9c5a0bad522156b6cbc"
        },
        {
                "name": "ion-ios-filesystem",
                "revision": "56e86f9dd944a5050d182d2eba9db8d627d87b4b"
        }
];
      for (const item of native) {
        if (resolved.pins.find(pin => pin.identity === item.name)?.state.revision !== item.revision) {
          throw new Error(`Review the bundled native license after upgrading ${item.name}`);
        }
        sections.push(`${item.name} (${item.revision})\n\n${read(path.join(root, 'licenses/native', `${item.name}-LICENSE.txt`))}`);
      }
      sections.push(`Apache Cordova compatibility runtime\n\n${read(path.join(root, 'licenses/native/cordova-NOTICE.txt'))}\n\n${read(path.join(root, 'licenses/native/cordova-LICENSE.txt'))}`);
      sections.push(`Feather icons (MIT portions of Lucide)\n\n${read(path.join(root, 'licenses/native/feather-LICENSE.txt'))}`);
      for (const name of ['fraunces', 'dmsans']) {
        sections.push(`${name} font\n\n${read(path.join(root, 'public/fonts', `${name}-OFL.txt`))}`);
      }

      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_NOTICES.txt', source: `${sections.join('\n\n' + '='.repeat(72) + '\n\n')}\n` });
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_PACKAGES.json', source: `${JSON.stringify(manifest, null, 2)}\n` });
      this.emitFile({ type: 'asset', fileName: 'THIRD_PARTY_SOURCES.json', source: `${JSON.stringify(sources, null, 2)}\n` });
    },
  };
}
