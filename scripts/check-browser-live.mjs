import { chromium, expect } from '@playwright/test';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

// Explicit live check in a fresh browser, without the user's cookies or profile.
const origin = 'https://www.python.org';
const temporary = await mkdtemp(join(tmpdir(), 'net19-live-'));
const extension = join(temporary, 'extension');
let context;
let result;
try {
  await cp('dist/extension', extension, { recursive: true });
  const manifest = JSON.parse(await readFile(join(extension, 'manifest.json'), 'utf8'));
  manifest.host_permissions.push(`${origin}/*`);
  await writeFile(join(extension, 'manifest.json'), JSON.stringify(manifest));
  context = await chromium.launchPersistentContext(join(temporary, 'profile'), {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  const worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  await expect.poll(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length), { timeout: 5000 }).toBe(1);
  let archiveRequests = 0;
  context.on('request', request => { if (/^https:\/\/(?:web\.)?archive\.org\//.test(request.url())) archiveRequests++; });
  const page = await context.newPage();
  const start = Date.now();
  await page.goto(origin, { waitUntil: 'commit', timeout: 15_000 });
  const key = `profile:1:2019:${origin}`;
  await expect.poll(() => worker.evaluate(async key => !!(await chrome.storage.local.get(key))[key]?.css, key), { timeout: 16_000 }).toBe(true);
  const acquiredMs = Date.now() - start;
  const pack = await worker.evaluate(async key => (await chrome.storage.local.get(key))[key], key);
  const before = archiveRequests;
  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 15_000 });
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled', /^2019$/, { timeout: 3000 });
  const status = await worker.evaluate(async origin => {
    const tab = (await chrome.tabs.query({ url: `${origin}/*` }))[0];
    return chrome.tabs.sendMessage(tab.id, { type: 'PAGE_STATUS' });
  }, origin);
  result = { checkedAt: new Date().toISOString(), origin, browser: context.browser()?.version(), status: 'live-archive-and-cached-paint-passed',
    capturedAt: pack.capturedAt, acquiredMs, cachedPage: status, archiveRequestsDuringCachedVisit: archiveRequests - before };
  await mkdir('artifacts', { recursive: true });
  await page.screenshot({ path: resolve('artifacts/live-python-2019.png') });
} catch (error) {
  result = { checkedAt: new Date().toISOString(), origin, status: 'live-check-unavailable', reason: error.message.slice(0, 300) };
  process.exitCode = 1;
} finally {
  await context?.close();
  await rm(temporary, { recursive: true, force: true });
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/live-browser-check.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
}
