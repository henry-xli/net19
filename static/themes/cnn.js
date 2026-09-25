// net19 handmade theme: CNN, 2019. CNN has a single (light) design, so the default background-luminance detection
// keeps it light and the engine inverts the page on dark devices.
globalThis.net19Theme = {};
// The black "Subscribe to stream" band (CNN's 2024 streaming subscription) is a promotion with no stable class:
// its zone is marked by its title text and hidden by cnn.css.
(() => {
  const fix = () => {
    for (const title of document.querySelectorAll('.product-zone--t-dark .product-zone__title')) {
      if (/^\s*Subscribe to stream/i.test(title.textContent || '')) title.closest('.product-zone')?.setAttribute('data-net19-promo', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
