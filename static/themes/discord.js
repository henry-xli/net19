// net19 handmade theme: Discord, 2019. The app marks its theme with classes on <html> (theme-light, theme-dark and the
// later theme-darker / theme-midnight, which all read as dark); both the 2019 dark default and the light theme are
// restyled. The marketing pages have no theme class and were light in 2019.
globalThis.net19Theme = {
  detect: () => {
    const list = document.documentElement.classList;
    if (list.contains('theme-light')) return 'light';
    if (list.contains('theme-dark') || list.contains('theme-darker') || list.contains('theme-midnight')) return 'dark';
    // The marketing pages (Webflow, no theme class) are drawn light: white bands under a blurple hero, as in 2019.
    return document.documentElement.hasAttribute('data-wf-site') ? 'light' : null;
  },
  watch: ['class'],
  // The sign-in, register and invite screens were always the dark box on the illustrated blue backdrop in 2019,
  // whatever the app theme, so they are never flipped.
  only: () => /^\/(?:login|register|invite\/|gift\/|reset|verify|activate|oauth2\/authorize)/.test(location.pathname) ? 'dark' : undefined,
  // Controls added after 2019, hidden wherever they show up (menus, pickers, the "+" upload menu, home-page nav).
  later: /^(?:quests?|shop|discover|explore discoverable servers|start an activity|activities|apps|use apps|create poll|create thread|add super reaction|super reactions?|summaries|forward|server guide|browse channels|channels & roles|open gif picker|open sticker picker|record voice message|send voice message|set a server tag|server tags?|avatar decorations?|nameplates?|profile effects?)$/i,
};
// Home page (Webflow): the nav's "Discover" (2020) and "Quests" (2024) dropdowns are hidden by their titles, and the
// same entries in the burger menu. The blurple bands (hero, closing banner) stay blurple with white text when the page
// is shown flipped for a dark device, as brand-coloured bars do elsewhere.
(() => {
  if (!/^\/(?:$|download|nitro|safety|company|blog|careers|developers|servers|community)/.test(location.pathname)) return;
  const LATER = /^(?:discover|quests)$/i;
  const fix = () => {
    for (const title of document.querySelectorAll('.nav_menu .menu-title, .nav_dd .menu-title, .nav_burger .menu-title')) {
      if (!LATER.test(title.textContent.trim())) continue;
      const item = title.closest('li, .nav_dd');
      if (item && !item.hasAttribute('data-net19-hidden')) item.setAttribute('data-net19-hidden', '');
    }
    for (const band of document.querySelectorAll('.home--hero, .discord_banner')) if (!band.hasAttribute('data-net19-keep')) band.setAttribute('data-net19-keep', '');
  };
  const start = () => {
    fix();
    new MutationObserver(fix).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(() => requestAnimationFrame(fix)).observe(document.documentElement, { attributes: true, attributeFilter: ['data-net19-flip'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
