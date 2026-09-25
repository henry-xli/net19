import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { WaybackClient, cdxUrl, parseCaptures } from '../src/archive';
import { OLD_CSS, OLD_HTML, ORIGIN, TIMESTAMP, SAMPLE } from './fixtures';

const render = async (request: import('../src/render').RenderRequest) => request.sheets.some(s => s.includes('body')) ? SAMPLE : null;
const header = ['timestamp', 'original', 'statuscode', 'mimetype'];
function reply(text: string, url: string, type = 'text/html') {
  const response = new Response(text, { headers: { 'content-type': type } });
  Object.defineProperty(response, 'url', { value: url });
  return response;
}
// Legacy index tests: the replay probe has no capture, so selection falls to CDX/Availability.
const PROBE = /\/web\/\d{4}0701000000id_\//;
const noProbe = (mock: typeof fetch): typeof fetch => async (input, init) => PROBE.test(String(input)) ? new Response('', { status: 404 }) : mock(input, init);
const capture = (timestamp = TIMESTAMP) => JSON.stringify([header, [timestamp, `${ORIGIN}/`, '200', 'text/html']]);

test('CDX lookup is exact, bounded, and never includes visited paths', () => {
  const url = new URL(cdxUrl(`${ORIGIN}/`, 2019));
  assert.equal(url.searchParams.get('matchType'), 'exact');
  assert.equal(url.searchParams.get('to'), '20191231235959');
  assert.equal(url.searchParams.get('limit'), '-3');
  assert.equal(url.searchParams.get('fastLatest'), 'true');
  assert.equal(parseCaptures([header, ['20200101000000', ORIGIN, '200', 'text/html']], ORIGIN, 2019).length, 0);
  assert.equal(parseCaptures([header, [TIMESTAMP, 'https://other.example', '200', 'text/html']], ORIGIN, 2019).length, 0);
});
test('archive requests omit credentials and expose only public homepage targets', async () => {
  const requests: string[] = [];
  const mock: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(url);
    assert.equal(init?.credentials, 'omit'); assert.equal(init?.referrerPolicy, 'no-referrer');
    if (url.includes('/cdx/')) return reply(capture(), url, 'application/json');
    if (url.includes('/wayback/available')) return reply('{"archived_snapshots":{}}', url, 'application/json');
    return reply(OLD_HTML, url);
  };
  const pack = await new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019);
  assert.equal(pack.capturedAt, TIMESTAMP);
  assert.equal(requests.length, 3);
  assert.ok(requests.every(url => ['web.archive.org', 'archive.org'].includes(new URL(url).hostname)));
});
test('capture selection keeps the newest year candidate instead of the fastest index response', async () => {
  const mock: typeof fetch = async input => {
    const url=String(input);
    if(url.includes('/cdx/')){
      await new Promise(resolve=>setTimeout(resolve,15));
      return reply(capture('20191220120000'),url,'application/json');
    }
    if(url.includes('/wayback/available'))return reply(JSON.stringify({archived_snapshots:{closest:{available:true,status:'200',timestamp:TIMESTAMP,url:`https://web.archive.org/web/${TIMESTAMP}/${ORIGIN}/`}}}),url,'application/json');
    return reply(OLD_HTML,url);
  };
  assert.equal((await new WaybackClient(noProbe(mock),render).load(ORIGIN,2019)).capturedAt,'20191220120000');
});
test('stylesheets and one level of imports are archived resources with stable cascade order', async () => {
  const requests: string[] = [];
  const mock: typeof fetch = async input => {
    const url = String(input); requests.push(url);
    if (url.includes('/cdx/')) return reply(capture(), url, 'application/json');
    if (url.includes('/wayback/available')) return reply('{"archived_snapshots":{}}', url, 'application/json');
    if (url.endsWith('main.css')) return reply('@import "base.css"; body{background:#f8f0dc}', url, 'text/css');
    if (url.endsWith('base.css')) return reply('body{color:#252c22;font:16px Georgia,serif}', url, 'text/css');
    return reply(OLD_HTML.replace(`<style>${OLD_CSS}</style>`, '<link rel="stylesheet" href="/styles/main.css">'), url);
  };
  const pack = await new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019);
  assert.ok(pack.snapshot);
  assert.equal(requests.length, 5);
  assert.ok(requests.some(url => url.endsWith('/styles/base.css')));
  assert.ok(requests.every(url => ['web.archive.org', 'archive.org'].includes(new URL(url).hostname)));
});
test('inline imports and duplicate linked sheets preserve their separate cascade conditions', async () => {
  let baseRequests=0;
  const mock:typeof fetch=async input=>{
    const url=String(input);
    if(url.includes('/cdx/'))return reply(capture(),url,'application/json');
    if(url.includes('/wayback/available'))return reply('{"archived_snapshots":{}}',url,'application/json');
    if(url.endsWith('base.css')){baseRequests++;return reply('body{color:#222}',url,'text/css');}
    return reply(OLD_HTML.replace(`<style>${OLD_CSS}</style>`,'<style>@import "base.css" screen;</style><link rel="stylesheet" href="base.css" media="print"><link rel="stylesheet" href="base.css">'),url);
  };
  let measured:string[]=[];
  await new WaybackClient(noProbe(mock),async request=>{measured=request.sheets;return SAMPLE;}).load(ORIGIN,2019);
  assert.equal(baseRequests,1);
  assert.ok(measured[0].startsWith('@media screen{body'));
  assert.ok(measured.some(s=>s.startsWith('@media print{body')));
  assert.ok(measured.at(-1)?.startsWith('body'));
});
test('unusable target-year captures fall back to an older usable year', async () => {
  const mock: typeof fetch = async input => {
    const url = String(input);
    if (url.includes('/cdx/')) return reply(capture(url.includes('to=2018') ? '20180505120000' : TIMESTAMP), url, 'application/json');
    return reply(url.includes('/2018') ? OLD_HTML : '<html><head><title>Access denied</title></head><body>This archive cannot be displayed.</body></html>', url);
  };
  const pack = await new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019);
  assert.equal(pack.capturedAt, '20180505120000');
  assert.equal(pack.targetYear, 2019);
});
test('raw Wayback gzip styles without Content-Encoding are inflated before analysis', async () => {
  const mock: typeof fetch = async input => {
    const url = String(input);
    if (url.includes('/cdx/')) return reply(capture(), url, 'application/json');
    if (url.includes('/wayback/available')) return reply('{"archived_snapshots":{}}', url, 'application/json');
    if (url.endsWith('main.css')) {
      const response = new Response(new Uint8Array(gzipSync(OLD_CSS)), { headers: { 'content-type': 'text/css' } });
      Object.defineProperty(response, 'url', { value: url }); return response;
    }
    return reply(OLD_HTML.replace(`<style>${OLD_CSS}</style>`, '<link rel="stylesheet" href="/main.css">'), url);
  };
  const pack = await new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019);
  assert.ok(pack.snapshot);
});
test('compressed styles exceeding the expanded byte budget fail closed', async () => {
  const bomb = gzipSync(OLD_CSS + ' '.repeat(900_000));
  const mock: typeof fetch = async input => {
    const url = String(input);
    if (url.includes('/cdx/')) return reply(capture(), url, 'application/json');
    if (url.includes('/wayback/available')) return reply('{"archived_snapshots":{}}', url, 'application/json');
    if (url.endsWith('main.css')) {
      const response = new Response(new Uint8Array(bomb), { headers: { 'content-type': 'text/css' } });
      Object.defineProperty(response, 'url', { value: url }); return response;
    }
    return reply(OLD_HTML.replace(`<style>${OLD_CSS}</style>`, '<link rel="stylesheet" href="/main.css">'), url);
  };
  await assert.rejects(new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019), /No usable/);
});
test('Availability fallback rejects a capture newer than the requested year', async () => {
  const mock: typeof fetch = async input => {
    const url = String(input);
    return reply(url.includes('/cdx/') ? '[]' : JSON.stringify({ archived_snapshots: { closest: {
      available: true, status: '200', timestamp: '20200707120000', url: `https://web.archive.org/web/20200707120000/${ORIGIN}/`,
    } } }), url, 'application/json');
  };
  await assert.rejects(new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019), /No usable/);
});
test('Availability finds a historical HTTP site after migration to HTTPS', async () => {
  const mock: typeof fetch = async input => {
    const url = String(input);
    if (url.includes('/cdx/')) return reply('[]', url, 'application/json');
    if (url.includes('/wayback/available')) {
      assert.equal(new URL(url).searchParams.get('url'), `${new URL(ORIGIN).host}/`);
      return reply(JSON.stringify({ archived_snapshots: { closest: {
        available: true, status: '200', timestamp: TIMESTAMP,
        url: `http://web.archive.org/web/${TIMESTAMP}/http://${new URL(ORIGIN).host}/`,
      } } }), url, 'application/json');
    }
    return reply(OLD_HTML, url);
  };
  const pack = await new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019);
  assert.equal(pack.capturedAt, TIMESTAMP); assert.equal(pack.origin, ORIGIN);
});
test('redirects to the live web or a newer capture never become historical styles', async () => {
  for (const redirected of [`${ORIGIN}/`, `https://web.archive.org/web/20250101000000id_/${ORIGIN}/`]) {
    const mock: typeof fetch = async input => {
      const url = String(input);
      return url.includes('/cdx/') ? reply(capture(), url, 'application/json') : reply(OLD_HTML, redirected);
    };
    await assert.rejects(new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019));
  }
});
test('cancellation ends in-flight network work without waiting for a response', async () => {
  const controller = new AbortController(); let aborted = false;
  const mock: typeof fetch = (_input, init) => new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }, { once: true });
  });
  const job = new WaybackClient(noProbe(mock), render).load(ORIGIN, 2019, controller.signal);
  setTimeout(() => controller.abort(), 20);
  await assert.rejects(job);
  assert.equal(aborted, true);
});

test('the replay probe finds a capture when Availability is empty and CDX is slow, without downloading it twice', async () => {
  const requests: string[] = [];
  const mock: typeof fetch = async (input, init) => {
    const url = String(input); requests.push(url);
    if (url.includes('/cdx/')) return new Promise((_, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    if (url.includes('/wayback/available')) return reply('{"archived_snapshots":{}}', url, 'application/json');
    if (PROBE.test(url)) return reply(OLD_HTML, `https://web.archive.org/web/20190614101010id_/${ORIGIN}/`);
    return reply(OLD_HTML, url);
  };
  const pack = await new WaybackClient(mock, render, 6, 10, 20).load(ORIGIN, 2019);
  assert.equal(pack.capturedAt, '20190614101010');
  assert.equal(requests.filter(url => url.includes('/web/')).length, 1);
});
test('stylesheets resolved to the following year are accepted; transient 503s are retried once', async () => {
  let attempts = 0;
  const mock: typeof fetch = async input => {
    const url = String(input);
    if (url.includes('/cdx/')) return reply(capture(), url, 'application/json');
    if (url.includes('/wayback/available')) return reply('{"archived_snapshots":{}}', url, 'application/json');
    if (url.endsWith('main.css')) {
      if (++attempts === 1) return new Response('', { status: 503 });
      return reply('body{background:#f8f0dc}', url.replace(/\/web\/\d{14}/, '/web/20200105000000'), 'text/css');
    }
    return reply(OLD_HTML.replace(`<style>${OLD_CSS}</style>`, '<link rel="stylesheet" href="/styles/main.css">'), url);
  };
  const pack = await new WaybackClient(noProbe(mock), render, 6, 5).load(ORIGIN, 2019);
  assert.equal(pack.capturedAt, TIMESTAMP);
  assert.equal(attempts, 2);
});
