// net19 handmade theme: Yelp. The site has a single (light) design; the default background-luminance detection
// keeps it light, and the dark tokens apply only if the page itself renders dark.
globalThis.net19Theme = {};
// The 2019 home page kept its header transparent over the hero photo; inner pages had the red bar.
(() => {
  const mark = () => document.documentElement.toggleAttribute('data-n19-home', location.pathname === '/');
  mark();
  for (const type of ['popstate', 'load']) addEventListener(type, mark);
})();
// On a dark device the page is flipped by palette.js and photos are turned back: the home hero's white type and the
// header floating over that photo would then turn black on the photo. Both are kept as drawn instead.
(() => {
  const root = document.documentElement;
  const keep = el => { if (el && !el.hasAttribute('data-net19-keep')) { el.removeAttribute('data-net19-scrim'); el.setAttribute('data-net19-keep', ''); } };
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip') || !root.hasAttribute('data-n19-home')) return;
    keep(document.querySelector('section[class*="hero__"]'));
    keep(document.querySelector('header[class*="consumer-header-container"]'));
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
