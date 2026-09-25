import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const out = new URL('../dist/extension/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL('../static/', import.meta.url), out, { recursive: true });
await build({ entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts', 'src/options.ts', 'src/loading.ts', 'src/offscreen.ts'],
  outdir: out.pathname, bundle: true, platform: 'browser', target: 'chrome120', format: 'iife',
  minify: true, legalComments: 'eof', logLevel: 'warning' });
// Original vector artwork: no platform fonts, remote images, or generated-photo dependencies.
const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="27" fill="#344d2d"/><path d="M25 91V44h13v6c5-6 11-8 17-8 13 0 20 8 20 22v27H61V66c0-8-3-12-9-12-8 0-13 6-13 15v22z" fill="#d2ed8b"/><path d="M88 29h7v29h-7V37h-6v-5zM103 30q14-4 15 10v6q-1 16-16 12v-6q9 3 9-5-12 4-13-7 0-7 5-10zm4 5q-4 0-4 5t4 5q5 0 5-5t-5-5z" fill="#d2ed8b"/><circle cx="99" cy="88" r="9" fill="#f7f8f1"/></svg>`;
await mkdir(new URL('icons/', out), { recursive: true });
for (const size of [16, 32, 48, 128]) {
  await sharp(Buffer.from(icon)).resize(size, size).png().toFile(new URL(`icons/${size}.png`, out).pathname);
}
await writeFile(new URL('icons/icon.svg', out), icon);
const licenses = [];
for (const name of ['css-tree', 'mdn-data', 'source-map-js', 'parse5', 'entities']) {
  const directory = new URL(`../node_modules/${name}/`, import.meta.url);
  const pkg = JSON.parse(await readFile(new URL('package.json', directory), 'utf8'));
  let license = '';
  for (const file of ['LICENSE', 'LICENSE.txt', 'LICENSE.md']) {
    try { license = await readFile(new URL(file, directory), 'utf8'); break; } catch { /* Different packages use different license filenames. */ }
  }
  if (!license) throw new Error(`Missing redistribution license for ${name}`);
  licenses.push(`${name} ${pkg.version}\n${license}`);
}
await writeFile(new URL('THIRD_PARTY_NOTICES.txt', out), licenses.join('\n\n--------------------------------\n\n'));
const manifest = JSON.parse(await readFile(new URL('manifest.json', out), 'utf8'));
const sourcePackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (manifest.version !== sourcePackage.version) throw new Error('Package and manifest versions must match');
if (manifest.description.length > 132) throw new Error('Chrome Web Store description is too long');
console.log(`Built net19 ${manifest.version} → dist/extension`);
