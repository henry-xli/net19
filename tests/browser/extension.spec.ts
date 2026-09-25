import { chromium, expect, test, type BrowserContext, type Page, type Worker } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { profileKey } from '../../src/shared';
import sharp from 'sharp';

const ORIGIN='https://net19-fixture.example', SECOND='https://other-fixture.example';
const OLD=`<!doctype html><html><head><title>Example Search</title><style>
body{margin:0;color:#222;background:#fff;font:14px Arial}header{height:60px;padding:20px 24px;box-sizing:border-box}a{color:#23445d;margin-right:20px}
main{width:484px;margin:100px auto}h1{text-align:center;font-size:36px;margin-bottom:40px}.search-box{width:484px;height:46px;border:1px solid #ccc;border-radius:24px;box-sizing:border-box;padding:5px 14px}input[name=q]{box-sizing:border-box;width:450px;height:34px;border:0;background:transparent;color:#222;font:16px Arial}.buttons{text-align:center;margin-top:28px}button{height:36px;padding:0 16px;background:#f2f2f2;color:#333;border:1px solid #eee;border-radius:4px;font:14px Arial}footer{position:absolute;bottom:0;left:0;right:0;height:40px;background:#eee;padding:12px 24px;box-sizing:border-box}
</style></head><body><header><a href="/about">About</a><a href="/docs">Docs</a></header><main><h1>Example Search</h1><form action="/search" method="get"><div class="search-box"><input name="q" aria-label="Search"></div><div class="buttons"><button name="search" type="submit">Search</button></div></form><p id="answer" role="status"></p></main><footer><a href="/privacy">Privacy</a></footer></body></html>`;
const LIVE=OLD.replace('width:484px;margin:100px auto','width:740px;margin:180px auto').replace('background:#fff','background:#242630').replace('color:#222','color:#eee')
  .replace('<main>','<div class="modern-wrap"><main>').replace('</main>','</main></div>')
  .replace('<input name="q" aria-label="Search">','<textarea name="q" aria-label="Search"></textarea>')
  .replace('</body>','<script>document.querySelector("form").addEventListener("submit",e=>{e.preventDefault();document.getElementById("answer").textContent="Result: "+document.querySelector("[name=q]").value})</script></body>');

let context: BrowserContext, worker: Worker, extensionId: string;
let delay: number, unavailable: boolean, incompatible: boolean, archiveRequests: string[], siteRequests: Array<{url:string;at:number}>, archiveFinished: number;
let active: boolean;
let archivedHTML: string, liveHTML: string;

test.beforeEach(async ({},info)=>{
  await mkdir(info.outputDir,{recursive:true});delay=0;unavailable=false;incompatible=false;archiveRequests=[];siteRequests=[];archiveFinished=0;active=true;archivedHTML=OLD;liveHTML=LIVE;
  const extension=resolve('dist/extension');
  context=await chromium.launchPersistentContext(resolve(info.outputDir,'profile'),{channel:'chromium',headless:true,viewport:{width:1280,height:800},
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  await context.route('https://**/*',async route=>{
    const url=route.request().url();
    if ([ORIGIN,SECOND].some(origin=>url.startsWith(origin))) {
      siteRequests.push({url,at:Date.now()});
      await route.fulfill({contentType:'text/html',body:incompatible?'<title>Unrelated app</title><body><h1>Another interface</h1><p>These controls have no archive correspondence.</p></body>':liveHTML,
        headers:url.includes('strict-csp')?{'Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; script-src 'none'"}:{}});return;
    }
    if (['archive.org','web.archive.org'].includes(new URL(url).hostname)) {
      archiveRequests.push(url);if(delay)await new Promise(r=>setTimeout(r,delay));if(!active)return;
      if(unavailable){await route.fulfill({status:503,body:'Unavailable'});return;}
      const target=url.includes(SECOND.replace('https://',''))?SECOND:ORIGIN;
      const year=new URL(url).searchParams.get('to')?.slice(0,4)||'2019';
      if(url.includes('/cdx/'))await route.fulfill({contentType:'application/json',body:JSON.stringify([['timestamp','original','statuscode','mimetype'],[`${year}0912120000`,`${target}/`,'200','text/html']])});
      else if(url.includes('/wayback/available'))await route.fulfill({contentType:'application/json',body:'{"archived_snapshots":{}}'});
      else {archiveFinished=Date.now();await route.fulfill({contentType:'text/html',body:archivedHTML});}return;
    }
    await route.abort();
  });
  worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');extensionId=new URL(worker.url()).host;
  await expect.poll(()=>worker.evaluate(async()=>globalThis.chrome?.scripting?(await chrome.scripting.getRegisteredContentScripts()).length:-1)).toBe(1);
});
test.afterEach(async()=>{active=false;await context.close();});

async function navigate(page:Page,url=ORIGIN):Promise<void>{await page.goto(url,{waitUntil:'commit'});await page.waitForURL(u=>u.origin===new URL(url).origin);await expect(page.locator('#net19-loading-screen')).toHaveCount(0,{timeout:12000});}
async function warm(origin=ORIGIN):Promise<void>{const page=await context.newPage();await navigate(page,origin);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');await page.close();archiveRequests=[];siteRequests=[];}
async function config(patch:object):Promise<void>{const ui=await context.newPage();await ui.goto(`chrome-extension://${extensionId}/options.html`);await ui.evaluate(patch=>chrome.runtime.sendMessage({type:'SETTINGS',patch}),patch);await ui.close();}
async function pageStatus(origin=ORIGIN):Promise<any>{return worker.evaluate(async origin=>{const tab=(await chrome.tabs.query({url:`${origin}/*`}))[0];return chrome.tabs.sendMessage(tab.id!,{type:'PAGE_STATUS'});},origin);}

test('uncached sites are prepared automatically before the destination receives a request',async()=>{
  delay=300;const page=await context.newPage();await page.goto(`${ORIGIN}/private?fixture=1#part`,{waitUntil:'commit'});
  expect(page.url()).toContain('loading.html#');expect(siteRequests).toHaveLength(0);
  await page.waitForURL(`${ORIGIN}/private?fixture=1#part`);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  expect(siteRequests).toHaveLength(1);expect(siteRequests[0].at).toBeGreaterThanOrEqual(archiveFinished);
  expect(archiveRequests.every(url=>!url.includes('private')&&!url.includes('fixture=1')&&!url.includes('#part'))).toBe(true);
  expect((await pageStatus()).mode).toBe('layout');
});

test('general layout matching preserves live search behavior across different element types and wrappers',async()=>{
  liveHTML=LIVE.replace('>Search</button>','><span><b>Search</b></span></button>');
  const page=await context.newPage();await navigate(page);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  await expect(page.locator('.search-box')).toHaveCSS('width','484px');await expect(page.locator('.search-box')).toHaveCSS('border-radius','24px');
  await expect(page.locator('body')).toHaveCSS('background-color','rgb(255, 255, 255)');
  await page.getByRole('textbox',{name:'Search',exact:true}).fill('current content');await page.getByRole('button',{name:'Search',exact:true}).click();
  await expect(page.locator('#answer')).toHaveText('Result: current content');expect(siteRequests).toHaveLength(1);
});

test('external cascade, print conditions and raster sprite cropping survive the general parser',async()=>{
  archivedHTML=OLD.replace('</head>','<link rel="stylesheet" href="/assets/main.css"><link rel="stylesheet" href="/assets/print.css" media="print"></head>')
    .replace('<h1>','<span class="old-symbol" role="img" aria-label="Symbol"></span><h1>');
  liveHTML=LIVE.replace('<h1>','<svg aria-label="Symbol" width="12" height="12"><rect width="12" height="12" fill="green"/></svg><h1>');
  const sprite=await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><path d="M0 0h12v12H0z" fill="red"/><path d="M12 0h12v12H12z" fill="blue"/></svg>')).png().toBuffer();
  await context.route('https://web.archive.org/web/**/assets/*',async route=>{
    const url=route.request().url();
    archiveRequests.push(url);
    if(url.endsWith('sprite.png'))await route.fulfill({contentType:'image/png',body:sprite});
    else await route.fulfill({contentType:'text/css',body:url.endsWith('print.css')?'.search-box{width:80px}body{color:red}':
      '@import "print.css" print; .old-symbol{display:block;width:12px;height:12px;background:url(sprite.png) -12px 0 no-repeat}'});
  });
  const page=await context.newPage();await navigate(page);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  await expect(page.locator('.search-box')).toHaveCSS('width','484px');
  await expect(page.locator('canvas[aria-label="symbol"]')).toBeVisible();
  const pixel=await page.locator('canvas[aria-label="symbol"]').evaluate((canvas:HTMLCanvasElement)=>Array.from(canvas.getContext('2d')!.getImageData(10,10,1,1).data));
  expect(pixel).toEqual([0,0,255,255]);
});

test('long pages recover archived grid proportions while preserving current article text and flow',async()=>{
  const articles=Array.from({length:35},(_,i)=>`<article class="story"><h2><a class="headline" href="/story/${i}">Article ${i}</a></h2><p class="summary">An archived paragraph with several lines of information.</p></article>`).join('');
  archivedHTML=`<!doctype html><title>Example Journal</title><style>body{margin:0;background:white;color:#222;font:16px Georgia}nav{padding:20px}main{display:grid;grid-template-columns:1fr 1fr;gap:24px;max-width:960px;margin:30px auto}article{padding:20px;border:1px solid #ccc}a{color:#243e6b}</style><nav><a href="/about">About</a></nav><main>${articles}</main>`;
  liveHTML=archivedHTML.replace('1fr 1fr','1fr 1fr 1fr').replace('max-width:960px','max-width:1200px').replace('background:white;color:#222','background:#222;color:white').replaceAll('An archived paragraph with several lines of information.','Current reporting with newly updated text.');
  const page=await context.newPage();await navigate(page);const status=await pageStatus();expect(status,JSON.stringify(status)).toMatchObject({state:'archived'});await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  await expect(page.locator('main')).toHaveCSS('max-width','960px');
  expect((await page.locator('main').evaluate(e=>getComputedStyle(e).gridTemplateColumns)).split(' ')).toHaveLength(2);
  await expect(page.locator('.summary').first()).toHaveText('Current reporting with newly updated text.');
  expect(await page.locator('.story').last().evaluate(e=>e.getBoundingClientRect().height)).toBeGreaterThan(50);
  expect((await pageStatus()).mode).toBe('styles');
});

test('cached first visible frames are already styled with no archive requests or loading redirect',async()=>{
  await warm();await context.addInitScript(()=>{
    const samples:Array<{covered:boolean;styled:boolean}>=[];(window as any).__net19Frames=samples;
    function sample(){if(document.body?.querySelector('main')){const gate=document.getElementById('net19-loading-screen');samples.push({covered:!!gate&&getComputedStyle(gate).visibility==='visible',styled:document.documentElement.hasAttribute('data-net19-styled')});}if(samples.length<30)requestAnimationFrame(sample);}requestAnimationFrame(sample);
  });
  const page=await context.newPage();const destinations:string[]=[];page.on('framenavigated',frame=>{if(frame===page.mainFrame())destinations.push(frame.url());});
  await navigate(page);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  const samples=await page.evaluate(()=>(window as any).__net19Frames as Array<{covered:boolean;styled:boolean}>);
  expect(samples.filter(s=>!s.covered&&!s.styled)).toHaveLength(0);expect(archiveRequests).toHaveLength(0);expect(destinations).toHaveLength(1);
  expect((await pageStatus()).elapsedMs).toBeLessThan(750);
});

test('a second previously unvisited website needs no enable or prepare action',async()=>{
  const page=await context.newPage();await navigate(page,SECOND);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  expect(archiveRequests.length).toBeGreaterThan(0);expect(siteRequests).toHaveLength(1);
});

test('archive outage opens the current site once without restarting preparation',async()=>{
  unavailable=true;const page=await context.newPage();await navigate(page);await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');
  const count=archiveRequests.length;await page.waitForTimeout(150);expect(archiveRequests).toHaveLength(count);expect(siteRequests).toHaveLength(1);expect((await pageStatus()).state).toBe('current');
});

test('unrelated live structures receive only the role theme, with no structural mutations',async()=>{
  incompatible=true;const page=await context.newPage();await navigate(page);
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  // No element-level reconstruction: nothing hidden, re-parented, repositioned or drawn.
  await expect(page.locator('[data-net19-node],[data-net19-contents],[data-net19-extra],canvas')).toHaveCount(0);
  expect(await page.locator('[data-net19-role]').count()).toBeGreaterThan(0);
  expect((await pageStatus()).mode).toBe('theme');
  // Every themed text element stays readable.
  expect(await page.evaluate(()=>[...document.querySelectorAll('[data-net19-role]')].every(e=>getComputedStyle(e).visibility!=='hidden'))).toBe(true);
});

test('continuing during preparation never repaints the current visit when a late archive completes',async()=>{
  delay=700;const page=await context.newPage();await page.goto(ORIGIN,{waitUntil:'commit'});
  await page.getByRole('button',{name:'Continue with current styling'}).click();await page.waitForURL(`${ORIGIN}/`);
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0);await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');
  await expect.poll(()=>worker.evaluate(async key=>!!(await chrome.storage.local.get(key))[key],profileKey(ORIGIN,2019)),{timeout:8000}).toBe(true);
  await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');expect(siteRequests).toHaveLength(1);
});

test('same-origin simultaneous navigation shares archive work',async()=>{
  delay=150;const a=await context.newPage(),b=await context.newPage();await Promise.all([navigate(a),navigate(b)]);
  await expect(a.locator('html')).toHaveAttribute('data-net19-styled','2019');await expect(b.locator('html')).toHaveAttribute('data-net19-styled','2019');
  expect(archiveRequests.filter(url=>url.includes('/cdx/'))).toHaveLength(1);expect(siteRequests).toHaveLength(2);
});

test('year changes purge other years and cancel stale in-flight writes',async()=>{
  await warm();delay=350;const pending=await context.newPage();await pending.goto(SECOND,{waitUntil:'commit'});
  await config({year:2012});
  await expect.poll(()=>worker.evaluate(async()=>Object.keys(await chrome.storage.local.get(null)).filter(k=>k.startsWith('profile:')&&!k.startsWith('profile:2:2012:')).length)).toBe(0);
  await pending.waitForTimeout(1000);
  expect(await worker.evaluate(async()=>Object.keys(await chrome.storage.local.get(null)).filter(k=>k.startsWith('profile:')&&!k.startsWith('profile:2:2012:')))).toEqual([]);
});

test('current-year mode bypasses archive preparation completely',async()=>{
  await config({year:new Date().getFullYear()});const page=await context.newPage();await navigate(page);expect(archiveRequests).toHaveLength(0);expect(siteRequests).toHaveLength(1);await expect(page.locator('html')).not.toHaveAttribute('data-net19-styled');
});

test('strict page CSP still permits document-specific styling',async()=>{
  const page=await context.newPage();await navigate(page,`${ORIGIN}/strict-csp`);await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019');
  await expect(page.locator('.search-box')).toHaveCSS('width','484px');
});

test('the document cover has an independent finite expiry',async()=>{
  await warm();const page=await context.newPage();await navigate(page);
  await page.evaluate(()=>{const gate=document.createElement('div');gate.id='net19-loading-screen';document.documentElement.append(gate);});
  await expect(page.locator('#net19-loading-screen')).toHaveCSS('visibility','visible');
  await page.evaluate(()=>{const animation=document.getElementById('net19-loading-screen')!.getAnimations()[0];animation.currentTime=66000;});
  await expect(page.locator('#net19-loading-screen')).toHaveCSS('visibility','hidden');await expect(page.locator('#net19-loading-screen')).toHaveCSS('pointer-events','none');
});

test('settings pause restores the original page and cache clearing removes navigation bypasses',async({},info)=>{
  await warm();const site=await context.newPage();await navigate(site);const ui=await context.newPage();await ui.goto(`chrome-extension://${extensionId}/options.html`);
  await expect(ui.locator('#cache-count')).toHaveText('1');await ui.screenshot({path:resolve(info.outputDir,'settings.png')});
  await ui.getByLabel('Enable net19',{exact:true}).uncheck();await expect(site.locator('html')).not.toHaveAttribute('data-net19-styled');
  await expect(site.locator('[data-net19-node],[data-net19-contents],[data-net19-extra]')).toHaveCount(0);
  await expect.poll(()=>worker.evaluate(async()=>(await chrome.declarativeNetRequest.getDynamicRules()).length)).toBe(0);
  await ui.getByRole('button',{name:'Clear saved styles'}).click();await expect(ui.locator('#cache-count')).toHaveText('0');
});

test('popup contains direct controls, no preparation button or slogans, and clears other years',async({},info)=>{
  await warm();const site=await context.newPage();await navigate(site);
  const tabId=await worker.evaluate(async origin=>(await chrome.tabs.query({url:`${origin}/*`}))[0].id!,ORIGIN);
  const popup=await context.newPage();await popup.addInitScript(({tabId,origin})=>{const api=(globalThis as any).chrome;if(api?.tabs)api.tabs.query=async()=>[{id:tabId,url:origin,incognito:false}];},{tabId,origin:ORIGIN});
  await popup.setViewportSize({width:388,height:600});await popup.goto(`chrome-extension://${extensionId}/popup.html`);
  await expect(popup.locator('#destination')).toHaveText('2019');await expect(popup.getByRole('button',{name:/prepare/i})).toHaveCount(0);
  expect(await popup.locator('body').innerText()).not.toMatch(/THE WEB\. YOUR YEAR|familiar feeling|NO RELOADS|A little of/);
  await popup.screenshot({path:resolve(info.outputDir,'popup.png')});
  await popup.getByRole('button',{name:'Previous year'}).click();await expect(popup.locator('#destination')).toHaveText('2018');await expect(popup.locator('#cache-count')).toHaveText('0');
  expect(await popup.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(600);
});
