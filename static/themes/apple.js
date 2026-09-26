// net19 handmade theme: Apple. Apple.com has a single (light) design with dark tiles; the default background-luminance
// detection keeps it light, and the dark tokens apply only if the page itself renders dark.
globalThis.net19Theme = {};
// On a dark device the page is flipped by palette.js. Light product tiles draw their gray background into the photo
// itself, so a flipped tile would put light text on a light photo: those tiles are kept as drawn instead. The 2019 nav
// bar is translucent black with white links, already dark: it is kept as drawn too (flipped, its links would go dark).
(() => {
  const root = document.documentElement;
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip')) return;
    for (const el of document.querySelectorAll('#globalnav:not([data-net19-keep]), .tile-wrapper:not(.theme-dark):not([data-net19-keep])')) {
      el.removeAttribute('data-net19-scrim');
      el.setAttribute('data-net19-keep', '');
    }
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
