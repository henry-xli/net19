// net19 handmade theme: Reddit on old.reddit.com. Old Reddit has no dark mode of its own, so the device's
// preference decides. Subreddit stylesheets are written for a white page; in dark mode they are set aside
// (as browser night-mode add-ons did in 2019) and restored when the device is light again.
(() => {
  const dark = matchMedia('(prefers-color-scheme: dark)');
  const mode = () => dark.matches ? 'dark' : 'light';
  globalThis.net19Theme = { detect: mode, watch: [] };
  // Decided at document_start, so the first paint already has the right palette.
  document.documentElement?.setAttribute('data-net19-mode', mode());
  const subreddit = () => {
    // Titled stylesheets are a "preferred set" that Chrome re-enables, so the media query is switched off instead.
    for (const sheet of document.querySelectorAll('link[title="applied_subreddit_stylesheet"], style[title="applied_subreddit_stylesheet"]')) {
      if (!sheet.hasAttribute('data-net19-media')) sheet.setAttribute('data-net19-media', sheet.getAttribute('media') || 'all');
      const media = dark.matches ? 'not all' : sheet.getAttribute('data-net19-media');
      if (sheet.getAttribute('media') !== media) sheet.setAttribute('media', media);
    }
  };
  const watch = new MutationObserver(subreddit);
  watch.observe(document, { childList: true, subtree: true });
  document.addEventListener('DOMContentLoaded', () => { subreddit(); watch.disconnect(); }, { once: true });
  dark.addEventListener?.('change', subreddit);
})();
