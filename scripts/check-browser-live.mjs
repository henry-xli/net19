import {chromium,expect} from '@playwright/test';
import {mkdtemp,mkdir,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';

// Explicit live archive/site check in an isolated browser. No fixture responses,
// seeded profiles, user cookies, or personal browser profile are used.
const origin=new URL(process.argv[2]??'https://www.google.com').origin;
const name=new URL(origin).hostname.replace(/^www\./,'').replace(/[^a-z0-9-]/gi,'-');
const temporary=await mkdtemp(join(tmpdir(),'net19-live-'));
const extension=resolve('dist/extension');
let context,result;
try {
  context=await chromium.launchPersistentContext(join(temporary,'profile'),{channel:'chromium',headless:true,viewport:{width:1280,height:800},colorScheme:'dark',
    args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  const worker=context.serviceWorkers()[0]??await context.waitForEvent('serviceworker');
  await expect.poll(()=>worker.evaluate(async()=>(await chrome.declarativeNetRequest.getDynamicRules()).length)).toBeGreaterThan(0);
  let archiveRequests=0;const archiveURLs=[];context.on('request',request=>{if(/^https:\/\/(?:web\.)?archive\.org\//.test(request.url())){archiveRequests++;archiveURLs.push(request.url());}});
  const page=await context.newPage();
  const start=Date.now();
  await page.goto(origin,{waitUntil:'commit',timeout:20000});
  const initialWasPreflight=page.url().startsWith('chrome-extension:');
  await page.waitForURL(url=>['http:','https:'].includes(url.protocol)&&url.hostname.replace(/^www\./,'')===new URL(origin).hostname.replace(/^www\./,''),{timeout:65000,waitUntil:'domcontentloaded'});
  await expect(page.locator('#net19-loading-screen')).toHaveCount(0,{timeout:15000});
  const status=()=>worker.evaluate(async origin=>{
    const tabs=await chrome.tabs.query({});const tab=tabs.find(t=>t.url?.startsWith(origin));
    return tab?.id===undefined?null:chrome.tabs.sendMessage(tab.id,{type:'PAGE_STATUS'});
  },new URL(page.url()).origin);
  let first=await status();
  await expect.poll(async()=>{first=await status();return first?.state;},{timeout:15000}).not.toBe('waiting');
  const acquiredMs=Date.now()-start;
  const pack=await worker.evaluate(async()=>Object.values(await chrome.storage.local.get(null)).find(p=>p?.source==='wayback'&&p?.targetYear===2019));
  if(pack)await writeFile(`artifacts/live-${name}-measured.json`,gunzipSync(Buffer.from(pack.snapshot,'base64')));
  await writeFile(`artifacts/live-${name}-page.html`,await page.content());
  if(first?.state!=='archived'){await page.screenshot({path:resolve(`artifacts/live-${name}-fallback.png`)});throw new Error(`First visit stayed current: ${first?.reason??'unknown'}; capture ${pack?.capturedAt??'unavailable'}, ${pack?.ruleCount??0} measured nodes`);}
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:resolve(`artifacts/live-${name}-2019.png`)});
  const before=archiveRequests;const navigations=[];page.on('framenavigated',frame=>{if(frame===page.mainFrame())navigations.push(frame.url());});
  await page.goto(origin,{waitUntil:'domcontentloaded',timeout:20000});
  await expect(page.locator('html')).toHaveAttribute('data-net19-styled','2019',{timeout:15000});
  const cached=await status();
  if(archiveRequests!==before||navigations.some(url=>url.startsWith('chrome-extension:')))throw new Error(`Cached visit repeated preparation: ${JSON.stringify({navigations,archiveRequests:archiveURLs.slice(before),cached})}`);
  result={checkedAt:new Date().toISOString(),origin,browser:context.browser()?.version(),status:'live-archive-and-layout-passed',initialWasPreflight,
    capturedAt:pack?.capturedAt,acquiredMs,firstPage:first,cachedPage:cached,archiveRequestsDuringCachedVisit:archiveRequests-before};
} catch(error) {
  result={checkedAt:new Date().toISOString(),origin,status:'live-check-failed',reason:error.message.slice(0,450)};process.exitCode=1;
} finally {
  try { const w=context?.serviceWorkers()[0];const p=w&&await w.evaluate(async()=>Object.values(await chrome.storage.local.get(null)).find(p=>p?.source==='wayback'));if(p){await writeFile(`artifacts/live-${name}-measured.json`,gunzipSync(Buffer.from(p.snapshot,'base64')));result.capture={capturedAt:p.capturedAt,nodes:p.ruleCount,url:p.snapshotUrl};} } catch {}
  await context?.close();await rm(temporary,{recursive:true,force:true});await mkdir('artifacts',{recursive:true});
  await writeFile(`artifacts/live-${name}-check.json`,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
}
