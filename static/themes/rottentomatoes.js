globalThis.net19Theme = {};  // Rotten Tomatoes has no dark mode; default detection keeps it light.
// 2019 wording in the header: the search field said "Search movies, TV, actors, more..." and the first top link
// (to the page that explains the scores) read "What's the Tomatometer®?".
(() => {
  const HINT = 'Search movies, TV, actors, more...';
  const fix = () => {
    const header = document.querySelector('rt-header');
    if (!header) return;
    for (const input of header.querySelectorAll('input[slot="search-input"]')) if (input.placeholder !== HINT) input.placeholder = HINT;
    for (const a of header.querySelectorAll('ul[slot="nav-links"] a')) {
      if (/^\s*About Rotten Tomatoes®?\s*$/.test(a.textContent) && a.childElementCount === 0) a.textContent = 'What’s the Tomatometer®?';
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); keep(); }); };
  // On a dark device the page is inverted by palette.js; the header (red bar, gray trending strip) is drawn in shadow roots
  // the engine cannot see into, so it is kept as drawn: a red bar reads the same in both modes, as the 2019 header did.
  const root = document.documentElement;
  const keep = () => {
    const header = document.querySelector('#main > header, body > #main > header');
    if (header && root.hasAttribute('data-net19-flip') && !header.hasAttribute('data-net19-keep')) header.setAttribute('data-net19-keep', '');
  };
  new MutationObserver(keep).observe(root, { attributes: true, attributeFilter: ['data-net19-flip'] });
  const start = () => {
    fix(); keep();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['placeholder'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
