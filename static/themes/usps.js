// net19 handmade theme: USPS, 2019. usps.com has no dark mode; default detection keeps it light.
globalThis.net19Theme = {};
// The 2019 main menu read "Mail & Ship", "Track & Manage" and "Postal Store" where today's says "Send", "Receive" and "Shop".
(() => {
  const words = { Send: 'Mail & Ship', Receive: 'Track & Manage', Shop: 'Postal Store' };
  const fix = () => {
    for (const link of document.querySelectorAll('nav[aria-label="Main"] a.menuitem')) {
      for (const node of link.childNodes) {
        const text = node.nodeType === 3 ? node.textContent.trim() : '';
        if (words[text]) node.textContent = node.textContent.replace(text, words[text]);
      }
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
