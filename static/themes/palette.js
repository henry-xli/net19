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
  // The device decides light or dark. When the site itself shows the other mode (most sites have no dark mode; some
  // keep their own setting), the whole themed page is flipped: an inverting filter on the root with photos, video and
  // embeds turned back, so the 2019 look appears in the device's mode everywhere at once — menus, popups and content
  // that loads later included, with no boundary between restyled and unstyled parts. Top-layer elements (modal
  // dialogs, popovers, fullscreen) are drawn outside the root's filter, so they get the same filter themselves.
  // Themes whose site was dark-only in 2019 set `only: 'dark'` (or a function returning it) and are never flipped.
  const device = matchMedia('(prefers-color-scheme: dark)');
  const FLIP = 'invert(1) hue-rotate(180deg) contrast(.88)';
  const UNFLIP = 'contrast(1.13636) hue-rotate(180deg) invert(1)'; // exact inverse of FLIP, applied first
  const MEDIA = 'img,video,canvas,iframe,embed,object,image,[data-net19-keep]';
  const flipCSS = `html[data-net19-flip]{filter:${FLIP}!important}` +
    `html[data-net19-flip] :is(dialog:modal,:popover-open,:fullscreen):not(${MEDIA}){filter:${FLIP}!important}` +
    `html[data-net19-flip] :is(${MEDIA}):not([data-net19-keep] *,:fullscreen,img[src*=".svg" i],img[src^="data:image/svg" i],[data-net19-flat]){filter:${UNFLIP}!important}` +
    // Inside a part that was kept as drawn, light panels (a search suggestion list under a dark header) flip again.
    `html[data-net19-flip] [data-net19-keep] [data-net19-reflip]{filter:${FLIP}!important}` +
    `html[data-net19-flip] [data-net19-reflip] :is(${MEDIA}){filter:${UNFLIP}!important}`;
  let flipSheet = null, keepObserver = null, target = 'dark', interactions = false;
  // Parts of the page that already look right in the target mode are turned back rather than flipped: photos drawn
  // as CSS backgrounds (banners, cards), and bars or panels whose own background is already dark (for a dark
  // device) or already light (for a light device) — a navy header or black footer stays as the site drew it
  // instead of turning pastel. Decisions are read for a whole batch first and written after, so layout is computed once.
  const rgba = color => {
    const m = color.match(/[\d.]+/g);
    return m ? [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1] : null;
  };
  const lum = ([r, g, b]) => (.2126 * r + .7152 * g + .0722 * b) / 255;
  // The color that FLIP turns into `c`: contrast, hue-rotate(180deg) and invert undone channel by channel.
  const unflip = ([r, g, b, a]) => {
    const [cr, cg, cb] = [r, g, b].map(v => Math.min(1, Math.max(0, (v / 255 - .5) / .88 + .5)));
    const [hr, hg, hb] = [-.574 * cr + 1.43 * cg + .144 * cb, .426 * cr + .43 * cg + .144 * cb, .426 * cr + 1.43 * cg - .856 * cb];
    return `rgba(${[hr, hg, hb].map(v => Math.round(255 * (1 - Math.min(1, Math.max(0, v))))).join(',')},${a})`;
  };
  // Translucent scrims and caption overlays keep their own color, but whatever sits on them (a consent dialog over a
  // dimmed page) still flips: only their background is set to the color that flips back to the original.
  const scrims = new Map();
  const scrim = color => {
    let id = scrims.get(color);
    if (id === undefined) {
      id = scrims.size; scrims.set(color, id);
      flipSheet.textContent += `html[data-net19-flip] [data-net19-scrim="${id}"]{background-color:${unflip(rgba(color))}!important}`;
    }
    return id;
  };
  let seen = new WeakSet(), small = new Set(); // each element is classified once, unless it was too small to judge
  const DRAWN = /\.(png|gif|svg)(\b|[?#"'])|image\/(png|gif|svg)/i;
  const PHOTO = /\.(jpe?g|webp|avif)(\b|[?#"'])|image\/(jpeg|webp|avif)|[?&](fm|format)=(jpe?g|webp|avif)/i;
  // PNG, GIF and SVG images drawn small are logos and icons: dark glyphs on a transparent background would vanish on
  // a dark page if turned back, so they flip with it. Larger ones, and all photo formats, keep their real colors.
  const flatIcon = img => {
    const src = img.currentSrc || img.src || '';
    if (!/\.(png|gif)(\b|[?#])|^data:image\/(png|gif)/i.test(src)) return;
    const judge = () => { if (img.offsetHeight > 0 && img.offsetHeight <= 120 && img.offsetWidth <= 400) img.setAttribute('data-net19-flat', ''); };
    if (img.complete) judge(); else img.addEventListener('load', judge, { once: true });
  };
  const SKIP = /^(IMG|VIDEO|CANVAS|IFRAME|SVG|svg|PATH|path|SCRIPT|STYLE|LINK|META|BR)$/;
  const keepPhotos = roots => {
    const decided = new Map(), scrimColor = new Map(); // element -> 'keep' | 'reflip' | 'scrim'
    const context = el => {    // 'kept' inside a kept part, 'none' inside a flipped-again one, otherwise 'flipped'
      for (let n = el.parentElement, i = 0; n && i < 40; n = n.parentElement, i++) {
        const d = decided.get(n) || (n.hasAttribute('data-net19-reflip') ? 'reflip' : n.hasAttribute('data-net19-keep') ? 'keep' : '');
        if (d === 'keep') return 'kept';
        if (d === 'reflip') return 'none';
      }
      return 'flipped';
    };
    for (const root of roots) {
      if (!root?.isConnected) continue;
      // Containers that were too small to judge before (a closed flyout) are judged again when content arrives in them.
      const grown = [];
      for (let n = root.parentElement, i = 0; n && i < 8; n = n.parentElement, i++) if (small.has(n)) { small.delete(n); seen.delete(n); grown.unshift(n); }
      const list = root.querySelectorAll ? [...grown, root, ...root.querySelectorAll('*')] : grown;
      for (const el of list) {
        if (seen.has(el)) continue;
        seen.add(el);
        if (el.tagName === 'IMG') { flatIcon(el); continue; }
        if (SKIP.test(el.tagName) || el.hasAttribute('data-net19-keep') || el.hasAttribute('data-net19-reflip') || el.hasAttribute('data-net19-scrim')) continue;
        // Style first (one recalculation per batch); context and size, which needs layout, only for the few candidates.
        const style = getComputedStyle(el);
        // Photographs are turned back; drawn backgrounds (PNG and SVG illustrations, textures, icons) flip with the page.
        // Without a file type in the address, only large backgrounds are taken for photographs.
        const image = style.backgroundImage;
        const photo = image.includes('url(') && !DRAWN.test(image);
        const surely = photo && PHOTO.test(image);
        const color = photo ? null : rgba(style.backgroundColor);
        if (!photo && (!color || color[3] < .15)) continue;
        const l = color && lum(color);
        // Strong brand colors (a red or blue bar) are kept as drawn too: flipped they would turn pastel.
        const vivid = color && color[3] >= .9 && Math.max(color[0], color[1], color[2]) - Math.min(color[0], color[1], color[2]) > 90;
        const suits = color && (vivid || (target === 'dark' ? l < .36 : l > .75));
        const opposite = color && color[3] >= .9 && (target === 'dark' ? l > .75 : l < .3);
        if (!photo && !suits && !opposite) continue;
        const where = context(el);
        if (where === 'none' || (where === 'flipped' && !photo && !suits) || (where === 'kept' && !opposite)) continue;
        const w = el.offsetWidth, h = el.offsetHeight;
        if (w < 96 || h < 24 || (photo && h < (surely ? 64 : 200))) { small.add(el); continue; }
        if (where === 'kept') decided.set(el, 'reflip');
        else if (photo || color[3] >= .9) decided.set(el, 'keep');
        else { decided.set(el, 'scrim'); scrimColor.set(el, style.backgroundColor); }
      }
    }
    for (const [el, d] of decided) {
      if (d === 'scrim') el.setAttribute('data-net19-scrim', scrim(scrimColor.get(el)));
      else el.setAttribute(`data-net19-${d}`, '');
    }
  };
  const setFlip = (on, mode) => {
    const root = document.documentElement;
    if (on === root.hasAttribute('data-net19-flip') && (!on || mode === target)) return;
    keepObserver?.disconnect(); keepObserver = null;
    for (const el of document.querySelectorAll('[data-net19-keep],[data-net19-reflip],[data-net19-scrim],[data-net19-flat]')) for (const a of ['data-net19-keep', 'data-net19-reflip', 'data-net19-scrim', 'data-net19-flat']) el.removeAttribute(a);
    seen = new WeakSet(); small = new Set();
    if (!on) { root.removeAttribute('data-net19-flip'); root.removeAttribute('data-net19-canvas'); return; }
    target = mode;
    if (!flipSheet) {
      flipSheet = document.createElement('style'); flipSheet.id = 'net19-flip';
      flipSheet.textContent = flipCSS + 'html[data-net19-flip][data-net19-canvas]{background-color:#fff!important}';
      (document.head || root).append(flipSheet);
    }
    root.setAttribute('data-net19-flip', '');
    // A page that paints no background of its own shows the browser's white canvas, which the root's filter does not
    // reach: then the root is given that white itself, so it flips with the page.
    const canvas = () => {
      const bare = [root, document.body].every(n => !n || (rgba(getComputedStyle(n).backgroundColor) || [0, 0, 0, 0])[3] === 0);
      if (bare) root.setAttribute('data-net19-canvas', '');
    };
    canvas();
    addEventListener('load', canvas, { once: true });
    // New content is classified once per frame, in requestAnimationFrame: that runs before the frame is painted, and
    // the style and layout it reads are the ones the browser computes for that paint anyway.
    let added = [document.body], frame = 0;
    const flush = () => { frame = 0; const roots = added; added = []; keepPhotos(roots); };
    frame = requestAnimationFrame(flush);
    keepObserver = new MutationObserver(records => {
      for (const r of records) for (const n of r.addedNodes) if (n.nodeType === 1) added.push(n);
      if (added.length && !frame) frame = requestAnimationFrame(flush);
    });
    keepObserver.observe(document.body || root, { childList: true, subtree: true });
    // Menus and flyouts that were already in the page but closed only get a size when opened, often by a class change
    // rather than new content: after a click, key press or focus, closed containers that have opened are judged again.
    if (!interactions) {
      interactions = true;
      const recheck = () => setTimeout(() => requestAnimationFrame(() => {
        if (!document.documentElement.hasAttribute('data-net19-flip')) return;
        const opened = [];
        for (const el of small) {
          if (!el.isConnected) { small.delete(el); continue; }
          if (el.offsetWidth >= 96 && el.offsetHeight >= 24) { small.delete(el); seen.delete(el); opened.push(el); }
        }
        if (opened.length) keepPhotos(opened);
      }), 250);
      for (const type of ['click', 'keyup', 'focusin']) addEventListener(type, recheck, { capture: true, passive: true });
    }
    addEventListener('load', () => keepPhotos([document.body]), { once: true });
  };
  const apply = (force = false) => {
    const root = document.documentElement;
    if (!root) return;
    if (sheet?.sheet) sheet.sheet.disabled = true; // detection must see the site, not the theme
    const mode = detect();
    if (sheet?.sheet) sheet.sheet.disabled = false;
    if (root.getAttribute('data-net19-mode') !== mode) root.setAttribute('data-net19-mode', mode);
    const fixed = typeof theme.only === 'function' ? theme.only() : theme.only;
    const wanted = fixed === 'dark' || fixed === 'light' ? fixed : device.matches ? 'dark' : 'light';
    setFlip(wanted !== mode, wanted);
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
        if (r.type === 'attributes' && r.attributeName !== 'data-net19-mode' && r.attributeName !== 'data-net19-flip') attributes = true;
        else if (r.type === 'childList') for (const n of r.addedNodes) if (n !== sheet && n !== flipSheet && (n.nodeName === 'STYLE' || n.nodeName === 'LINK')) sheets = true;
      }
      if (attributes || sheets) later(sheets);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: theme.watch || ['class', 'dark', 'data-color-mode', 'data-theme', 'style'] });
    if (hasMap && document.head) observer.observe(document.head, { childList: true });
    if (document.body) observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style'] });
    addEventListener('load', () => later(true), { once: true });
    device.addEventListener?.('change', () => later(true));
  };
  // Stylesheets in <head> are parsed by the time <body> starts: decide then, before the first paint.
  if (document.body) watch();
  else new MutationObserver((_, observer) => { if (document.body) { observer.disconnect(); watch(); } })
    .observe(document.documentElement || document, { childList: true, subtree: true });
})();
