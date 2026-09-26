// net19 handmade theme: USPS, 2019. usps.com has no dark mode; default detection keeps it light.
globalThis.net19Theme = {};
// The 2019 main menu read "Mail & Ship", "Track & Manage" and "Postal Store" where today's says "Send", "Receive" and "Shop".
(() => {
  const words = { Send: 'Mail & Ship', Receive: 'Track & Manage', Shop: 'Postal Store' };
  const fix = () => {
    for (const link of document.querySelectorAll('nav[aria-label="Main"] a.menuitem')) {
      for (const node of link.childNodes) {
        const text = node.nodeType === 3 ? node.textContent.trim() : '';
        if (words[text]) node.textContent = node.textContent.replace(text, words[text]);
      }
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
// On a dark device the page is flipped by palette.js. The navy Quick Tools tab (a ::before fill) would turn pale lavender
// under its inverted white words; it is kept as drawn, so it stays white on navy as in 2019.
(() => {
  const root = document.documentElement;
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip')) return;
    for (const el of document.querySelectorAll('nav[aria-label="Main"] a.menuitem.nav-first-element')) if (!el.hasAttribute('data-net19-keep')) el.setAttribute('data-net19-keep', '');
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mark(); }); };
  const start = () => {
    later();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(later).observe(root, { attributes: true, attributeFilter: ['data-net19-flip'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
