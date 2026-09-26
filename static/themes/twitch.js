// net19 handmade theme: Twitch before the September 2019 rebrand, light and dark. Twitch marks its dark theme
// with html.tw-root--theme-dark. Small DOM fixes bring back the 2019 page: the top bar's Esports and Music links next to
// Browse, the side bar's "Recommended Channels" heading (signed out) instead of "Live Channels", and no hype-train line
// on side-bar cards. The fixed "Join the Twitch community!" sign-up bar (no stable class) is hidden by its text.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('tw-root--theme-dark') ? 'dark' : 'light',
  watch: ['class'],
  // Post-2019 entry points, by label: stories (2024), the discovery and clips feeds (2023–24), Guest Star (2022),
  // Hype Chat (2023).
  later: /^(?:stories|create a story|view stories|discovery feed|try the discovery feed|clips feed|watch clips feed|shorts|guest star|request to join|hype chat|send a hype chat)$/i,
};
(() => {
  const links = () => {
    const browse = document.querySelector('nav.top-nav a[data-a-target="browse-link"]');
    const item = browse?.parentElement;
    if (!item || item.parentElement.querySelector('[data-net19-link]')) return;
    let after = item;
    for (const [label, href] of [['Esports', '/directory/esports'], ['Music', '/directory/music']]) {
      const copy = item.cloneNode(true);
      const a = copy.querySelector('a');
      if (!a) return;
      a.href = href; a.setAttribute('aria-label', label); a.setAttribute('data-net19-link', ''); a.removeAttribute('data-a-target'); a.removeAttribute('data-test-selector'); a.classList.remove('active');
      for (const p of a.querySelectorAll('p')) p.textContent = label;
      for (const d of a.querySelectorAll('[aria-label]')) d.setAttribute('aria-label', label);
      copy.setAttribute('data-net19-link', '');
      after.after(copy); after = copy;
    }
  };
  const fix = () => {
    for (const callout of document.querySelectorAll('.tw-callout-message')) {
      const bar = callout.closest('article');
      if (bar && !bar.hasAttribute('data-net19-hidden') && /Join the Twitch community/i.test(callout.textContent || '')) bar.setAttribute('data-net19-hidden', '');
    }
    for (const h of document.querySelectorAll('.side-nav-header h2, .side-nav-header h3')) {
      if (!h.children.length && h.textContent.trim() === 'Live Channels') h.textContent = 'Recommended Channels';
    }
    for (const card of document.querySelectorAll('.side-nav-card')) {
      for (const p of card.querySelectorAll('p, span')) {
        if (!p.hasAttribute('data-net19-hidden') && /^(?:Shared |Community )?(?:Hype|Mythic|Community|Golden Kappa|Treasure) Train\b/.test(p.textContent.trim())) {
          const row = p.parentElement;
          (row && !row.querySelector('[data-a-target="side-nav-title"], [data-a-target="side-nav-card-metadata"], img') ? row : p).setAttribute('data-net19-hidden', '');
        }
      }
    }
    links();
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
