// net19 handmade theme: ubereats. Uber Eats' dark theme follows the device; the palette engine detects which one
// is showing from the page background, so the light or dark tokens apply to match.
globalThis.net19Theme = {};
// The landing page sets black type and the transparent header straight on a full-window food photo. On a dark device
// the page is flipped by palette.js and the photo turned back, which would leave white type on the light photo: the
// hero and the header floating over it are kept as drawn instead (as the 2019 site, which had no dark mode, showed them).
(() => {
  const root = document.documentElement;
  const photo = el => [el, ...el.querySelectorAll('div')].slice(0, 60).some(d => getComputedStyle(d).backgroundImage.includes('url('));
  const keep = el => { if (el && !el.hasAttribute('data-net19-keep')) { el.removeAttribute('data-net19-scrim'); el.setAttribute('data-net19-keep', ''); } };
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip')) return;
    for (const h1 of document.querySelectorAll('main h1')) {
      const hero = h1.closest('main > div');
      if (!hero || hero.hasAttribute('data-net19-keep') || !photo(hero)) continue;
      keep(hero);
      const header = document.querySelector('[data-testid="header-v2-wrapper"]');
      if (header && getComputedStyle(header.parentElement).position === 'absolute') keep(header);
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
