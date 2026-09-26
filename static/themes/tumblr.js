// net19 handmade theme: Tumblr, 2019. Tumblr had no dark mode or palettes in 2019: the navy dashboard is the design in
// both modes, so the theme always reports dark and is never flipped (tumblr.css pins every palette to the navy).
globalThis.net19Theme = {
  detect: () => 'dark',
  only: 'dark',
  watch: [],
  // Post-2019 controls, hidden by label: Communities (2023), Tumblr Live (2021-24), Blaze (2022), Tips (2021),
  // TumblrMart badges/checkmarks (2022), Post+ (2022), Premium and "Go Ad-Free" (2022), Patio, Saved, Custom Feeds (2025),
  // palettes (2020), domains (2021).
  later: /^(?:communities|browse communities|community posts|create new community|join community|tumblr live|live|go live|watch live|blaze|blaze this post|blaze post|blazed|blaze it|tip|tips|send a tip|tip this post|tumblrmart|badges|get badges|shop badges|post\+|subscribe with post\+|tumblr premium|get premium|try premium|go ad-free.*|ad-free browsing|remove ads|get a domain|domains|patio|saved|custom feeds|change palette|palettes?)$/i,
};
(() => {
  const RENAME = new Map([['Trending Blogs', 'Recommended Blogs'], ['Check out these blogs', 'Recommended Blogs'], ['Check these out', 'Recommended Blogs']]);
  const PROMO = /Tumblr Premium|Go Ad-Free|Ad-Free Browsing|\bPost\+|TumblrMart/;
  const count = text => {
    const m = String(text || '').trim().replace(/,/g, '').match(/^([\d.]+)\s*([KMB]?)$/i);
    if (!m) return null;
    return { n: parseFloat(m[1]) * ({ '': 1, k: 1e3, m: 1e6, b: 1e9 }[m[2].toLowerCase()]), exact: !m[2] };
  };
  const format = (n, exact) => exact ? n.toLocaleString('en-US') : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M' : (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'K';
  // 2019's footer said "1,234 notes"; today's split reply/reblog/like counts add up to that.
  const notes = footer => {
    if ([...footer.querySelectorAll('button, a')].some(b => /\bnotes?\s*$/i.test(b.textContent))) { footer.removeAttribute('data-n19-notes'); return; }
    let total = 0, exact = true, any = false;
    for (const b of footer.querySelectorAll('button[aria-label="Comment"], button[aria-label="Reply"], button[aria-label="Reblog"], button[aria-label="Like"]')) {
      const span = b.querySelector(':scope > span + span');
      const c = span && count(span.textContent);
      if (!c) continue;
      total += c.n; exact = exact && c.exact; any = true;
    }
    const text = any && total > 0 ? `${format(total, exact)} ${total === 1 ? 'note' : 'notes'}` : '';
    if (!text) { if (footer.hasAttribute('data-n19-notes')) footer.setAttribute('data-n19-notes', ''); if (!footer.querySelector('button[aria-label="Like"]')) footer.removeAttribute('data-n19-notes'); return; }
    if (footer.getAttribute('data-n19-notes') !== text) footer.setAttribute('data-n19-notes', text);
  };
  const fix = () => {
    for (const footer of document.querySelectorAll('footer[aria-label="Post footer"]')) notes(footer);
    // the sidebar list was "Recommended Blogs"
    for (const list of document.querySelectorAll('aside ul[aria-label]')) {
      const head = list.parentElement?.querySelector(':scope > div:first-child') || list.previousElementSibling;
      const to = head && !head.querySelector('*') && RENAME.get(head.textContent.trim());
      if (to) head.textContent = to;
    }
    // house promos for Premium and the shop in the right column
    for (const block of document.querySelectorAll('aside > div > div, aside > div')) {
      if (block.hasAttribute('data-net19-hidden') || block.querySelector('input, textarea, [contenteditable], ul[aria-label]')) continue;
      if (PROMO.test(block.textContent || '')) block.setAttribute('data-net19-hidden', '');
    }
    // "Blazed" labels on promoted posts (2022)
    for (const el of document.querySelectorAll('article header span, article header div')) {
      if (!el.firstElementChild && /^\s*Blazed\s*$/i.test(el.textContent) && !el.hasAttribute('data-net19-hidden')) el.setAttribute('data-net19-hidden', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
