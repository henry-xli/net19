// net19 handmade theme: Twitch before the September 2019 rebrand, light and dark. Twitch marks its dark theme
// with html.tw-root--theme-dark. The fixed "Join the Twitch community!" sign-up bar (no stable class) is hidden by its
// text; 2019 had no such bar.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('tw-root--theme-dark') ? 'dark' : 'light',
  watch: ['class'],
};
(() => {
  const fix = () => {
    for (const callout of document.querySelectorAll('.tw-callout-message')) {
      const bar = callout.closest('article');
      if (bar && !bar.hasAttribute('data-net19-hidden') && /Join the Twitch community/i.test(callout.textContent || '')) bar.setAttribute('data-net19-hidden', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
