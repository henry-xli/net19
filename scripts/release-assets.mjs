import { readdir, cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';

await mkdir('docs/images', { recursive: true });
for (const filename of ['popup.png']) {
  const matches = [];
  for (const dir of await readdir('test-results', { withFileTypes: true })) {
    if (!dir.isDirectory()) continue;
    try { await readFile(resolve('test-results', dir.name, filename)); matches.push(resolve('test-results', dir.name, filename)); } catch { /* Only copy the intended screenshots. */ }
  }
  if (matches.length !== 1) throw new Error(`Expected exactly one verified ${filename} screenshot`);
  await cp(matches[0], `docs/images/${filename}`);
}
const promo = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="280" viewBox="0 0 440 280"><rect width="440" height="280" fill="#fff"/><g transform="translate(28 28) scale(.4375)"><rect width="128" height="128" rx="27" fill="#1a73e8"/><g fill="none" stroke="#fff" stroke-linecap="round" stroke-linejoin="round"><path d="M15 41l8.5 17L32 41" stroke-width="7"/><path d="M43 52l12-9v56" stroke-width="11"/><circle cx="85" cy="58" r="14" stroke-width="11"/><path d="M99 58v14c0 17-9 27-24 27" stroke-width="11"/></g></g><text x="100" y="68" fill="#202124" font-family="Arial,Helvetica,sans-serif" font-size="36" font-weight="bold">net19</text><text x="28" y="150" fill="#202124" font-family="Arial,Helvetica,sans-serif" font-size="24">Websites as they looked</text><text x="28" y="184" fill="#202124" font-family="Arial,Helvetica,sans-serif" font-size="24">in 2019.</text><text x="28" y="246" fill="#5f6368" font-family="Arial,Helvetica,sans-serif" font-size="13">Google · YouTube · Wikipedia · Reddit · GitHub · and 85 more</text></svg>`;
await writeFile('docs/images/promo.svg', promo);
await sharp(Buffer.from(promo)).png().toFile('docs/images/promo-440.png');
const version = JSON.parse(await readFile('package.json', 'utf8')).version;
await mkdir('downloads', { recursive: true });
for (const suffix of ['.zip', '.zip.sha256']) await cp(`artifacts/net19-${version}${suffix}`, `downloads/net19-${version}${suffix}`);
console.log(`Prepared public screenshots, original promotional artwork and net19 ${version} ZIP.`);
