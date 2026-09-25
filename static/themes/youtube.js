// net19 handmade theme: YouTube, 2019. YouTube marks its dark theme with html[dark]; both modes are restyled.
globalThis.net19Theme = {
  detect: () => document.documentElement.hasAttribute('dark') ? 'dark' : 'light',
  watch: ['dark', 'class'],
};
// Text that did not exist in 2019, changed in place: the search field said "Search" (not "Search or ask a question"),
// and "Ask YouTube" (an assistant entry point with no stable label) is hidden by its visible text.
(() => {
  const fix = () => {
    const masthead = document.querySelector('#masthead, ytd-masthead');
    if (!masthead) return;
    for (const input of masthead.querySelectorAll('input[name="search_query"]')) if (input.placeholder !== 'Search') input.placeholder = 'Search';
    for (const node of masthead.querySelectorAll('button, a, yt-button-shape, [role="button"]')) {
      if (/^\s*Ask YouTube\s*$/i.test(node.textContent || '') && !node.closest('[data-net19-hidden]')) node.setAttribute('data-net19-hidden', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
