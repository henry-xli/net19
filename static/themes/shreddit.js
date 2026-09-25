// net19 handmade theme: Reddit signed out, in light and dark. Reddit marks dark mode
// with html.theme-dark. Post cards render their action row and the search field inside shadow roots, which page
// stylesheets cannot reach, so the same token-based rules are added there.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('theme-dark') ? 'dark' : 'light',
  watch: ['class'],
};
(() => {
  const css = `
    [data-testid="action-row"] button, [data-testid="action-row"] a, [data-testid="action-row"] .button {
      background: transparent !important; border: 0 !important; border-radius: 0 !important; color: var(--n19-meta) !important; font-weight: 700 !important; font-size: 11px !important; box-shadow: none !important;
    }
    [data-testid="action-row"] button:hover, [data-testid="action-row"] a:hover { background: var(--n19-hover) !important; }
    [data-testid="action-row"] span:has(> button[upvote]) { background: transparent !important; border: none !important; }
    button[upvote][aria-pressed="true"] { color: #ff4500 !important; }
    button[downvote][aria-pressed="true"] { color: #7193ff !important; }
    .label-container, .reddit-search-bar, [class*="search-bar"] { background: var(--n19-field) !important; border: 1px solid var(--n19-field-border) !important; border-radius: 0 !important; color: var(--n19-text) !important; }
    input, textarea { color: var(--n19-text) !important; }
  `;
  const styled = new WeakSet();
  const style = root => { if (!root || styled.has(root)) return; styled.add(root); const node = document.createElement('style'); node.textContent = css; root.append(node); };
  const deep = root => { for (const host of root.querySelectorAll('*')) if (host.shadowRoot) { style(host.shadowRoot); deep(host.shadowRoot); } };
  const scan = () => {
    for (const post of document.querySelectorAll('shreddit-post, shreddit-comment-action-row')) style(post.shadowRoot);
    for (const search of document.querySelectorAll('reddit-search-large, faceplate-search-input')) { if (search.shadowRoot) { style(search.shadowRoot); deep(search.shadowRoot); } deep(search); }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; scan(); }); };
  const start = () => { scan(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
