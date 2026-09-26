// net19 handmade theme: amazon. The site has a single (light) design, so the light palette applies and dark devices
// get the engine's inverted page. The 2019 nav wording is restored in place: the later "All" menu button reads
// "Departments", "Hello, sign in" is "Hello, Sign in", and "Delivering to" is "Deliver to".
globalThis.net19Theme = {};
(() => {
  const WORDS = [['#nav-hamburger-menu .hm-icon-label', /^\s*All\s*$/, 'Departments'], ['#nav-link-accountList-nav-line-1', /^Hello, sign in$/, 'Hello, Sign in'],
    ['#glow-ingress-line1', /^(\s*)Delivering to\b/, '$1Deliver to']];
  const fix = () => {
    for (const [selector, from, to] of WORDS) {
      const el = document.querySelector(selector);
      const text = el?.firstChild;
      if (text?.nodeType === 3 && from.test(text.data)) text.data = text.data.replace(from, to);
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    const nav = document.getElementById('navbar');
    if (nav) new MutationObserver(later).observe(nav, { childList: true, subtree: true, characterData: true });
  };
  if (document.readyState !== 'loading') start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
