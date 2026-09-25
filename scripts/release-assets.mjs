import { readdir, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

await mkdir('docs/images', { recursive: true });
for (const filename of ['settings.png', 'popup.png']) {
  const matches = [];
  for (const dir of await readdir('test-results', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    try { await readFile(resolve('test-results', dir.name, filename)); matches.push(resolve('test-results', dir.name, filename)); } catch { /* Only copy the intended screenshots. */ }
  }
  if (matches.length !== 1) throw new Error(`Expected exactly one verified ${filename} screenshot`);
  await cp(matches[0], `docs/images/${filename}`);
}
const promo = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280"><rect width="440" height="280" fill="#f7f8f1"/><text x="28" y="54" fill="#20281e" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="bold">net19</text><path d="M28 78H412" stroke="#d8ddce"/><text x="28" y="113" fill="#67705f" font-family="Arial,sans-serif" font-size="13">ARCHIVE YEAR</text><rect x="28" y="129" width="160" height="70" rx="8" fill="#d2ed8b"/><text x="108" y="181" text-anchor="middle" fill="#20281e" font-family="Arial,sans-serif" font-size="48" font-weight="bold">2019</text><text x="28" y="236" fill="#20281e" font-family="Arial,sans-serif" font-size="15">Automatic preparation · Local cache</text><text x="28" y="259" fill="#67705f" font-family="Arial,sans-serif" font-size="12">Choose a year from 2007 through today.</text></svg>`;
await writeFile('docs/images/promo.svg', promo);
await sharp(Buffer.from(promo)).png().toFile('docs/images/promo-440.png');
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
await mkdir('downloads', { recursive: true });
for (const suffix of ['.zip', '.zip.sha256']) await cp(`artifacts/net19-${version}${suffix}`, `downloads/net19-${version}${suffix}`);
console.log(`Prepared public screenshots, original promotional artwork and net19 ${version} ZIP.`);
