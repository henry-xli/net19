// net19 handmade theme: bbc. BBC has a single (light) design. News pages had their own red masthead in 2019, so the
// section is exposed as html[data-net19-section] for the stylesheet (the site's own markup is not changed).
globalThis.net19Theme = {};
(() => {
  const mark = () => {
    const news = /^\/news(\/|$)/.test(location.pathname);
    const root = document.documentElement;
    if (!root) return;
    if (news && root.getAttribute('data-net19-section') !== 'news') root.setAttribute('data-net19-section', 'news');
    else if (!news && root.hasAttribute('data-net19-section')) root.removeAttribute('data-net19-section');
  };
  if (document.documentElement) mark(); else document.addEventListener('readystatechange', mark, { once: true });
  // Client-side navigation (the site is a single-page app) changes the path without a reload.
  addEventListener('popstate', mark);
  let last = location.pathname;
  setInterval(() => { if (location.pathname !== last) { last = location.pathname; mark(); } }, 1000);
})();
