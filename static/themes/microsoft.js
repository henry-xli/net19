globalThis.net19Theme = {};  // www.microsoft.com has no site dark mode; default detection keeps it light.
// On a dark device the page is flipped by palette.js. Heroes set their type straight on their photos (white on the top one, dark on the pale product blocks), so flipped, their white text would turn dark on
// the photo: those parts are kept as drawn instead.
(() => {
  const root = document.documentElement;
  const SEL = 'store-hero-featured-xl-video, store-hero-featured-slider-item';
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
