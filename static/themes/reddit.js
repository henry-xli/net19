// net19 handmade theme: Reddit's post cards render their action row inside a shadow root,
// which page stylesheets cannot reach. Add the 2019 flat, gray, bold action buttons there.
(() => {
  const css = `
    [data-testid="action-row"] button, [data-testid="action-row"] a, [data-testid="action-row"] .button {
      background: transparent !important; border-radius: 2px !important; color: #878a8c !important; font-weight: 700 !important; font-size: 12px !important; box-shadow: none !important;
    }
    [data-testid="action-row"] button:hover, [data-testid="action-row"] a:hover { background: rgba(26,26,27,.1) !important; }
    [data-testid="action-row"] [data-post-click-location="vote"], [data-testid="action-row"] span:has(> button[upvote]) {
      background: transparent !important; border: none !important;
    }
    button[upvote][aria-pressed="true"] { color: #ff4500 !important; }
    button[downvote][aria-pressed="true"] { color: #7193ff !important; }
  `;
  const searchCss = `
    .reddit-search-bar, [class*="search-bar"], .label-container, .input-container, label { background: #f6f7f8 !important; color: #1c1c1c !important; border-color: #edeff1 !important; }
    .label-container { border: 1px solid #edeff1 !important; border-radius: 4px !important; }
    input { color: #1c1c1c !important; }
    :host(:focus-within) .label-container { background: #fff !important; border-color: #0079d3 !important; }
  `;
  const styled = new WeakSet();
  const style = (root, text = css) => {
    if (!root || styled.has(root)) return;
    styled.add(root);
    const node = document.createElement('style');
    node.textContent = text;
    root.append(node);
  };
  const scan = () => {
    for (const post of document.querySelectorAll('shreddit-post, shreddit-comment-action-row')) style(post.shadowRoot);
    // The search field nests shadow roots (search input > textarea input); style each level.
    const deep = root => { for (const host of root.querySelectorAll('*')) if (host.shadowRoot) { style(host.shadowRoot, searchCss); deep(host.shadowRoot); } };
    for (const search of document.querySelectorAll('reddit-search-large, faceplate-search-input')) { if (search.shadowRoot) { style(search.shadowRoot, searchCss); deep(search.shadowRoot); } deep(search); }
  };
  let queued = false;
  const later = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; scan(); }); } };
  const start = () => { scan(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
