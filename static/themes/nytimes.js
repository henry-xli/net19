// net19 handmade theme: nytimes. The site has a single (light) design, so the light palette applies and palette.js
// inverts the page for dark devices. Reading-time labels ("5 MIN READ", added in 2023) have no stable class, so they
// are found by their text and hidden.
globalThis.net19Theme = {};
(() => {
  const READ = /^\s*\d+\s+min\s+read\s*$/i;
  const fix = () => {
    for (const p of document.querySelectorAll('.story-wrapper p:not([data-net19-hidden])')) {
      if (!p.firstElementChild && READ.test(p.textContent || '')) p.setAttribute('data-net19-hidden', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
