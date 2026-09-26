import { build } from 'esbuild';
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import sharp from 'sharp';

const out = new URL('../dist/extension/', import.meta.url);
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
await cp(new URL('../static/', import.meta.url), out, { recursive: true });
await build({ entryPoints: ['src/background.ts', 'src/popup.ts'],
  outdir: out.pathname, bundle: true, platform: 'browser', target: 'chrome120', format: 'iife',
  minify: true, legalComments: 'eof', logLevel: 'warning' });
// The logo is static/icons/icon.svg (copied as is); Chrome needs PNG toolbar icons, rendered from it here.
const icon = await readFile(new URL('../static/icons/icon.svg', import.meta.url));
for (const size of [16, 32, 48, 128]) {
  await sharp(icon).resize(size, size).png().toFile(new URL(`icons/${size}.png`, out).pathname);
}
const manifest = JSON.parse(await readFile(new URL('manifest.json', out), 'utf8'));
const sourcePackage = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (manifest.version !== sourcePackage.version) throw new Error('Package and manifest versions must match');
if (manifest.description.length > 132) throw new Error('Chrome Web Store description is too long');
console.log(`Built net19 ${manifest.version} → dist/extension`);
