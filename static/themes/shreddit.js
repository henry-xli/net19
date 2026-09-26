// net19 handmade theme: Reddit signed out (www.reddit.com), as the 2019 redesign, in light and night mode. Reddit
// marks dark mode with html.theme-dark. Posts, comment action rows and the search field draw inside shadow roots, which
// page stylesheets cannot reach, so the 2019 rules for them are added there: the vote arrows stacked in a gray column
// on the card's left edge, the gray bold "Comments Share Save" row, the plain 4px search field without the "Ask"
// pill or "Trending today". Small text fixes bring back 2019 wording: "Posted by u/name", "12 points", "5 hours ago",
// "123 Comments".
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light',
  watch: ['class'],
  // Post-2019 controls, by label: Chat (2023), Reddit Answers and the "Ask" search (2024–25), the app QR, avatar
  // builder and collectibles (2021–22), achievements (2024), Recap (2021), Reddit Pro and the contributor program (2023),
  // Advertise (2022), translations (2024).
  later: /^(?:open chat|chat|chats|start chat|answers|reddit answers|ask|ask reddit answers|new answers|get (?:the )?app|get the reddit app|scan (?:this|the) qr code.*|edit avatar|create avatar|style avatar|avatar|collectible avatars|collectibles|vault|achievements|view achievements|reddit recap|recap|reddit pro|try reddit pro(?:\s*beta)?|contributor program|earn|advertise on reddit|advertise|translate|translate to english|show original|view translation|translations?|see translation|auto-translate)$/i,
  keepLabels: /^(?:askreddit|r\/ask\w*)$/i,
};
(() => {
  const POST = `
    [data-testid="action-row"] { gap: 0 !important; height: 32px !important; margin: 0 0 0 -4px !important; }
    [data-testid="action-row"] > :is(a, button, span, slot) { margin: 0 !important; }
    [data-testid="action-row"] :is(a.button, button.button, .button):not([upvote]):not([downvote]) {
      background: transparent !important; border: 0 !important; border-radius: 2px !important; color: var(--n19-action) !important; font-weight: 700 !important;
      font-size: 12px !important; line-height: 16px !important; height: 32px !important; padding: 8px 4px !important; margin: 0 4px 0 0 !important; box-shadow: none !important; }
    [data-testid="action-row"] :is(a.button, button.button, .button):not([upvote]):not([downvote]):hover { background: var(--n19-hover) !important; }
    [data-testid="action-row"] :is(.rpl-cab--content, faceplate-number) { color: inherit !important; font-weight: 700 !important; font-size: 12px !important; }
    [data-testid="action-row"] .rpl-cab--leading-icon svg { width: 20px !important; height: 20px !important; }
    /* The vote column: arrows and score stacked on the gray strip at the card's left edge */
    [data-testid="action-row"] > span:has(shreddit-vote-animations) { position: absolute !important; left: 0 !important; top: 0 !important; width: 40px !important; height: auto !important;
      padding: 8px 0 0 !important; box-sizing: border-box !important; background: transparent !important; border: 0 !important; z-index: 1 !important; }
    .rpl-vote-button-group { flex-direction: column !important; height: auto !important; background: transparent !important; border: 0 !important; padding: 0 !important; gap: 0 !important; width: 40px !important; }
    .rpl-vote-button-group > span { font-size: 12px !important; font-weight: 700 !important; line-height: 16px !important; color: var(--n19-text) !important; text-transform: lowercase !important; margin: 2px 0 !important; pointer-events: none; }
    .rpl-vote-button-group button { height: 24px !important; width: 24px !important; min-height: 0 !important; background: transparent !important; color: var(--n19-action) !important; border-radius: 2px !important; }
    .rpl-vote-button-group button:hover { background: var(--n19-hover) !important; }
    .rpl-vote-button-group button[upvote]:hover { color: var(--n19-up) !important; }
    .rpl-vote-button-group button[downvote]:hover { color: var(--n19-down) !important; }
    .rpl-vote-button-group button > span { margin: 0 !important; }
    button[upvote][aria-pressed="true"] { color: var(--n19-up) !important; }
    button[downvote][aria-pressed="true"] { color: var(--n19-down) !important; }
    .rpl-vote-button-group:has(button[upvote][aria-pressed="true"]) > span { color: var(--n19-up) !important; }
    .rpl-vote-button-group:has(button[downvote][aria-pressed="true"]) > span { color: var(--n19-down) !important; }
    h2.condensed-post-title-heading, h1 { margin: 0 0 8px !important; }
    slot[name="post-stats-entry-point"], slot[name="post-insights-panel"] { display: none !important; }
    award-button [data-n19-count], award-button .award-count { display: none !important; }
  `;
  // On the post page the column is not a gray strip: 2019 drew the arrows on the white card itself.
  const PDP = `[data-testid="action-row"] > span:has(shreddit-vote-animations) { top: 8px !important; }`;
  const COMMENT = `
    .rpl-vote-button-group { background: transparent !important; border: 0 !important; }
    .rpl-vote-button-group > span { font-size: 12px !important; font-weight: 700 !important; color: var(--n19-text) !important; text-transform: lowercase !important; }
    .rpl-vote-button-group button { background: transparent !important; color: var(--n19-action) !important; border-radius: 2px !important; }
    .rpl-vote-button-group button:hover { background: var(--n19-hover) !important; }
    button[upvote][aria-pressed="true"] { color: var(--n19-up) !important; }
    button[downvote][aria-pressed="true"] { color: var(--n19-down) !important; }
    slot[name="comment-insight"], slot[name="comment-share-as-post-topline"] { display: none !important; }
  `;
  const AWARD = `.glow, .rpl-cab--content { display: none !important; } button { background: transparent !important; border: 0 !important; padding: 4px !important; }`;
  const FIELD = `.label-container, [part="container"] { border-radius: 4px !important; }`;
  // Slotted comment buttons live in the page, so they are styled there (see ACTIONS below).
  const SEARCH = `
    .reddit-search-bar { background: var(--n19-field) !important; border: 1px solid var(--n19-field-border) !important; border-radius: 4px !important; box-shadow: none !important; }
    .reddit-search-bar:hover, .reddit-search-bar:focus-within { background: var(--n19-card) !important; border-color: var(--n19-blue) !important; }
    faceplate-search-input { height: 34px !important; }
    .leadingIcon > slot > svg, .leadingIcon > slot::slotted(svg) { visibility: hidden !important; }
    .leadingIcon { background: no-repeat center / 18px 18px url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20'%3E%3Ccircle cx='8.5' cy='8.5' r='5.8' fill='none' stroke='%23878a8c' stroke-width='1.8'/%3E%3Cpath d='M12.8 12.8l4.4 4.4' stroke='%23878a8c' stroke-width='1.8' stroke-linecap='round'/%3E%3C/svg%3E") !important; }
    .centered-placeholder { display: none !important; }
    /* The expanded 2024 composer: its snoo icon and its footer (the "Ask" AI pill and a send button) */
    faceplate-search-input > [slot="leadingIcon"] { visibility: hidden !important; width: 18px !important; }
    faceplate-search-input > [slot="footer"] { display: none !important; }
    form.rounded-5, .rounded-5 { border-radius: 4px !important; }
    input, textarea { text-align: left !important; color: var(--n19-text) !important; font-family: var(--n19-font) !important; font-size: 14px !important; }
    input::placeholder, textarea::placeholder { color: var(--n19-action) !important; text-align: left !important; }
    .expanded-composer-ask-pill, .expanded-composer-ask-pill--ai, [class*="ask-tab"], #reddit-trending-searches-partial-container, #reddit-suggested-search-queries-container,
    .search-answers-carousel, [class*="answers-carousel"] { display: none !important; }
    rpl-tooltip:has(.expanded-composer-ask-pill) { display: none !important; }
  `;
  const styled = new WeakSet();
  const add = (root, css) => { if (!root || styled.has(root)) return; styled.add(root); const node = document.createElement('style'); node.textContent = css; root.append(node); };
  const deep = (root, css) => { for (const host of root.querySelectorAll('*')) if (host.shadowRoot) { add(host.shadowRoot, css); deep(host.shadowRoot, css); } };

  // "5 hr. ago" / "5h ago" -> "5 hours ago", as 2019 wrote it.
  const UNITS = { s: 'second', sec: 'second', m: 'minute', min: 'minute', h: 'hour', hr: 'hour', d: 'day', day: 'day', w: 'week', wk: 'week', mo: 'month', y: 'year', yr: 'year' };
  const longTime = text => text.replace(/^(\d+)\s*(s|sec|m|min|h|hr|d|day|w|wk|mo|y|yr)s?\.?\s+ago$/i, (_, n, u) => `${n} ${UNITS[u.toLowerCase()]}${n === '1' ? '' : 's'} ago`);
  const times = scope => {
    for (const el of scope.querySelectorAll('faceplate-timeago time, faceplate-timeago:not(:has(time))')) {
      for (const node of el.childNodes) if (node.nodeType === 3 && node.nodeValue.trim()) { const t = longTime(node.nodeValue.trim()); if (t !== node.nodeValue.trim()) node.nodeValue = t; }
    }
  };
  const pretty = n => n >= 1e5 ? Math.round(n / 1e3) + 'k' : n >= 1e4 ? (n / 1e3).toFixed(1).replace(/\.0$/, '') + 'k' : String(n);
  const mark = (el, attr, text, where) => { const s = document.createElement('span'); s.setAttribute(attr, ''); s.textContent = text; where(s); return s; };

  const scan = () => {
    for (const post of document.querySelectorAll('shreddit-post, shreddit-ad-post')) {
      if (post.shadowRoot) { add(post.shadowRoot, POST + (post.getAttribute('view-context') === 'CommentsPage' ? PDP : '')); }
      // "Posted by u/name" before the time, as the 2019 card read
      const author = post.getAttribute('author');
      const bar = post.querySelector(':scope > [slot="credit-bar"] [id^="feed-post-credit-bar"]');
      const community = bar?.querySelector('a[data-testid="subreddit-name"]');
      // In a subreddit's own feed the first link is already the author: "Posted by" goes before it
      if (community && /^\s*u\//.test(community.textContent) && !bar.querySelector('[data-n19-posted]') && post.tagName === 'SHREDDIT-POST') {
        mark(bar, 'data-n19-posted', 'Posted by', s => community.closest('span.flex, faceplate-hovercard')?.before(s));
      }
      if (author && bar && community && /^\s*r\//.test(community.textContent) && !bar.querySelector('[data-n19-posted]') && post.tagName === 'SHREDDIT-POST') {
        const time = bar.querySelector(':scope > faceplate-timeago');
        if (time) {
          const posted = document.createElement('span'); posted.setAttribute('data-n19-posted', '');
          posted.append('Posted by ');
          const a = document.createElement('a'); a.href = `/user/${encodeURIComponent(author)}/`; a.textContent = `u/${author}`; a.style.position = 'relative';
          posted.append(a);
          time.before(posted);
        }
      }
      const pdp = post.querySelector(':scope > #pdp-credit-bar [slot="authorName"]');
      if (pdp && !pdp.querySelector('[data-n19-posted]')) mark(pdp, 'data-n19-posted', 'Posted by u/', s => pdp.prepend(s));
      // "2.1K" -> "2.1k Comments"
      const comments = post.shadowRoot?.querySelector('a[data-post-click-location="comments-button"] .rpl-cab--content');
      if (comments && !comments.querySelector('[data-n19-label]')) mark(comments, 'data-n19-label', ' Comments', s => comments.append(s));
    }
    for (const row of document.querySelectorAll('shreddit-comment-action-row')) add(row.shadowRoot, COMMENT);
    for (const award of document.querySelectorAll('award-button')) add(award.shadowRoot, AWARD);
    for (const box of document.querySelectorAll('comment-body-header faceplate-textarea-input, shreddit-composer faceplate-textarea-input')) add(box.shadowRoot, FIELD);
    for (const comment of document.querySelectorAll('shreddit-comment[score]')) {
      const meta = comment.querySelector(':scope > details > summary [slot="commentMeta"] .author-name-meta');
      const trigger = meta?.closest('span.author-hovercard-trigger');
      if (trigger && !trigger.parentElement.querySelector(':scope > [data-n19-points]')) {
        const n = +comment.getAttribute('score');
        if (Number.isFinite(n)) mark(trigger, 'data-n19-points', `${pretty(n)} point${n === 1 ? '' : 's'}`, s => trigger.after(s));
      }
    }
    for (const search of document.querySelectorAll('reddit-search-large, faceplate-search-input, pdp-comment-search-input')) {
      if (search.shadowRoot) { add(search.shadowRoot, SEARCH + FIELD); deep(search.shadowRoot, SEARCH + FIELD); }
    }
    const about = document.querySelector('#right-sidebar-contents aside.subreddit-right-rail-community-info > div > shreddit-subreddit-header');
    if (about && !about.parentElement.querySelector(':scope > [data-n19-strip]')) { const strip = document.createElement('div'); strip.setAttribute('data-n19-strip', ''); strip.textContent = 'About Community'; about.before(strip); }
    for (const box of document.querySelectorAll('comment-body-header faceplate-textarea-input[placeholder="Join the conversation"]')) box.setAttribute('placeholder', 'What are your thoughts?');
    times(document);
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(); }); };
  const start = () => {
    scan();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    setInterval(() => times(document), 30000);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
