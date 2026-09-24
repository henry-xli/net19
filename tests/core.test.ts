import assert from 'node:assert/strict';
import { test } from 'node:test';
import { isStylePack, settingsFrom, publicOrigin, parseReplay, validTimestamp, currentYear } from '../src/shared';
import { analyze, readDocument, safeValue, cssImports } from '../src/analyzer';
import { makePack, OLD_CSS, OLD_HTML, ORIGIN, TIMESTAMP } from './fixtures';

test('visited paths, queries, fragments and credentials never become archive targets', () => {
  assert.equal(publicOrigin('https://example.com/account/private?token=secret#fragment'), 'https://example.com');
  for (const url of ['https://user:secret@example.com/', 'http://localhost/', 'http://localhost./', 'http://printer.home.arpa', 'http://127.0.0.1', 'http://2130706433', 'http://192.168.1.1', 'http://[::1]', 'http://printer.local', 'https://example.com:8443', 'file:///private/file', 'https://web.archive.org/web/2019/https://example.com']) assert.equal(publicOrigin(url), null, url);
});
test('year and wait controls clamp malformed and out-of-range input', () => {
  assert.equal(settingsFrom(null).year, 2019);
  assert.equal(settingsFrom({ year: 2000 }).year, 2007);
  assert.equal(settingsFrom({ year: 9999 }).year, currentYear());
  assert.equal(settingsFrom({ waitMs: Infinity }).waitMs, 1800);
  assert.equal(settingsFrom({ waitMs: 50_000 }).waitMs, 2200);
});
test('only valid archive origins and captures no newer than the selected year are usable', () => {
  assert.equal(validTimestamp('20200101000000', 2019), false);
  assert.equal(validTimestamp('20061231235959', 2019), false);
  assert.equal(parseReplay('https://evil.example/web/20190912120000/https://example.com'), null);
  assert.equal(parseReplay('https://web.archive.org/web/20190912120000/https://127.0.0.1'), null);
  assert.equal(isStylePack(makePack()), true);
  assert.equal(isStylePack({ ...makePack(), css: 'body{background:url(https://evil.example)}' }), false);
});
test('HTML analysis never executes scripts and rejects challenge or empty captures', () => {
  const doc = readDocument(OLD_HTML.replace('</body>', '<script>throw new Error("must not execute")</script><iframe src="https://evil.example"></iframe></body>'), ORIGIN);
  assert.ok(doc);
  assert.equal(readDocument('<html><head><title>Just a moment...</title></head><body>Checking your browser security.</body></html>', ORIGIN), null);
  assert.equal(readDocument('<html><body></body></html>', ORIGIN), null);
});
test('archive styles become local color/typography rules with no layout, network, or script', () => {
  const pack = makePack();
  assert.match(pack.css, /Georgia/);
  assert.match(pack.css, /#f8f0dc/);
  assert.doesNotMatch(pack.css, /url\(|@import|(?:[;{])(?:position|display|content|width|height):/);
  assert.ok(pack.css.split('\n').slice(1).every(line => line.startsWith('html[data-net19-styled]')));
});
test('unsafe CSS values, URLs, encoded functions, tiny text and webfonts are excluded', () => {
  for (const value of ['url(https://evil.example)', 'u\\72l(https://evil.example)', 'expression(alert(1))', 'var(--unknown)', 'red;display:none', 'attr(data-secret)', 'image-set("https://evil.example")']) assert.equal(safeValue('background-color', value), null, value);
  assert.equal(safeValue('font-size', '1px'), null);
  assert.equal(safeValue('font-size', '200px'), null);
  assert.equal(safeValue('font-family', 'UnknownWebFont'), null);
});
test('conditional CSS and imports do not overwrite the base style', () => {
  const doc = readDocument(OLD_HTML, ORIGIN)!;
  const pack = analyze(doc, [OLD_CSS + '@media print{body{color:red;background:black}}@keyframes bad{to{display:none}}'], {
    origin: ORIGIN, targetYear: 2019, capturedAt: TIMESTAMP, snapshotUrl: makePack().snapshotUrl,
  });
  assert.ok(pack);
  assert.match(pack.css, /#f8f0dc/);
  assert.doesNotMatch(pack.css, /red|display:none/);
  assert.deepEqual(cssImports('@import "base.css"; @import "print.css" print;', `${ORIGIN}/css/main.css`), [`${ORIGIN}/css/base.css`]);
});
test('low-contrast or unrecognizable snapshots fall back without inventing a theme', () => {
  const doc = readDocument(OLD_HTML, ORIGIN)!;
  const meta = { origin: ORIGIN, targetYear: 2019, capturedAt: TIMESTAMP, snapshotUrl: makePack().snapshotUrl };
  assert.equal(analyze(doc, ['body{color:#eee;background:#fff;font-family:Arial}'], meta), null);
  assert.equal(analyze(doc, ['.mystery{margin:5px}'], meta), null);
});
test('CSS variables and font shorthand from archived styles are resolved locally', () => {
  const doc = readDocument(OLD_HTML, ORIGIN)!;
  const pack = analyze(doc, [':root{--ink:#222;--paper:#fff}body{color:var(--ink);background:var(--paper);font:16px/1.5 Georgia,serif}'], {
    origin: ORIGIN, targetYear: 2019, capturedAt: TIMESTAMP, snapshotUrl: makePack().snapshotUrl,
  });
  assert.ok(pack); assert.match(pack.css, /#222/); assert.doesNotMatch(pack.css, /var\(/);
});
