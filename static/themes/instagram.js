// net19 handmade theme: Instagram, 2019. Instagram follows the device theme unless changed in its settings;
// it marks the result with a __ig-dark-mode / __ig-light-mode class (__fb-dark-mode / __fb-light-mode on the
// logged-out page) when present.
globalThis.net19Theme = {
  detect() {
    const classes = document.documentElement.classList;
    if (classes.contains('__ig-dark-mode') || classes.contains('__fb-dark-mode')) return 'dark';
    if (classes.contains('__ig-light-mode') || classes.contains('__fb-light-mode')) return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  watch: ['class'],
  // Controls that arrived after 2019 (guard.js hides them by label): Reels (2020), Shop (2020), the "Create" entry of
  // the 2021 navigation, Threads (2023), Notes (2022), broadcast channels (2023), Meta AI (2024), Meta Verified and
  // subscriptions (2022/2023), "Also from Meta", remixes and templates (2021/2022) and "Edited" labels (2023).
  later: /^(?:reels|threads|meta ai|ask meta ai|shop|create|new post|notes?|your note|leave a note|broadcast channels?|channels|subscribe|subscriptions?|meta verified|also from meta|remix|use template|use audio|original audio|edited|suggested reels)$/i,
  keepLabels: /^(?:create new account|sign up|log in)$/i,
};
(() => {
  const mark = (el, name) => { if (el && el.getAttribute('data-n19-ig') !== name) el.setAttribute('data-n19-ig', name); };

  // ---- Logged-out home: the page is built from atomic class names only, so its parts are found from the login form
  // and marked with data-n19-ig for the stylesheet: the two-column row, its left (pictures) and right (form) columns
  // and the rule between them, the white box around the heading and form, and the buttons below the fields.
  const landing = () => {
    const form = document.querySelector('form#login_form');
    if (!form || !form.isConnected) return;
    const picture = form.closest('body')?.querySelector('img');
    let row = form.parentElement;
    while (row && row !== document.body && !(picture && row.contains(picture) && row.children.length >= 2)) row = row.parentElement;
    if (row && row !== document.body) {
      mark(row, 'row-login');
      const [left, rule, right] = row.children;
      if (row.children.length === 3) { mark(left, 'left'); mark(rule, 'rule'); mark(right, 'right'); }
      for (let page = row.parentElement; page && page !== document.body; page = page.parentElement) {
        if (page.parentElement?.id?.startsWith('mount_')) { mark(page, 'page'); break; }
      }
      const headline = left?.querySelector('span span')?.parentElement;
      if (headline && !headline.querySelector('img')) mark(headline, 'headline');
    }
    for (let b = form.parentElement; b && b !== row; b = b.parentElement) {
      if (b.previousElementSibling || b.parentElement?.children.length > 1) { mark(b.parentElement, 'box'); break; }
    }
    const buttons = form.querySelectorAll('[role="button"]');
    mark(buttons[0], 'login');
    if (buttons[1]) mark(buttons[1], 'facebook');
    mark(form.querySelector('a[href*="/accounts/emailsignup"]'), 'signup');
    mark(form.querySelector('a[href*="/accounts/password/reset"]'), 'forgot');
    const meta = form.querySelector('svg[aria-label="Meta logo"]') || document.querySelector('[data-n19-ig="right"] svg[aria-label="Meta logo"]');
    mark(meta?.parentElement, 'meta');
  };

  // ---- The app: the navigation rail, the logged-out bar, feed posts, the profile tabs and grid --------------------
  const LATER_ICONS = ['Reels', 'Threads', 'New post', 'Meta AI', 'Also from Meta', 'Shop', 'Notes', 'Broadcast channel', 'Channels'];
  const clickable = el => el.closest('a, [role="link"], [role="button"], button') || el;
  const app = () => {
    // The 2022 navigation: the fixed column holding the Home and Explore links.
    const home = document.querySelector('a[href="/"] svg[aria-label="Home"], svg[aria-label="Home"]');
    if (home && !document.querySelector('[data-n19-ig="rail"]')) {
      for (let up = home.parentElement; up && up !== document.body; up = up.parentElement) {
        const s = getComputedStyle(up);
        if ((s.position === 'fixed' || s.position === 'sticky') && up.offsetHeight > innerHeight * .6 && up.offsetWidth < 400) { mark(up, 'rail'); break; }
      }
    }
    for (const label of LATER_ICONS) {
      for (const svg of document.querySelectorAll(`svg[aria-label="${label}"]`)) {
        if (svg.closest('main [role="tablist"]') && label !== 'Reels') continue;
        const item = clickable(svg);
        if (item !== svg && !item.closest('[data-n19-ig="later"]')) mark(item, 'later');
      }
    }
    // Logged out: the top bar is the row holding the Log In / Sign Up links above main.
    const login = document.querySelector('a[href^="/accounts/login"][role="link"]:not(main a, footer a)');
    if (login && !document.querySelector('[data-n19-ig="bar"]')) {
      for (let up = login.parentElement; up && up !== document.body; up = up.parentElement) {
        if (up.offsetWidth >= innerWidth - 20 && up.offsetHeight < 90 && getComputedStyle(up).backgroundColor !== 'rgba(0, 0, 0, 0)') { mark(up, 'bar'); break; }
      }
    }
    // Feed posts: the column is widened to 614px when the post's picture fills the post.
    const article = document.querySelector('main article');
    if (article && !document.querySelector('[data-n19-ig="feedcol"]') && location.pathname === '/') {
      const img = [...article.querySelectorAll('img')].sort((a, b) => b.offsetWidth - a.offsetWidth)[0];
      if (img && img.offsetWidth >= article.offsetWidth - 4) {
        let col = article;
        for (let up = article.parentElement; up && up.tagName !== 'MAIN' && Math.abs(up.offsetWidth - article.offsetWidth) < 3; up = up.parentElement) col = up;
        if (col !== article) mark(col, 'feedcol');
      }
    }
    // Inside a bordered post, the header, icons, likes, caption and comment rows get the 2019 16px side padding;
    // the picture (the part holding the widest image) stays edge to edge.
    for (const post of document.querySelectorAll('main article:not([data-n19-ig])')) {
      const width = post.offsetWidth, media = [...post.querySelectorAll('img, video')].filter(m => m.offsetWidth >= width * .9);
      if (!width || !media.length) continue;
      post.setAttribute('data-n19-ig', 'post');
      const walk = (el, depth) => {
        for (const child of el.children) {
          if (media.some(m => child.contains(m))) { if (depth < 12 && !media.includes(child)) walk(child, depth + 1); }
          else if (child.offsetWidth >= width - 4 && child.offsetHeight) mark(child, 'pad');
        }
      };
      walk(post, 0);
    }
    // The time under a post (small) becomes the 2019 uppercase stamp; the "Add a comment…" row and its "Post" button.
    for (const time of document.querySelectorAll('main time:not([data-n19-ig]), [role="dialog"] article time:not([data-n19-ig])')) {
      if (parseFloat(getComputedStyle(time).fontSize) <= 12.5) mark(time.closest('a') || time, 'stamp');
      else time.setAttribute('data-n19-ig', 'time');
    }
    for (const area of document.querySelectorAll('textarea[aria-label^="Add a comment"]:not([data-n19-ig])')) {
      area.setAttribute('data-n19-ig', 'field');
      const form = area.closest('form');
      if (form) {
        mark(form, 'addrow');
        for (const b of form.querySelectorAll('[role="button"], button[type="submit"]')) if (/^Post$/i.test(b.textContent.trim())) mark(b, 'post-button');
      }
    }
    // "Edited" labels (2023) and the Notes bubble over profile pictures (2022)
    for (const span of document.querySelectorAll('main span:not([data-n19-ig]):not(:has(*))')) {
      const t = span.textContent.trim();
      if (t === 'Edited' || t === '· Edited' || t === 'Note...' || t === 'Your note') mark(span, 'later');
    }
    // Profile tabs: uppercase labels after 12px icons; the Reels tab goes (IGTV was the 2019 video tab).
    for (const tab of document.querySelectorAll('main [role="tablist"] a:not([data-n19-ig])')) {
      const svg = tab.querySelector('svg[aria-label]');
      const name = svg?.getAttribute('aria-label') || '';
      if (/^reels$/i.test(name) || /\/reels\/?$/.test(tab.getAttribute('href') || '')) { mark(tab.parentElement?.children.length === 1 ? tab.parentElement : tab, 'later'); continue; }
      tab.setAttribute('data-n19-ig', 'tab');
      if (name && !tab.querySelector('[data-n19-ig="tablabel"]')) {
        const text = document.createElement('span');
        text.setAttribute('data-n19-ig', 'tablabel');
        text.textContent = name.toUpperCase();
        (svg.parentElement || tab).after(text);
      }
    }
    // Profile grid: squares in rows (or grids) with 28px gaps. Tall Explore tiles (spanning two rows) keep their shape.
    if (document.querySelector('main header') || location.pathname.startsWith('/explore')) {
      for (const link of document.querySelectorAll('main a[href*="/p/"]:not([data-n19-ig]), main a[href*="/reel/"]:not([data-n19-ig])')) {
        if (!link.querySelector('img')) continue;
        link.setAttribute('data-n19-ig', 'tile');
        const tile = link.parentElement, row = tile?.parentElement;
        if (!row) continue;
        const display = getComputedStyle(row).display;
        if (display === 'flex' && row.children.length >= 2 && row.children.length <= 4) mark(row, 'row');
        else if (display === 'grid') mark(row, 'grid');
        const box = link.getBoundingClientRect();
        if (box.height > box.width * 1.5) continue;
        for (const d of link.querySelectorAll('div')) {
          const pad = parseFloat(getComputedStyle(d).paddingBottom);
          if (pad > box.width * .5) { mark(d, 'ratio'); break; }
        }
        if (!link.querySelector('[data-n19-ig="ratio"]') && box.height > box.width * 1.05) mark(link, 'ratio-box');
      }
    }
  };
  let queued = 0, last = 0;
  const run = () => { queued = 0; last = performance.now(); landing(); app(); };
  const later = () => { if (queued) return; queued = setTimeout(() => requestAnimationFrame(run), Math.max(0, 250 - (performance.now() - last))); };
  const start = () => { run(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
