// net19 handmade theme: healthline. Healthline has a single (light) design; the default background-luminance
// detection keeps it light and the engine inverts the page on dark devices.
globalThis.net19Theme = {};
// The home page is marked so its section titles can take 2019's uppercase style without touching article headings.
(() => {
  const mark = () => document.documentElement.toggleAttribute('data-net19-home', location.pathname === '/');
  mark();
  addEventListener('popstate', mark);
  let last = location.pathname;
  const check = () => { if (location.pathname !== last) { last = location.pathname; mark(); } };
  const start = () => new MutationObserver(() => requestAnimationFrame(check)).observe(document.body, { childList: true });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
