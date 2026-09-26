globalThis.net19Theme = {};  // Target has no dark mode; default detection keeps it light.
// On a dark device the page is flipped by palette.js. Story cards set white headlines straight on their photos, so flipped, their white text would turn dark on
// the photo: those parts are kept as drawn instead.
(() => {
  const root = document.documentElement;
  const SEL = '[class*="styles_storycardWrapper"]:has(:is([class*="customTextPosition"], [class*="flexTextPosition"]))';
  const mark = () => {
    if (!root.hasAttribute('data-net19-flip')) return;
    for (const el of document.querySelectorAll(SEL)) {
      if (el.hasAttribute('data-net19-keep')) continue;
      // Flex-positioned text can sit beside the photo as well as over it: only cards whose text overlaps the photo are kept.
      if (!el.querySelector('[class*="customTextPosition"]')) {
        const text = el.querySelector('[class*="storycardText"]')?.getBoundingClientRect(), img = el.querySelector('img')?.getBoundingClientRect();
        if (!text || !img || img.width < 2 || text.left >= img.right || img.left >= text.right || text.top >= img.bottom || img.top >= text.bottom) continue;
      }
      el.removeAttribute('data-net19-scrim'); el.setAttribute('data-net19-keep', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mark(); }); };
  const start = () => {
    later();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    addEventListener('load', later, { once: true });
    new MutationObserver(later).observe(root, { attributes: true, attributeFilter: ['data-net19-flip'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
