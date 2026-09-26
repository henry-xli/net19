// net19 handmade theme: Mayo Clinic, 2019. Mayo marks its own dark rendering with body.dark-mode.
globalThis.net19Theme = {
  detect: () => document.body?.classList.contains('dark-mode') ? 'dark' : 'light',
  watch: ['class'],
};
// On a dark device the page is flipped by palette.js. The home page hero sets white type straight on a video poster (a background image, not an <img>), so flipped, their white text would turn dark on
// the photo: those parts are kept as drawn instead.
(() => {
  const root = document.documentElement;
  const SEL = '.cmp-hero-card';
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
