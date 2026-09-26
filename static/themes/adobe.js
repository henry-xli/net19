// net19 handmade theme: Adobe. www.adobe.com has no site dark mode; default detection keeps it light.
// Firefly (Adobe's generative AI, 2023) did not exist in 2019: its calls to action and menu entries are hidden by label.
globalThis.net19Theme = { later: /^(?:create with (?:adobe )?firefly|(?:try |explore |open )?(?:adobe )?firefly(?: [a-z ]*)?|generative ai|acrobat ai assistant|ai assistant(?: for acrobat)?)$/i };
// On a dark device the page is flipped by palette.js. The home hero (router-marquee) sets white type and translucent
// dark tabs over a full-bleed video; flipped, the type turns black on a washed-out photo, so it is kept as drawn.
(() => {
  const root = document.documentElement;
  const SEL = '.router-marquee';
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
