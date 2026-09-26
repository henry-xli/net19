// net19 handmade theme: Facebook, 2019 ("classic"), light and dark. Facebook marks its dark mode with
// html.__fb-dark-mode; its whole interface is drawn from the variables mapped in facebook.css.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('__fb-dark-mode') ? 'dark' : 'light',
  watch: ['class'],
  // Controls that arrived after 2019 (guard.js hides them by label): Reels (2020/2021), Feeds (2022), Meta AI and
  // Imagine (2023/2024), Meta Verified (2023), Professional dashboard (2021), avatar stickers (2020), the grid "Menu"
  // (FB5, 2020) and the Memories hub that replaced "On This Day".
  later: /^(?:reels?|reels and short videos|watch reels|create reel|feeds|meta ai|ask meta ai|imagine(?: me| with meta ai)?|meta verified|get meta verified|professional dashboard|memories|avatars?|create (?:your )?avatar|edit avatar|avatar stickers?|comment with an avatar sticker|menu|meta quest|climate science center|ai info|made with ai)$/i,
};
// The signed-out landing page has only generated class names, so its parts are found from the login form and
// marked with data-n19-fb for facebook.css: the two columns, the login card and its buttons. The 2019 wording of
// the headline and buttons is put back in the existing text nodes.
(() => {
  const WORDS = new Map([['Explore the things ', 'Connect with friends and the world around you on Facebook.'], ['you love', ''],
    ['Log in', 'Log In'], ['Forgot password?', 'Forgot account?'], ['Create new account', 'Create New Account'],
    ['Email or mobile number', 'Email or Phone Number']]);
  const mark = (el, name) => { if (el && el.getAttribute('data-n19-fb') !== name) el.setAttribute('data-n19-fb', name); };
  const words = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const to = WORDS.get(node.nodeValue);
      if (to !== undefined) {
        node.nodeValue = to;
        // "Explore the things <span>you love</span>." : the trailing period goes with the old headline
        if (to.startsWith('Connect') && node.parentNode.lastChild?.nodeValue === '.') node.parentNode.lastChild.nodeValue = '';
      }
    }
  };
  const landing = () => {
    const form = document.getElementById('login_form');
    if (!form || !form.querySelector('input[name="pass"]')) return;
    let row = form.parentElement;
    while (row && row !== document.body && !row.querySelector('img')) row = row.parentElement;
    if (!row || row === document.body) return;
    mark(row, 'row');
    for (const col of row.children) mark(col, col.contains(form) ? 'login' : col.querySelector('img') ? 'hero' : 'rule');
    const card = form.parentElement?.parentElement;
    if (card && row.contains(card)) {
      mark(card, 'card');
      for (const part of card.children) if (!part.contains(form)) mark(part, 'title');
    }
    // The footer (its own role="main" block) and the band above it are the two children of their common ancestor.
    const main = [...document.querySelectorAll('[role="main"]')].find(m => !m.contains(form) && !row.contains(m));
    let foot = main;
    while (foot?.parentElement && !foot.parentElement.contains(row)) foot = foot.parentElement;
    if (foot?.parentElement) { mark(foot, 'foot'); mark([...foot.parentElement.children].find(c => c.contains(row)), 'top'); }
    words(row);
  };

  // ---- The app (signed in, and signed-out public pages) --------------------------------------------------------
  // Facebook's class names are generated, so the 2019 parts are found from roles, labels and text and marked with
  // data-n19-fb: the FB5 center tabs in the bar, the post cards, the Like/Comment/Share buttons, the composer, the
  // home feed column and post-2019 trays and shortcuts.
  const TABS = /^(?:home|watch|video|reels|marketplace|groups|gaming|friends|news|feeds|pages)(?:,.*)?$/i;
  const LATER_HREF = /(?:^|\/\/[^/]*facebook\.com)\/(?:reel|reels|professional_dashboard|feeds|memories|imagine|meta_verified|metaverified|ai_studio|gaming\/play)(?:[/?]|$)|meta\.ai/i;
  const ACTIONS = /^(?:Like|Comment|Share|Send)$/;
  const inComment = el => el.closest('[role="article"][aria-label^="Comment by"], [role="article"][aria-label^="Reply by"]');
  const surface = el => { const s = getComputedStyle(el); return s.boxShadow !== 'none' || (s.backgroundColor !== 'rgba(0, 0, 0, 0)' && parseFloat(s.borderTopLeftRadius) > 0); };
  const seen = new WeakSet();
  const app = () => {
    const banner = document.querySelector('div[role="banner"]');
    if (!!banner !== document.documentElement.hasAttribute('data-n19-bar')) document.documentElement.toggleAttribute('data-n19-bar', !!banner);
    if (banner) {
      // The bar is drawn in two fixed layers (a colored backdrop, and the logo, search and buttons over it); when the
      // page is flipped for the device's mode both are kept as drawn, so the white glyphs stay white on the blue bar.
      // Each layer is kept itself (not the banner, which is static): a filter on the banner would make it a stacking
      // context below the page, and the page would take the clicks meant for the bar.
      for (const layer of banner.children) {
        const s = getComputedStyle(layer);
        if (s.position !== 'static' && s.zIndex !== 'auto' && !layer.hasAttribute('data-net19-keep')) layer.setAttribute('data-net19-keep', '');
      }
      for (const input of banner.querySelectorAll('input[type="search"], input[role="combobox"]')) {
        if (/^Search Facebook$/i.test(input.placeholder)) input.placeholder = 'Search';
      }
      // The FB5 tab strip in the middle of the bar: links named Home / Video / Marketplace / Groups / Gaming.
      const accounts = banner.querySelector('[role="navigation"][aria-label*="Account" i]');
      for (const link of banner.querySelectorAll('a[aria-label][href]')) {
        if (accounts?.contains(link) || link.getAttribute('aria-label') === 'Facebook' || !TABS.test(link.getAttribute('aria-label'))) continue;
        const item = link.closest('li') || link.parentElement;
        mark(item, 'tab');
      }
    }
    // Post cards: the first drawn surface inside each feed unit gets the 2019 border.
    for (const unit of document.querySelectorAll('[role="feed"] > div, [data-pagelet^="FeedUnit"], [data-pagelet^="ProfileTimeline"] > div, [data-pagelet="GroupFeed"] > div, [aria-posinset]')) {
      if (seen.has(unit)) continue;
      if (!unit.offsetHeight) continue;
      seen.add(unit);
      let found = null;
      const walk = (el, depth) => {
        if (found || depth > 9) return;
        for (const child of el.children) { if (found) return; if (child.offsetWidth > 300 && surface(child)) { found = child; return; } walk(child, depth + 1); }
      };
      walk(unit, 0);
      if (found && !found.closest('[data-n19-fb="post"]')) mark(found, 'post');
      // Reels trays ("Reels and short videos", 2021) inside the feed
      const reels = unit.querySelectorAll('a[href*="/reel/"]').length;
      const heading = unit.querySelector('h3, h2, [role="heading"]')?.textContent.trim() || '';
      if (reels >= 2 && (/^reels\b/i.test(heading) || reels >= 3)) mark(unit, 'later');
    }
    // Like / Comment / Share (posts only; comments keep their small links)
    for (const button of document.querySelectorAll('[role="button"]:not([data-n19-fb])')) {
      const text = button.textContent.trim();
      if (text.length > 8 || !ACTIONS.test(text) || inComment(button)) continue;
      mark(button, 'action');
    }
    // The composer: "What's on your mind?" and the card it sits in, headed "Create Post"
    for (const span of document.querySelectorAll('[role="main"] [role="button"] span')) {
      if (!/^What.s on your mind/.test(span.textContent)) continue;
      const pill = span.closest('[role="button"]');
      if (!pill || pill.hasAttribute('data-n19-fb')) continue;
      mark(pill, 'composer');
      let card = pill.parentElement;
      while (card && card !== document.body && !card.classList.contains('xquyuld') && !(getComputedStyle(card).boxShadow !== 'none')) card = card.parentElement;
      if (card && card !== document.body) {
        mark(card, 'composer-card');
        const inner = card.firstElementChild;
        if (inner && !card.querySelector('[data-n19-fb="create-head"]')) {
          const head = document.createElement('div');
          head.setAttribute('data-n19-fb', 'create-head');
          head.textContent = 'Create Post';
          inner.prepend(head);
        }
      }
    }
    // Home: the 500px feed column (the widest ancestor of the feed that is still only the feed column)
    if (location.pathname === '/' || location.pathname === '/home.php') {
      const feed = document.querySelector('[role="main"] [role="feed"]');
      if (feed && !feed.closest('[data-n19-fb="column"]')) {
        const main = feed.closest('[role="main"]');
        let col = feed;
        for (let up = feed.parentElement; up && up !== main && Math.abs(up.offsetWidth - feed.offsetWidth) < 3; up = up.parentElement) col = up;
        if (col.offsetWidth >= 490 && col.offsetWidth <= 760) mark(col, 'column');
      }
    }
    // Left nav rows: a link holding an icon (a picture, a sprite or a glyph, often in a gray circle) and a label
    for (const row of document.querySelectorAll(':is([data-pagelet="LeftRail"], [data-pagelet="LeftNav"], [role="navigation"][aria-label="Shortcuts"]) :is(a[href], a[role="link"], [role="button"]):not([data-n19-fb])')) {
      const icon = row.querySelector('img, i[data-visualcompletion="css-img"], i[style*="background-image"], svg');
      if (!icon || !row.textContent.trim() || row.offsetHeight < 30 || row.offsetWidth < 220 || row.closest('[data-n19-fb="navrow"]')) continue;
      const first = row.firstElementChild?.firstElementChild;
      if (!first || !first.contains(icon)) continue;   // the icon leads the row
      mark(row, 'navrow');
      mark(first, 'navicon-box');
      const size = icon.getBoundingClientRect();
      if (size.width >= 30 && size.height >= 30) mark(icon, 'navicon-big');
      for (let up = icon.parentElement; up && up !== first.parentElement; up = up.parentElement) {
        const s = getComputedStyle(up);
        const c = s.backgroundColor.match(/[\d.]+/g)?.map(Number);
        if (s.borderRadius.startsWith('50%') && c && (c[3] ?? 1) > 0) { mark(up, Math.max(c[0], c[1], c[2]) - Math.min(c[0], c[1], c[2]) > 60 ? 'navicon-dot' : 'navicon-circle'); break; }
      }
    }
    // Shortcuts and entries that did not exist in 2019 (left nav, bar, right column)
    for (const link of document.querySelectorAll(':is([data-pagelet="LeftRail"], [role="navigation"], [role="complementary"], div[role="banner"]) a[href]')) {
      if (!LATER_HREF.test(link.getAttribute('href'))) continue;
      mark(link.closest('li') || link, 'later');
    }
  };
  let queued = 0, last = 0;
  const run = () => { queued = 0; last = performance.now(); if (location.pathname === '/' || location.pathname.startsWith('/login')) landing(); app(); };
  const later = () => { if (queued) return; queued = setTimeout(() => requestAnimationFrame(run), Math.max(0, 300 - (performance.now() - last))); };
  const start = () => {
    run();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
