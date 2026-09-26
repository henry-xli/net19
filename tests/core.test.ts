import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { settingsFrom } from '../src/shared';
import { navigationRules } from '../src/navigation';
import { THEMES, THEMED_DOMAINS, themeFor, themeMatches, themePaused } from '../src/themes';

// RE2 and JavaScript agree on the constructs these patterns use.
const rule = (id: string) => THEMES.find(theme => theme.id === id)!;
const legacy = (url: string) => {
  const { pattern, substitution, except } = rule('reddit').legacy!;
  if (except && new RegExp(except).test(url)) return null;
  const match = url.match(new RegExp(pattern));
  return match ? substitution.replace('\\1', match[1]) : null;
};

test('settings keep only the two switches', () => {
  assert.deepEqual(settingsFrom(null), { enabled: true, disabledHosts: [] });
  assert.deepEqual(settingsFrom({ enabled: false, year: 2012, waitMs: 3000, disabledHosts: ['www.youtube.com', 'bad host', 7] }), { enabled: false, disabledHosts: ['www.youtube.com'] });
});

test('net19 only touches the sites it has a theme for', () => {
  const manifest = JSON.parse(readFileSync('static/manifest.json', 'utf8'));
  assert.deepEqual(manifest.host_permissions, THEMED_DOMAINS.map(domain => `*://*.${domain}/*`));
  assert.ok(!manifest.web_accessible_resources && !manifest.permissions.includes('offscreen') && !manifest.permissions.includes('webNavigation'));
  assert.match(manifest.content_security_policy.extension_pages, /connect-src 'none'/);
  for (const theme of THEMES) {
    assert.ok(existsSync(`static/themes/${theme.id}.css`) && existsSync(`static/themes/${theme.id}.js`), theme.id);
    for (const pattern of themeMatches(theme)) assert.ok(theme.domains.some(domain => pattern.includes(domain)), pattern);
  }
  assert.equal(themeFor('www.youtube.com')?.id, 'youtube');
  assert.equal(themeFor('m.youtube.com')?.id, 'youtube');
  assert.equal(themeFor('notyoutube.com'), undefined);
  assert.equal(themeFor('example.com'), undefined);
});

test('the per-site switch pauses the whole site, whichever host it was set on', () => {
  assert.ok(themePaused(rule('reddit'), ['reddit.com']));
  assert.ok(themePaused(rule('shreddit'), ['www.reddit.com']));
  assert.ok(themePaused(rule('reddit'), ['old.reddit.com']));
  assert.ok(!themePaused(rule('reddit'), ['notreddit.com', 'youtube.com']));
  const rules = navigationRules(settingsFrom({ disabledHosts: ['reddit.com'] }), () => true);
  assert.ok(!rules.some(r => r.action.redirect?.regexSubstitution));
});

test('Wikipedia gets its legacy skin by URL parameter, once', () => {
  const { pattern } = rule('wikipedia').query!;
  assert.ok(new RegExp(pattern).test('https://en.wikipedia.org/wiki/Cat'));
  assert.ok(!new RegExp(pattern).test('https://en.wikipedia.org/wiki/Cat?useskin=vector'));
});

test('signed-in Reddit opens on old.reddit.com; signed out it stays put', () => {
  assert.equal(legacy('https://www.reddit.com/'), 'https://old.reddit.com/');
  assert.equal(legacy('https://reddit.com/r/pics/'), 'https://old.reddit.com/r/pics/');
  assert.equal(legacy('https://www.reddit.com/r/pics/comments/abc/title/?sort=top'), 'https://old.reddit.com/r/pics/comments/abc/title/?sort=top');
  assert.equal(legacy('https://www.reddit.com/?feed=home'), 'https://old.reddit.com/?feed=home');
  assert.equal(legacy('https://www.reddit.com/user/someone'), 'https://old.reddit.com/user/someone');
  for (const url of ['https://www.reddit.com/settings/', 'https://www.reddit.com/media?url=x', 'https://www.reddit.com/r/pics/s/AbCd',
    'https://www.reddit.com/rules', 'https://old.reddit.com/', 'https://www.reddit.com.evil.example/', 'https://notreddit.com/']) assert.equal(legacy(url), null, url);
  const redirects = (signedIn: boolean) => navigationRules(settingsFrom({}), () => signedIn).filter(r => r.action.redirect?.regexSubstitution);
  assert.equal(redirects(true).length, 1);
  assert.equal(redirects(false).length, 0);
  assert.equal(navigationRules(settingsFrom({ enabled: false }), () => true).length, 0);
  const ids = navigationRules(settingsFrom({}), () => true).map(r => r.id);
  assert.equal(new Set(ids).size, ids.length);
});

test('theme stylesheets follow the styling-rule contract', () => {
  for (const file of readdirSync('static/themes').filter(name => name.endsWith('.css'))) {
    const css = readFileSync(`static/themes/${file}`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    // Text is never swapped with generated content: label nesting differs between accounts and layouts.
    assert.ok(!/content:\s*["'][^"']+["']/.test(css), `${file}: generated text`);
    // Layout values a site computes in script (grid columns) are not overridden.
    assert.ok(!/--ytd-rich-grid-items-per-row/.test(css), `${file}: script-computed layout variable`);
    // The page background is set through the site's own variables or theme tokens, never by painting html/body
    // outright, which also paints transparent overlays and hides the site's mode from detection.
    assert.ok(!/(^|})\s*html\s*,\s*body\s*\{[^}]*background/.test(css), `${file}: html/body background`);
    // Every color decision has a dark counterpart when the theme defines tokens.
    if (/--n19-[a-z0-9-]+\s*:/.test(css)) assert.ok(/data-net19-mode="dark"/.test(css) || !/html\s*\{\s*--n19/.test(css), `${file}: tokens without a dark variant`);
  }
  for (const file of readdirSync('static/themes').filter(name => name.endsWith('.js') && !['palette.js', 'guard.js'].includes(name))) {
    const js = readFileSync(`static/themes/${file}`, 'utf8');
    assert.ok(/globalThis\.net19Theme\s*=/.test(js), `${file}: no theme config`);
    // Themes follow the site's own light/dark choice; they never switch it.
    assert.ok(!/removeAttribute\('dark'\)|classList\.remove\([^)]*dark/i.test(js), `${file}: overrides the site's mode`);
  }
});
