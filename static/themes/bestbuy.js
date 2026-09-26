// net19 handmade theme: Best Buy, 2019. Best Buy has no dark mode, so the default luminance detection applies.
globalThis.net19Theme = {};
// On a dark device the page is flipped by palette.js. The home hero banner is a navy-to-teal gradient (a CSS gradient,
// which the flip turns pale blue under black type); it is kept as drawn, white type on Best Buy blue as in 2019.
(() => {
  const root = document.documentElement;
  const SEL = '[data-testid="hero-banner"]';
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip')) return;
    for (const el of document.querySelectorAll(SEL)) if (!el.hasAttribute('data-net19-keep')) { el.removeAttribute('data-net19-scrim'); el.setAttribute('data-net19-keep', ''); }
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
