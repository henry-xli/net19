// net19 handmade theme: Walmart. The site has a single (light) design; the default background-luminance detection
// keeps it light. The palette map moves today's action blue (#0053e2 and its pressed navy) back to 2019's #0071ce.
globalThis.net19Theme = {
  light: { '#0053e2': '#0071ce', '#002e99': '#004c91' },
  dark: { '#0053e2': '#0071ce', '#002e99': '#004c91' },
};
// 2019 wording: the header search field simply said "Search".
(() => {
  const fix = () => {
    for (const input of document.querySelectorAll('header input.search-bar')) if (input.placeholder !== 'Search') input.placeholder = 'Search';
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder'] });
  };
  if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
// On a dark device the page is flipped by palette.js. The home page's promo cards set their headline straight on the
// card's photo (dark navy on a light picture), so flipped, the text would turn light on the unflipped photo: those
// cards are kept as drawn instead.
(() => {
  const root = document.documentElement;
  const SEL = 'main div.card-wrapper';
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip')) return;
    for (const el of document.querySelectorAll(SEL)) {
      if (el.hasAttribute('data-net19-keep') || !el.querySelector('img')) continue;
      el.removeAttribute('data-net19-scrim'); el.setAttribute('data-net19-keep', '');
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
