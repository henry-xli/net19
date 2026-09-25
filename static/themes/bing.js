// net19 handmade theme: bing. Results pages follow Bing's own light or dark design, read by the palette engine from the
// page background. The homepage is the image of the day in either mode (as in 2019), so it is never inverted: its mode
// is simply the device's.
globalThis.net19Theme = {
  detect: () => location.pathname === '/' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : undefined,
};
// The 2019 homepage search box was empty: no "Search the web" placeholder.
(() => {
  const fix = () => { const q = document.querySelector('#hp_app #sb_form_q'); if (q && q.placeholder) q.placeholder = ''; };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
