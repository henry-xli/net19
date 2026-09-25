import assert from 'node:assert/strict';
import { test } from 'node:test';
import { gzipSync } from 'node:zlib';
import { isStylePack, settingsFrom, publicOrigin, parseReplay, validTimestamp, currentYear } from '../src/shared';
import { readDocument, sanitizeCSS, cssImports } from '../src/analyzer';
import { encodeSnapshot, decodeSnapshot, isSnapshot } from '../src/snapshot';
import { matchSnapshots } from '../src/matcher';
import { navigationRules, loadingTarget, originFilter } from '../src/navigation';
import { makePack, OLD_HTML, ORIGIN, SAMPLE } from './fixtures';

test('visited paths, queries and fragments never become archive targets', () => {
  assert.equal(publicOrigin('https://example.com/account/private?token=secret#fragment'),'https://example.com');
  for (const url of ['https://user:secret@example.com/','http://localhost/','http://localhost./','http://printer.home.arpa','http://127.0.0.1','http://2130706433','http://192.168.1.1','http://[::1]','http://printer.local','https://example.com:8443','file:///private/file','https://web.archive.org/web/2019/https://example.com']) assert.equal(publicOrigin(url),null,url);
});
test('legacy short waits migrate to automatic preparation and controls remain bounded', () => {
  assert.equal(settingsFrom(null).year,2019);
  assert.equal(settingsFrom({year:2000}).year,2007);
  assert.equal(settingsFrom({year:9999}).year,currentYear());
  for (const waitMs of [0,800,1800,2200,Infinity]) assert.equal(settingsFrom({waitMs}).waitMs,60_000);
  assert.equal(settingsFrom({waitMs:30000}).waitMs,30000);
  assert.equal(settingsFrom({waitMs:90000}).waitMs,60000);
});
test('only authentic replay origins and captures no newer than the selected year validate', () => {
  assert.equal(validTimestamp('20200101000000',2019),false);
  assert.equal(validTimestamp('20061231235959',2019),false);
  assert.equal(parseReplay('https://evil.example/web/20190912120000/https://example.com'),null);
  assert.equal(parseReplay('https://web.archive.org/web/20190912120000/https://127.0.0.1'),null);
  assert.equal(isStylePack(makePack()),true);
  assert.equal(isStylePack({...makePack(),snapshot:'<script>bad</script>'}),false);
});
test('inert archive HTML removes scripts, handlers, navigation and embedded network resources', () => {
  const source=OLD_HTML.replace('</body>','<script>throw 1</script><img src="https://evil.example/a" onerror="alert(1)"><iframe src="https://evil.example/"></iframe><meta http-equiv="refresh" content="0;url=https://evil.example"></body>');
  const document=readDocument(source,ORIGIN)!;
  assert.ok(document); assert.doesNotMatch(document.html,/<script|onerror|<iframe|http-equiv|src="https:/);
  assert.equal(readDocument('<title>Just a moment</title><body>Checking your browser security.</body>',ORIGIN),null);
  assert.equal(readDocument('<html><body></body></html>',ORIGIN),null);
});
test('CSS parsing preserves cascade, layout, variables, media queries and gradients but removes network/code', () => {
  const css=sanitizeCSS('@import "bad.css";@font-face{font-family:bad;src:url(https://evil.example/f)}:root{--paper:#fff}.box{display:flex;width:484px;border-radius:24px;background:linear-gradient(#4387fd,#4683ea);color:var(--ink,#222)}@media(min-width:800px){.box{width:600px}}.bad{background:url(https://evil.example/image);cursor:url(https://evil.example/c),auto;behavior:expression(alert(1))}');
  assert.match(css,/display:flex/);assert.match(css,/width:484px/);assert.match(css,/linear-gradient/);assert.match(css,/@media/);assert.match(css,/var\(/);
  assert.doesNotMatch(css,/@import|@font-face|url\(|expression|evil.example/);
  assert.doesNotMatch(sanitizeCSS('.x{background:u\\72l(https://evil.example/a)}'),/evil.example/);
  assert.deepEqual(cssImports('@import "base.css";@import "print.css" print;',`${ORIGIN}/css/main.css`),[
    {url:`${ORIGIN}/css/base.css`,media:''},{url:`${ORIGIN}/css/print.css`,media:'print'}]);
  assert.deepEqual(cssImports('@import "scoped.css" layer(example);',ORIGIN),[]);
});
test('computed snapshots round-trip with a strict decoded size and property boundary', async () => {
  assert.deepEqual(await decodeSnapshot(await encodeSnapshot(SAMPLE)),SAMPLE);
  const bad=structuredClone(SAMPLE);bad.styles[0]['background-image']='url(https://evil.example/a)';assert.equal(isSnapshot(bad),false);
  const forged=structuredClone(SAMPLE);forged.styles[0].color='red;display:none';assert.equal(isSnapshot(forged),false);
  await assert.rejects(decodeSnapshot(gzipSync(' '.repeat(1_100_000)).toString('base64')),/budget/);
});
test('matching uses semantic identities across renamed classes and changed live content', () => {
  const archived=structuredClone(SAMPLE),live=structuredClone(SAMPLE);
  archived.nodes.forEach((n,i)=>{n.descriptor.classes=[`old-${i}`];});
  live.nodes.forEach((n,i)=>{n.descriptor.classes=[`new-${i}`];});
  live.nodes[0].descriptor.label='Updated headline';
  const result=matchSnapshots(archived,live);
  assert.ok(result.coverage>.8);assert.ok(result.matches.some(m=>m.archived===0&&m.live===0));
  live.nodes.forEach(n=>{n.descriptor.label='unrelated';n.descriptor.name='unrelated';n.descriptor.href='unrelated';});
  assert.ok(matchSnapshots(archived,live).coverage<.68);
});
test('repeated URL paths do not confuse changing headlines with comment controls',()=>{
  const archived=structuredClone(SAMPLE),live=structuredClone(SAMPLE);
  for(const s of [archived,live])s.nodes=s.nodes.slice(0,4).map((n,i)=>({...n,descriptor:{...n.descriptor,kind:'link',tag:'a',name:'',href:'example.com/item',classes:[],children:[],ancestry:i%2?['metadata']:['headline']}}));
  archived.nodes.forEach((n,i)=>{n.descriptor.label=i%2?'24 comments':'Previous headline';});
  live.nodes.forEach((n,i)=>{n.descriptor.label=i%2?'150 comments':'New report';});
  const result=matchSnapshots(archived,live);
  assert.equal(result.matches.length,4);
  assert.ok(result.matches.every(m=>m.archived%2===m.live%2));
});
test('navigation rules prepare uncached GETs and scope cache bypass to the exact site', () => {
  const rules=navigationRules(settingsFrom({}),[ORIGIN],'chrome-extension://id/loading.html');
  assert.equal(rules[0].action.type,'redirect');assert.deepEqual(rules[0].condition.requestMethods,['get']);
  const filter=new RegExp(originFilter('https://example.com'));
  assert.ok(filter.test('https://www.example.com/path'));assert.ok(!filter.test('https://login.example.com/path'));assert.ok(!filter.test('https://example.com.evil.example/path'));
  assert.equal(navigationRules(settingsFrom({year:currentYear()}),[],'' ).length,0);
  assert.equal(loadingTarget('chrome-extension://id/loading.html#https://example.com/path?q=1#part','chrome-extension://id/loading.html'),'https://example.com/path?q=1#part');
  assert.equal(loadingTarget('chrome-extension://id/loading.html#javascript:alert(1)','chrome-extension://id/loading.html'),null);
});
