import { chromium, expect, test, type BrowserContext, type Worker } from '@playwright/test';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';
import { makePack, LIVE_HTML, OLD_HTML, OLD_CSS, ORIGIN, TIMESTAMP } from '../fixtures';
import { profileKey, INDEX_KEY } from '../../src/shared';

let context: BrowserContext;
let worker: Worker;
let extensionId: string;
let archiveRequests: string[];
let delay = 0;
let unavailable = false;
let gzipReplay = false;
let errors: string[];
const SECOND = 'https://other-fixture.example';

test.beforeEach(async ({}, info) => {
  const extension = resolve(info.outputDir, 'extension');
  await mkdir(info.outputDir, { recursive: true });
  await cp(resolve('dist/extension'), extension, { recursive: true });
  const manifest = JSON.parse(await readFile(resolve(extension, 'manifest.json'), 'utf8'));
  // Test-only required origins allow deterministic headless tests of production content
  // scripts. The shipping manifest keeps site access OPTIONAL and ships no test fixtures.
  manifest.host_permissions.push(`${ORIGIN}/*`, `${SECOND}/*`);
  await writeFile(resolve(extension, 'manifest.json'), JSON.stringify(manifest));
  delay = 0; unavailable = false; gzipReplay = false; archiveRequests = []; errors = [];
  context = await chromium.launchPersistentContext(resolve(info.outputDir, 'profile'), {
    channel: 'chromium', headless: true, viewport: { width: 1280, height: 800 },
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`],
  });
  await context.route('https://**/*', async route => {
    const url = route.request().url();
    if (url.startsWith(ORIGIN) || url.startsWith(SECOND)) {
      await route.fulfill({ contentType: 'text/html', body: LIVE_HTML,
        headers: url.includes('strict-csp') ? { 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'none'" } : {} });
      return;
    }
    if (['web.archive.org', 'archive.org'].includes(new URL(url).hostname)) {
      archiveRequests.push(url);
      if (delay) await new Promise(resolve => setTimeout(resolve, delay));
      if (unavailable) { await route.fulfill({ status: 503, body: 'Archive unavailable' }); return; }
      if (url.includes('/cdx/')) {
        const target = new URL(url).searchParams.get('url')!;
        await route.fulfill({ contentType: 'application/json', body: JSON.stringify([
          ['timestamp', 'original', 'statuscode', 'mimetype'], [TIMESTAMP, target, '200', 'text/html'],
        ]) });
      } else if (url.includes('/wayback/available')) {
        await route.fulfill({ contentType: 'application/json', body: '{"archived_snapshots":{}}' });
      } else if (gzipReplay && url.endsWith('/main.css')) {
        await route.fulfill({ contentType: 'text/css', body: gzipSync(OLD_CSS) });
      } else await route.fulfill({ contentType: 'text/html', body: gzipReplay ? OLD_HTML.replace(`<style>${OLD_CSS}</style>`, '<link rel="stylesheet" href="/main.css">') : OLD_HTML });
      return;
    }
    await route.abort();
  });
  worker = context.serviceWorkers()[0] ?? await context.waitForEvent('serviceworker');
  extensionId = new URL(worker.url()).host;
  context.on('weberror', error => errors.push(error.error().message));
  await expect.poll(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length)).toBe(1);
});

test.afterEach(async () => { await context.close(); expect(errors).toEqual([]); });

async function seed(origin = ORIGIN) {
  const pack = makePack(origin);
  await worker.evaluate(async ({ key, pack, index }) => {
    await chrome.storage.local.set({ [key]: pack, [index]: { [key]: { usedAt: Date.now(), bytes: JSON.stringify(pack).length, kind: 'profile' } } });
  }, { key: profileKey(origin, 2019), pack, index: INDEX_KEY });
}

test('cached navigation applies archived styling before reveal, with no archive request or reload', async ({}, info) => {
  await seed();
  const page = await context.newPage(); let loads = 0;
  page.on('load', () => loads++);
  await page.addInitScript(() => {
    const samples: { visible: boolean; styled: boolean; time: number }[] = [];
    (window as unknown as { paintSamples: typeof samples }).paintSamples = samples;
    const sample = () => {
      const gate = document.getElementById('net19-loading-screen');
      if (document.body) samples.push({ visible: !gate || getComputedStyle(gate).visibility === 'hidden', styled: document.documentElement.hasAttribute('data-net19-styled'), time: performance.now() });
      if (samples.length < 80) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await page.goto(`${ORIGIN}/private/path?token=never-send-this`);
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 240, 220)');
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0);
  await page.getByRole('button', { name: 'Subscribe' }).click();
  await expect(page.getByRole('status')).toHaveText('You are subscribed.');
  const samples = await page.evaluate(() => (window as unknown as { paintSamples: { visible: boolean; styled: boolean; time: number }[] }).paintSamples);
  expect(samples.filter(s => s.visible && !s.styled)).toEqual([]);
  expect(samples.find(s => s.styled)!.time).toBeLessThan(500);
  expect(archiveRequests).toEqual([]); expect(loads).toBe(1);
  await writeFile(resolve(info.outputDir, 'paint-timing.json'), JSON.stringify({ firstStyledFrameMs: samples.find(s => s.styled)!.time, visibleUnstyledFrames: samples.filter(s => s.visible && !s.styled).length, archiveRequests: archiveRequests.length, loads }, null, 2));
  await page.screenshot({ path: resolve(info.outputDir, 'cached-2019.png') });
  await info.attach('paint-timing', { body: JSON.stringify(samples.slice(0, 6)), contentType: 'application/json' });
});

test('cold archive is analyzed locally and uses only the homepage address', async () => {
  const page = await context.newPage();
  await page.goto(`${ORIGIN}/private/path?secret=not-for-archive`);
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  expect(archiveRequests.length).toBe(3);
  expect(archiveRequests.join('\n')).not.toContain('secret');
  expect(archiveRequests.join('\n')).not.toContain('/private/path');
  expect(new URL(archiveRequests[0]).searchParams.get('url')).toBe(`${ORIGIN}/`);
});

test('slow result warms the cache but never repaints the current page after reveal', async () => {
  delay = 1100;
  const page = await context.newPage(); let loads = 0; page.on('load', () => loads++);
  const started = Date.now();
  await page.goto(ORIGIN);
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0, { timeout: 2800 });
  expect(Date.now() - started).toBeLessThan(2800);
  await expect.poll(() => worker.evaluate(async key => !!((await chrome.storage.local.get(key))[key] as { css?: string })?.css, profileKey(ORIGIN, 2019))).toBe(true);
  await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(240, 241, 250)');
  expect(loads).toBe(1);
  const calls = archiveRequests.length;
  await page.goto(`${ORIGIN}/next`);
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  expect(archiveRequests.length).toBe(calls);
});
test('Chromium decodes raw gzip archived CSS without a Content-Encoding header', async () => {
  gzipReplay = true;
  const page = await context.newPage(); await page.goto(ORIGIN);
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 240, 220)');
  expect(archiveRequests.length).toBe(4);
});

test('archive outage fails open and does not navigate or reload', async () => {
  unavailable = true;
  const page = await context.newPage(); let loads = 0; page.on('load', () => loads++);
  await page.goto(ORIGIN);
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');
  await expect(page.locator('body')).toHaveCSS('visibility', 'visible');
  expect(page.url()).toBe(`${ORIGIN}/`); expect(loads).toBe(1);
});

test('two concurrent same-site navigations share one archive job', async () => {
  delay = 150;
  const [one, two] = await Promise.all([context.newPage(), context.newPage()]);
  await Promise.all([one.goto(`${ORIGIN}/one`), two.goto(`${ORIGIN}/two`)]);
  await expect(one.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  await expect(two.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  expect(archiveRequests.length).toBe(3);
});

test('current-year selection skips archive discovery altogether', async () => {
  await worker.evaluate(async () => { await chrome.storage.local.set({ settings: { year: new Date().getFullYear() } }); });
  const page = await context.newPage(); await page.goto(ORIGIN);
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');
  expect(archiveRequests).toEqual([]);
});

test('inert stylesheet insertion works with strict page CSP and late navigation stays isolated', async () => {
  await seed(); const page = await context.newPage();
  await page.goto(`${ORIGIN}/strict-csp`);
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(248, 240, 220)');
  delay = 1200;
  await page.goto(SECOND);
  await page.goto(`${ORIGIN}/strict-csp`);
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  await expect.poll(() => worker.evaluate(async key => !!((await chrome.storage.local.get(key))[key] as { css?: string })?.css, profileKey(SECOND, 2019))).toBe(true);
  expect(page.url()).toBe(`${ORIGIN}/strict-csp`);
});

test('CSS gate expires independently if its JavaScript cleanup never happens', async () => {
  await seed(); const page = await context.newPage(); await page.goto(ORIGIN);
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0);
  await page.evaluate(() => { const gate = document.createElement('div'); gate.id = 'net19-loading-screen'; document.documentElement.append(gate); });
  await expect(page.locator('#net19-loading-screen')).toHaveCSS('visibility', 'visible');
  await expect(page.locator('#net19-loading-screen')).toHaveCSS('visibility', 'hidden', { timeout: 3200 });
  await expect(page.locator('#net19-loading-screen')).toHaveCSS('pointer-events', 'none');
});

test('settings can pause styling without reloading and clear local profiles', async ({}, info) => {
  await seed(); const site = await context.newPage(); await site.goto(ORIGIN);
  await expect(site.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  const page = await context.newPage(); await page.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(page.locator('#cache-count')).toHaveText('1');
  await page.screenshot({ path: resolve(info.outputDir, 'settings.png') });
  await page.getByLabel('Enable net19', { exact: true }).uncheck();
  await expect(site.locator('html')).not.toHaveAttribute('data-net19-styled');
  await expect.poll(() => worker.evaluate(async () => (await chrome.scripting.getRegisteredContentScripts()).length)).toBe(0);
  await page.getByRole('button', { name: 'Clear saved styles' }).click();
  await expect(page.locator('#cache-count')).toHaveText('0');
  await page.getByLabel('Destination year').selectOption('2007');
  await expect(page.locator('#notice')).toContainText('Saved');
});

test('popup is usable by keyboard and saves years without changing an open site', async ({}, info) => {
  await seed(); const site = await context.newPage(); await site.goto(ORIGIN);
  await expect(site.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  const page = await context.newPage(); await page.setViewportSize({ width: 388, height: 600 });
  const siteTab = await worker.evaluate(async origin => (await chrome.tabs.query({ url: `${origin}/*` }))[0], ORIGIN);
  // A toolbar popup is not normally a tab. Supply its real active-site tab lookup
  // when opening the exact same popup in a tab for headless UI/visual testing.
  await page.addInitScript(siteTab => {
    if (typeof chrome !== 'undefined' && chrome.tabs) Object.defineProperty(chrome.tabs, 'query', { value: async () => [siteTab] });
  }, siteTab);
  await page.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(page.locator('#destination')).toHaveText('2019');
  await expect(page.locator('#site-state')).toContainText('2019');
  expect(await page.evaluate(() => document.body.scrollHeight)).toBeLessThanOrEqual(600);
  await page.screenshot({ path: resolve(info.outputDir, 'popup.png') });
  await page.getByRole('button', { name: '2007', exact: true }).click();
  await expect(page.locator('#destination')).toHaveText('2007');
  await expect(page.locator('#notice')).toContainText('Year saved');
  await expect(site.locator('html')).toHaveAttribute('data-net19-styled', '2019');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
