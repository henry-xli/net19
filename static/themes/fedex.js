// net19 handmade theme: FedEx, 2019. fedex.com has no dark mode; default detection keeps it light.
globalThis.net19Theme = {};
// The 2019 menu called today's "Design & Print" section "Printing Services".
(() => {
  const fix = () => {
    for (const span of document.querySelectorAll('.fxg-global-nav .fxg-dropdown-js > .fxg-mouse')) {
      const node = span.firstChild;
      if (node?.nodeType === 3 && node.textContent.trim() === 'Design & Print') node.textContent = ' Printing Services ';
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
