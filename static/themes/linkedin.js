// net19 handmade theme: LinkedIn, 2019, light and dark. LinkedIn marks dark mode with a theme--dark class.
globalThis.net19Theme = {
  detect: () => /(^|\s)theme--dark/.test(document.documentElement.className + ' ' + (document.body?.className || '')) ? 'dark' : 'light',
  watch: ['class'],
  // Post-2019 controls, by label: the AI writing and insight tools (2023–24), Games (2024), the Premium AI upsells,
  // newsletter subscriptions (2021), "Send" in a private message (2020). The video feed tab (2025) is hidden by its link in linkedin.css.
  later: /^(?:rewrite with ai|write with ai|draft with ai|improve with ai|polish with ai|start a post, try writing with ai|get ai-powered insights|ai-powered insights|premium ai insights|see ai insights|games|play games|today's puzzles|today’s puzzles|subscribe|send in a private message)$/i,
};
(() => {
  // The signed-out home page's headline changes with each campaign; in 2019 it read "Welcome to your professional
  // community". The heading's own text node is replaced in place, on the home page only.
  const WELCOME = 'Welcome to your professional community';
  const welcome = () => {
    const h1 = document.querySelector('main#main-content > section:first-child h1');
    if (!h1 || h1.children.length) return;
    const node = [...h1.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (node && node.nodeValue.trim() !== WELCOME) node.nodeValue = WELCOME;
  };
  // "Repost" (2023) was "Share" in 2019; the button's own text node is rewritten, its action is unchanged.
  const repost = () => {
    for (const span of document.querySelectorAll('.feed-shared-social-action-bar button span, .social-action-bar__button-text, .social-reshare-button span')) {
      if (span.children.length) continue;
      if (span.textContent.trim() === 'Repost') span.textContent = 'Share';
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; repost(); }); };
  const start = () => {
    if (location.pathname === '/' && !document.querySelector('.global-nav, #global-nav')) { welcome(); requestAnimationFrame(welcome); }
    repost();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
