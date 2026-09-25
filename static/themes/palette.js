// net19 handmade themes: palette engine.
//
// A theme describes its 2019 look as styling rules, not as per-element overrides:
//   net19Theme = { detect(), light: { from: to, ... }, dark: { from: to, ... } }
// `from` is a color from the site's current design system and `to` is its 2019 counterpart. Every CSS custom
// property on the page root that currently holds a `from` color is re-pointed to `to`. Because sites build every
// surface (menus, popups, dialogs, content that loads later) from those properties, the whole site moves to the
// 2019 palette at once, with no boundary between restyled and default parts. Light and dark are separate
// palettes: the site's own mode is followed, never overridden. The chosen mode is exposed as
// html[data-net19-mode] so a theme's stylesheet can use its --n19-* tokens for the few shape rules it needs.
(() => {
  const theme = globalThis.net19Theme;
  if (!theme || globalThis.net19PaletteStarted) return;
  globalThis.net19PaletteStarted = true;
  const STYLE_ID = 'net19-palette';
  const canvas = document.createElement('canvas').getContext('2d');
  const normal = value => {
    const text = String(value).trim().toLowerCase();
    if (!/^(#|rgb|hsl)/.test(text)) return null;
    canvas.fillStyle = '#010203';
    canvas.fillStyle = text;
    const result = canvas.fillStyle; // "#rrggbb" or "rgba(r, g, b, a)"
    return result === '#010203' && text !== '#010203' ? null : result;
  };
  const tables = {};
  for (const mode of ['light', 'dark']) {
    tables[mode] = new Map();
    for (const [from, to] of Object.entries(theme[mode] || {})) { const key = normal(from); if (key) tables[mode].set(key, to); }
  }
  const luminance = color => {
    const hex = normal(color);
    if (!hex || !hex.startsWith('#')) return null;
    const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
    return (.2126 * r + .7152 * g + .0722 * b) / 255;
  };
  const detect = () => {
    const decided = theme.detect?.();
    if (decided === 'dark' || decided === 'light') return decided;
    const bg = luminance(getComputedStyle(document.body || document.documentElement).backgroundColor);
    return bg !== null && bg < .35 ? 'dark' : 'light';
  };
  const hasMap = tables.light.size > 0 || tables.dark.size > 0;
  let sheet = null;
  let lastMode = '';
  // Read the site's own variable values with net19's override sheet switched off. Toggling `disabled` is not a
  // DOM mutation, so it does not wake any observer (an earlier version re-inserted the element and re-triggered
  // itself on every animation frame).
  const siteValues = () => {
    if (sheet?.sheet) sheet.sheet.disabled = true;
    const values = [];
    const root = document.documentElement;
    for (const selector of ['html', 'body', ...(theme.scopes || [])]) {
      const node = selector === 'html' ? root : document.querySelector(selector);
      if (!node) continue;
      const style = getComputedStyle(node);
      for (let i = 0; i < style.length; i++) {
        const name = style[i];
        if (name.charCodeAt(0) === 45 && name.charCodeAt(1) === 45) values.push([name, style.getPropertyValue(name)]);
      }
    }
    if (sheet?.sheet) sheet.sheet.disabled = false;
    return values;
  };
  const apply = (force = false) => {
    const root = document.documentElement;
    if (!root) return;
    if (sheet?.sheet) sheet.sheet.disabled = true; // detection must see the site, not the theme
    const mode = detect();
    if (sheet?.sheet) sheet.sheet.disabled = false;
    if (root.getAttribute('data-net19-mode') !== mode) root.setAttribute('data-net19-mode', mode);
    if (!hasMap || mode === lastMode && !force) return; // palette maps only change with the mode or new stylesheets
    lastMode = mode;
    const table = tables[mode];
    const declared = new Map();
    for (const [name, value] of siteValues()) {
      if (declared.has(name)) continue;
      const to = table.get(normal(value));
      if (to) declared.set(name, to);
    }
    const body = [...declared].map(([name, to]) => `${name}:${to} !important`).join(';');
    const selectors = ['html:root', ...(theme.scopes || []).map(s => `html ${s}`)].join(',');
    if (!sheet) { sheet = document.createElement('style'); sheet.id = STYLE_ID; (document.head || root).append(sheet); }
    const text = body ? `${selectors}{${body}}` : '';
    if (sheet.textContent !== text) sheet.textContent = text;
  };
  // Mode changes are cheap to check; a palette re-scan after new stylesheets is batched to at most every 400 ms.
  let queued = false, rescan = false, timer = 0;
  const later = full => {
    rescan = rescan || full;
    if (full && !timer) timer = setTimeout(() => { timer = 0; run(); }, 400);
    if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; if (!timer) run(); }); }
  };
  const run = () => { const full = rescan; rescan = false; apply(full); };
  const watch = () => {
    apply(true);
    const observer = new MutationObserver(records => {
      let attributes = false, sheets = false;
      for (const r of records) {
        if (r.type === 'attributes' && r.attributeName !== 'data-net19-mode') attributes = true;
        else if (r.type === 'childList') for (const n of r.addedNodes) if (n !== sheet && (n.nodeName === 'STYLE' || n.nodeName === 'LINK')) sheets = true;
      }
      if (attributes || sheets) later(sheets);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: theme.watch || ['class', 'dark', 'data-color-mode', 'data-theme', 'style'] });
    if (hasMap && document.head) observer.observe(document.head, { childList: true });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    addEventListener('load', () => later(true), { once: true });
    matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => later(true));
  };
  // Stylesheets in <head> are parsed by the time <body> starts: decide then, before the first paint.
  if (document.body) watch();
  else new MutationObserver((_, observer) => { if (document.body) { observer.disconnect(); watch(); } })
    .observe(document.documentElement || document, { childList: true, subtree: true });
})();
