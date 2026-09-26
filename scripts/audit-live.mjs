// Stress audit: loads each themed site with the built extension, in light and dark, and exercises it:
// hovers the header's menu items, opens a menu, focuses the search field and types. In every state it flags
//  - faint text, measured from the screenshot's pixels (so filters, blur and translucency are all accounted for),
//  - post-2019 features still visible (AI / ask / generate labels, "ask" placeholders),
//  - header items off the row's vertical center, and buttons drawn inside text fields.
// Output: test-results/audit/<id>/<scheme>-<state>.png (flags boxed) and test-results/audit/report.jsonl
// usage: npm run build && npm run audit -- [id ...]   (default: every site in scripts/audit-urls.json)
// Needs network access to the sites. Some sites answer automated browsers with a bot check; those states are
// recorded as they are, so read the screenshots before trusting a clean result.
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdirSync, appendFileSync } from 'node:fs';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
const ALL = JSON.parse(readFileSync(new URL('./audit-urls.json', import.meta.url), 'utf8'));
const pick = process.argv.slice(2);
const URLS = process.env.URLS ? JSON.parse(process.env.URLS) : Object.fromEntries(Object.entries(ALL).filter(([id]) => !pick.length || pick.includes(id)));
const OUT = resolve(process.env.OUT || 'test-results/audit'), ext = resolve(process.env.EXT || 'dist/extension');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const MODERN = /\b(AI|Gemini|Copilot|Grok|ChatGPT|Rufus|Meta AI)\b|^ask\b(?! question)|create images?|brainstorm|ask about|generate|help me write|or ask a question|ask anything/i;

function inPage() {
  const vis = e => { const r = e.getBoundingClientRect(); const c = getComputedStyle(e); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && c.visibility === 'visible' && +c.opacity > .05; };
  const texts = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const seen = new Set();
  for (let n = walker.nextNode(); n && texts.length < 1500; n = walker.nextNode()) {
    const t = n.nodeValue.trim(); const el = n.parentElement;
    if (t.length < 2 || !el || seen.has(el) || el.closest('script,style,noscript')) continue;
    seen.add(el);
    if (!vis(el)) continue;
    const range = document.createRange(); range.selectNodeContents(n);
    const r = range.getBoundingClientRect();
    if (r.width < 4 || r.height < 6) continue;
    const cx = Math.min(innerWidth - 1, r.left + Math.min(r.width, 40) / 2), cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    if (!hit || !(hit === el || el.contains(hit) || hit.contains(el))) continue;   // covered by something else
    texts.push({ t: t.slice(0, 40), x: r.left, y: r.top, w: r.width, h: r.height, ink: el.closest('[data-net19-ink]')?.getAttribute('data-net19-ink') || '' });
  }
  const controls = [...document.querySelectorAll('button,a,[role=button],[role=tab],[role=menuitem],input,textarea')].filter(vis);
  const modern = [];
  for (const c of controls) {
    const label = (c.getAttribute('aria-label') || c.textContent || '').replace(/\s+/g, ' ').trim();
    if (label && label.length < 45 && /\b(AI|Gemini|Copilot|Grok|ChatGPT|Rufus)\b|^ask\b(?! question)|create images?|brainstorm|ask about|generate|help me write/i.test(label)) { const r = c.getBoundingClientRect(); modern.push({ t: label, x: r.left, y: r.top, w: r.width, h: r.height }); }
    const ph = c.getAttribute('placeholder');
    if (ph && /ask|chat/i.test(ph)) { const r = c.getBoundingClientRect(); modern.push({ t: 'placeholder: ' + ph, x: r.left, y: r.top, w: r.width, h: r.height }); }
  }
  // Header geometry: items in the top band, grouped into rows by vertical center.
  const header = controls.concat([...document.querySelectorAll('img,svg')].filter(vis)).map(e => ({ e, r: e.getBoundingClientRect() }))
    .filter(({ r }) => r.top >= 0 && r.bottom < 140 && r.height < 70 && r.width < 700);
  const top = header.filter(({ e }) => !header.some(o => o.e !== e && o.e.contains(e) && o.r.height < 70));
  const rows = [];
  for (const it of top.sort((a, b) => (a.r.top + a.r.height / 2) - (b.r.top + b.r.height / 2))) {
    const cy = it.r.top + it.r.height / 2; const row = rows.find(rw => Math.abs(rw.cy - cy) < 16);
    if (row) row.items.push({ ...it, cy }); else rows.push({ cy, items: [{ ...it, cy }] });
  }
  const misaligned = [];
  for (const row of rows) if (row.items.length >= 3) {
    const med = row.items.map(i => i.cy).sort((a, b) => a - b)[row.items.length >> 1];
    for (const i of row.items) if (Math.abs(i.cy - med) > 5 && i.r.height > 10) misaligned.push({ t: (i.e.getAttribute('aria-label') || i.e.textContent || i.e.tagName).trim().slice(0, 30), dy: Math.round(i.cy - med), x: i.r.left, y: i.r.top, w: i.r.width, h: i.r.height });
  }
  const inside = [];
  for (const f of controls.filter(c => c.matches('input[type=text],input[type=search],input:not([type]),textarea'))) {
    const fr = f.closest('form, [role=search], [class*="search" i]')?.getBoundingClientRect() || f.getBoundingClientRect();
    const ir = f.getBoundingClientRect();
    for (const b of controls.filter(c => c.matches('button,[role=button]') && !c.contains(f))) {
      const br = b.getBoundingClientRect();
      const ox = Math.max(0, Math.min(br.right, ir.right + 2) - Math.max(br.left, ir.left - 2)), oy = Math.max(0, Math.min(br.bottom, ir.bottom) - Math.max(br.top, ir.top));
      if (ox * oy > .5 * br.width * br.height && getComputedStyle(b).borderRadius.startsWith('50%')) inside.push({ t: (b.getAttribute('aria-label') || '').slice(0, 30), x: br.left, y: br.top, w: br.width, h: br.height });
    }
    void fr;
  }
  return { texts, modern, misaligned, inside, mode: document.documentElement.dataset.net19Mode || '', flip: document.documentElement.hasAttribute('data-net19-flip'), title: document.title.slice(0, 50) };
}

const lum = (r, g, b) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
async function faint(png, texts) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, C = info.channels, scale = W / 1280;
  const L = (x, y) => { const i = (Math.min(H - 1, Math.max(0, y)) * W + Math.min(W - 1, Math.max(0, x))) * C; return lum(data[i], data[i + 1], data[i + 2]); };
  const out = [];
  for (const t of texts) {
    const x0 = Math.round(t.x * scale), y0 = Math.round(t.y * scale), x1 = Math.round((t.x + t.w) * scale), y1 = Math.round((t.y + t.h) * scale);
    if (x1 - x0 < 4 || y1 - y0 < 5 || y0 < 0 || y1 > H) continue;
    const ring = []; for (let x = x0; x < x1; x += 2) { ring.push(L(x, y0 - 1), L(x, y1)); } for (let y = y0; y < y1; y += 2) { ring.push(L(x0 - 2, y), L(x1 + 1, y)); }
    ring.sort((a, b) => a - b); const bg = ring[ring.length >> 1];
    const diffs = []; for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x += 1) diffs.push(L(x, y));
    let best = bg; let far = 0;
    const sorted = diffs.map(v => [Math.abs(v - bg), v]).sort((a, b) => b[0] - a[0]);
    const pick = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * .03))]; if (pick) { far = pick[0]; best = pick[1]; }
    const ratio = (Math.max(best, bg) + .05) / (Math.min(best, bg) + .05);
    if (ratio < 1.9) out.push({ ...t, ratio: +ratio.toFixed(2) });
  }
  return out;
}
async function mark(png, boxes, file) {
  const img = sharp(png); const meta = await img.metadata(); const s = meta.width / 1280;
  const rects = boxes.map(b => `<rect x="${b.x * s - 2}" y="${b.y * s - 2}" width="${b.w * s + 4}" height="${b.h * s + 4}" fill="none" stroke="${b.c}" stroke-width="3"/>`).join('');
  await img.composite([{ input: Buffer.from(`<svg width="${meta.width}" height="${meta.height}">${rects}</svg>`) }]).png().toFile(file);
}

for (const [id, url] of Object.entries(URLS)) for (const scheme of SCHEMES) {
  mkdirSync(`${OUT}/${id}`, { recursive: true });
  const ctx = await chromium.launchPersistentContext(`/tmp/stress-${id}-${scheme}-${Date.now()}`, { channel: 'chromium', headless: true, viewport: { width: 1280, height: 860 }, colorScheme: scheme, userAgent: UA,
    args: [...(process.env.HTTPS_PROXY ? [`--proxy-server=${process.env.HTTPS_PROXY}`] : []), `--disable-extensions-except=${ext}`, `--load-extension=${ext}`] });
  await new Promise(r => setTimeout(r, 1500));
  const p = await ctx.newPage();
  const result = { id, scheme, states: {} };
  const record = async state => {
    const png = await p.screenshot().catch(() => null); if (!png) return;
    const info = await p.evaluate(inPage).catch(e => ({ err: e.message.slice(0, 80) }));
    if (info.err) { result.states[state] = info; return; }
    const faintOnes = await faint(png, info.texts);
    result.states[state] = { mode: info.mode, flip: info.flip, title: info.title, faint: faintOnes.map(f => `${f.t} (${f.ratio})`), modern: info.modern.map(m => m.t), misaligned: info.misaligned.map(m => `${m.t} ${m.dy}px`), inside: info.inside.map(m => m.t || 'button'), inked: info.texts.filter(t => t.ink).length };
    const boxes = [...faintOnes.map(b => ({ ...b, c: 'magenta' })), ...info.modern.map(b => ({ ...b, c: 'orange' })), ...info.misaligned.map(b => ({ ...b, c: 'cyan' })), ...info.inside.map(b => ({ ...b, c: 'lime' }))];
    await mark(png, boxes, `${OUT}/${id}/${scheme}-${state}.png`);
  };
  try {
    await p.goto(url, { waitUntil: 'load', timeout: 40000 }).catch(() => {});
    await p.waitForTimeout(3500);
    await record('load');
    // Hover the first few menu items in the header band.
    const triggers = await p.$$eval('header a, header button, nav a, nav button, [role=navigation] a, [aria-haspopup]:not([aria-haspopup=false]), [aria-expanded]', els => els.map((e, i) => { const r = e.getBoundingClientRect(); return { i, x: r.left + r.width / 2, y: r.top + r.height / 2, ok: r.width > 8 && r.height > 8 && r.top >= 0 && r.top < 130 && getComputedStyle(e).visibility === 'visible' }; }).filter(e => e.ok).slice(0, 6)).catch(() => []);
    let n = 0;
    for (const t of triggers) { await p.mouse.move(t.x, t.y); await p.waitForTimeout(900); await record(`hover${++n}`); }
    await p.mouse.move(5, 850);
    const search = await p.$('input[type=search], input[name=q], input[name=search_query], textarea[name=q], input[role=combobox], input[placeholder*="earch" i], input[aria-label*="earch" i]');
    if (search && await search.isVisible().catch(() => false)) {
      await search.click({ timeout: 3000 }).catch(() => {}); await p.keyboard.type('new', { delay: 60 }); await p.waitForTimeout(1600); await record('search');
      await p.keyboard.press('Escape');
    }
    const menu = await p.$('[aria-haspopup]:not([aria-haspopup=false]), button[aria-expanded=false]');
    if (menu && await menu.isVisible().catch(() => false)) { await menu.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(1200); await record('menu'); }
  } catch (e) { result.err = e.message.slice(0, 100); }
  appendFileSync(`${OUT}/report.jsonl`, JSON.stringify(result) + '\n');
  console.log(id, scheme, Object.entries(result.states).map(([k, v]) => `${k}:${(v.faint?.length || 0)}f/${(v.modern?.length || 0)}m/${(v.misaligned?.length || 0)}a/${(v.inside?.length || 0)}i`).join(' '));
  await ctx.close();
}
