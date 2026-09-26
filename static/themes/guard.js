// net19 guard: two safety nets shared by every theme, running after the theme and palette.js.
//
// 1. Features that did not exist in 2019 (AI assistants, image generation, "ask" search) are hidden wherever a site
//    shows them, by their visible label, and search fields that invite questions go back to plain "Search". Themes
//    hide what they know about; this catches what a site adds later or shows only to some accounts.
// 2. Readability: after the theme, the light/dark flip and every interaction (a menu opening on hover, a search list),
//    visible text is checked against the background it actually sits on. Text that has become unreadable (a theme
//    rule reaching into a menu it was not written for, a panel kept as drawn inside a flipped page) is given a dark or
//    light ink that reads on that background. Text over photos and gradients is left alone: its background is unknown.
(() => {
  const theme = globalThis.net19Theme;
  if (!theme || globalThis.net19GuardStarted) return;
  globalThis.net19GuardStarted = true;
  const root = document.documentElement;

  // ---- 1. Post-2019 features -------------------------------------------------------------------------------------
  const LATER = /^(?:ask (?:ai|anything|youtube|meta ai|gemini|copilot|rufus|target|about (?:files|this (?:page|video|result))|the chatbot)|ai mode|ai overviews?|try ai mode|ai search|search with ai|ai assist(?:ant)?|ai generator|ai image generator|create images?|create an image|generate(?: an)? images?|imagine with ai|brainstorm|help me write|write with ai|summari[sz]e(?: with ai)?|explain with ai|gemini|google gemini|copilot|microsoft copilot|grok|meta ai|chatgpt|rufus|magic apron|mylow|arti)$/i;
  const extra = theme.later instanceof RegExp ? theme.later : null;
  const keep = theme.keepLabels instanceof RegExp ? theme.keepLabels : null;
  const label = text => String(text || '').replace(/\s+/g, ' ').replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N})]+$/gu, '').trim();
  const later = text => { const t = label(text); return t.length > 1 && t.length < 40 && !keep?.test(t) && (LATER.test(t) || !!extra?.test(t)); };
  const CONTROL = 'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"], [role="option"], [class*="chip" i]';
  const ASKING = /\b(?:or ask\b|ask anything|ask (?:a|any|your) question|ask (?:ai|me|gemini|copilot|rufus)|chat with)/i;
  const hideLater = scope => {
    for (const el of scope.querySelectorAll?.(CONTROL) || []) {
      if (el.hasAttribute('data-net19-hidden')) continue;
      if (later(el.textContent) || later(el.getAttribute('aria-label')) || later(el.getAttribute('title'))) {
        el.setAttribute('data-net19-hidden', '');
        const item = el.parentElement;
        if (item && /^(LI|YT-CHIP-CLOUD-CHIP-RENDERER)$/.test(item.tagName) && item.children.length === 1) item.setAttribute('data-net19-hidden', '');
      }
    }
    for (const field of scope.querySelectorAll?.('input[placeholder], textarea[placeholder]') || []) {
      const text = field.getAttribute('placeholder');
      if (!ASKING.test(text)) continue;
      const plain = text.replace(/\s*(?:,|\bor\b)?\s*(?:ask|chat)\b.*$/i, '').trim();
      field.setAttribute('placeholder', plain && plain !== text ? plain : 'Search');
    }
  };

  // ---- 2. Readability --------------------------------------------------------------------------------------------
  const rgba = c => { const m = String(c).match(/[\d.]+/g); return m && m.length >= 3 ? [+m[0], +m[1], +m[2], m.length > 3 ? +m[3] : 1] : null; };
  const channel = v => { v /= 255; return v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
  const lum = c => .2126 * channel(c[0]) + .7152 * channel(c[1]) + .0722 * channel(c[2]);
  const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  const over = (top, under) => { const a = top[3]; return [0, 1, 2].map(i => top[i] * a + under[i] * (1 - a)).concat(1); };
  const invert = c => [255 - c[0], 255 - c[1], 255 - c[2], c[3]];
  // How many times the page flip applies to an element (odd: it is shown inverted).
  const parity = el => {
    if (!root.hasAttribute('data-net19-flip')) return 0;
    let n = 1;
    for (let e = el; e && e !== root; e = e.parentElement) {
      if (e.hasAttribute('data-net19-keep')) n--; else if (e.hasAttribute('data-net19-reflip')) n++;
    }
    return ((n % 2) + 2) % 2;
  };
  const MEDIA = 'img, picture, video, canvas, svg image, iframe';
  // The solid color behind an element, or null when a photo, gradient or media element may be behind it.
  const backdrop = el => {
    const layers = [];
    for (let e = el; e; e = e.parentElement) {
      const style = getComputedStyle(e);
      if (style.backgroundImage !== 'none') return null;
      if (e !== el) for (const child of e.children) {
        if (child.matches(MEDIA) || child.querySelector?.(':scope > img, :scope > video, :scope > picture')) {
          const a = child.getBoundingClientRect(), b = el.getBoundingClientRect();
          if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) return null;
        }
      }
      const color = rgba(style.backgroundColor);
      if (color && color[3] > 0) {
        layers.push({ color, el: e });
        if (color[3] >= .95) break;
      }
      if (e === root) break;
    }
    let base = [255, 255, 255, 1], baseEl = root;
    const last = layers[layers.length - 1];
    if (last && last.color[3] >= .95) { base = last.color; baseEl = last.el; layers.pop(); }
    const flipBase = parity(baseEl);
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = parity(layers[i].el) === flipBase ? layers[i].color : invert(layers[i].color);
      base = over(layer, base);
    }
    return { color: base, flip: flipBase };
  };
  // Before changing any text: whatever is painted under its middle (sibling layers included) must not be a picture.
  const painted = e => { const st = getComputedStyle(e); return st.backgroundImage !== 'none' || ['::before', '::after'].some(p => getComputedStyle(e, p).backgroundImage !== 'none'); };
  const overPicture = (el, box) => {
    const x = Math.min(innerWidth - 1, Math.max(0, box.left + Math.min(box.width, 60) / 2)), y = Math.min(innerHeight - 1, Math.max(0, box.top + box.height / 2));
    for (const hit of document.elementsFromPoint(x, y)) {
      if (hit === el || el.contains(hit)) continue;
      if (hit.matches(MEDIA) || painted(hit)) return true;
      const color = rgba(getComputedStyle(hit).backgroundColor);
      if (color && color[3] >= .95) return false;   // an opaque surface ends the stack below the text
    }
    return false;
  };
  const inkSheet = document.createElement('style');
  inkSheet.textContent = '[data-net19-hidden]{display:none!important}' +
    '[data-net19-ink="dark"],[data-net19-ink="dark"] *{color:#1d1d1f!important;-webkit-text-fill-color:#1d1d1f!important}' +
    '[data-net19-ink="light"],[data-net19-ink="light"] *{color:#f5f5f7!important;-webkit-text-fill-color:#f5f5f7!important}';
  const original = new WeakMap();
  const textElements = () => {
    const found = new Set();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: n => n.nodeValue.trim().length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP,
    });
    for (let n = walker.nextNode(); n && found.size < 3000; n = walker.nextNode()) if (n.parentElement) found.add(n.parentElement);
    return found;
  };
  const check = () => {
    if (!document.body) return;
    const view = { w: innerWidth, h: innerHeight };
    const changes = [];
    for (const el of textElements()) {
      if (el.closest('script, style, noscript, [data-net19-hidden]')) continue;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2 || box.bottom < 0 || box.top > view.h || box.right < 0 || box.left > view.w) continue;
      const style = getComputedStyle(el);
      if (style.visibility !== 'visible' || +style.opacity < .1 || parseFloat(style.fontSize) < 8) continue;
      let text = original.get(el);
      if (!text) { text = rgba(style.webkitTextFillColor && style.webkitTextFillColor !== style.color ? style.webkitTextFillColor : style.color); if (!text) continue; }
      if (text[3] < .2) continue;
      const bg = backdrop(el);
      if (!bg) { if (el.hasAttribute('data-net19-ink')) changes.push([el, null]); continue; }
      const inText = parity(el) === bg.flip ? bg.color : invert(bg.color);
      const shown = over(text, inText);
      const current = el.getAttribute('data-net19-ink');
      if (ratio(shown, inText) >= 2.2) { if (current) changes.push([el, null]); continue; }
      if (!current && overPicture(el, box)) continue;
      if (!original.has(el)) original.set(el, text);
      const ink = lum(inText) > .4 ? 'dark' : 'light';
      if (current !== ink) changes.push([el, ink]);
    }
    for (const [el, ink] of changes) {
      if (ink) el.setAttribute('data-net19-ink', ink);
      else { el.removeAttribute('data-net19-ink'); original.delete(el); }
    }
  };

  // ---- Scheduling ------------------------------------------------------------------------------------------------
  // Hiding runs on every batch of new content, before it is painted. The readability check runs when the page has
  // settled after a change (load, the mode or flip changing, a menu or list opening), at most every 600 ms.
  let dirty = true, timer = 0, lastRun = 0;
  const soon = (delay = 250) => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = 0;
      if (!dirty) return;
      const wait = 600 - (performance.now() - lastRun);
      if (wait > 0) { soon(wait); return; }
      dirty = false; lastRun = performance.now();
      (globalThis.requestIdleCallback || (f => f()))(() => check(), { timeout: 300 });
    }, delay);
  };
  const start = () => {
    (document.head || root).append(inkSheet);
    hideLater(document.body);
    new MutationObserver(records => {
      let added = false;
      for (const r of records) {
        if (r.type === 'childList') for (const n of r.addedNodes) { if (n.nodeType === 1) { hideLater(n); added = true; } }
        else if (r.target === root || r.attributeName !== 'data-net19-ink') added = true;
        if (r.type === 'attributes' && r.attributeName === 'placeholder' && ASKING.test(r.target.getAttribute('placeholder') || '')) hideLater(r.target.parentElement || r.target);
      }
      if (added) { dirty = true; soon(); }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style', 'hidden', 'open', 'aria-expanded', 'placeholder'] });
    new MutationObserver(() => { dirty = true; soon(50); }).observe(root, { attributes: true, attributeFilter: ['data-net19-mode', 'data-net19-flip', 'class'] });
    for (const type of ['pointerover', 'focusin', 'click', 'keyup']) addEventListener(type, () => soon(), { capture: true, passive: true });
    // Colors chosen mid-animation (a ribbon fading from blue to white) are checked again when it ends.
    for (const type of ['transitionend', 'animationend']) addEventListener(type, () => { dirty = true; soon(200); }, { capture: true, passive: true });
    addEventListener('scroll', () => { dirty = true; soon(300); }, { capture: true, passive: true });
    addEventListener('load', () => { dirty = true; soon(100); }, { once: true });
    soon(100);
  };
  // Starts as soon as <body> exists, so labels hidden here are never painted.
  if (document.body) start();
  else new MutationObserver((_, observer) => { if (document.body) { observer.disconnect(); start(); } })
    .observe(root || document, { childList: true, subtree: true });
})();
