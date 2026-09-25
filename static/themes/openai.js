// net19 handmade theme: OpenAI, 2019. openai.com follows the device's color scheme and paints its page background
// accordingly, so the default luminance detection picks the matching mode.
globalThis.net19Theme = {};
// Home page: the "What can I help with?" assistant box that opens the page is hidden, and the release cards after it
// become 2019's pink cover. Both are found by structure (the classes are generated) and marked with attributes.
(() => {
  const root = document.documentElement;
  const fix = () => {
    const home = location.pathname === '/' || /^\/[a-z]{2}(-[A-Z]{2})?\/?$/.test(location.pathname);
    root.toggleAttribute('data-net19-home', home);
    if (!home) return;
    const article = document.querySelector('main#main > article');
    if (!article) return;
    const first = article.firstElementChild;
    if (first && first.querySelector('textarea') && !first.hasAttribute('data-net19-hidden')) first.setAttribute('data-net19-hidden', '');
    const cover = first?.hasAttribute('data-net19-hidden') ? first.nextElementSibling : null;
    if (cover && !cover.hasAttribute('data-net19-cover')) cover.setAttribute('data-net19-cover', '');
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
