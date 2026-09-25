// net19 handmade theme: Yahoo homepage, 2019, light and dark. Yahoo marks dark mode with html.uds-color-mode-dark.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('uds-color-mode-dark') ? 'dark' : 'light',
  watch: ['class'],
};
// 2019 wording: the search field had no placeholder, and the list in the right rail was titled "Trending Now".
(() => {
  const fix = () => {
    const field = document.getElementById('uh-sbq');
    if (field && field.placeholder) field.placeholder = '';
    const title = document.querySelector('#trending-search header h2');
    if (title && title.textContent === 'Trending') title.textContent = 'Trending Now';
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
