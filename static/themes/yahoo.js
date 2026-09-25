// net19 handmade theme: Yahoo was light-only in 2019; keep the site on its own light palette.
(() => {
  const cfg = {"remove": ["uds-color-mode-dark", "dark"], "add": ["uds-color-mode-light"]};
  const apply = () => {
    const root = document.documentElement;
    if (!root) return;
    for (const name of cfg.remove || []) if (root.classList.contains(name)) root.classList.remove(name);
    for (const name of cfg.add || []) if (!root.classList.contains(name)) root.classList.add(name);
    for (const name of cfg.removeAttrs || []) if (root.hasAttribute(name)) root.removeAttribute(name);
    for (const [name, value] of Object.entries(cfg.attrs || {})) if (root.getAttribute(name) !== value) root.setAttribute(name, value);
  };
  // Stop contesting a site that keeps re-applying its dark class; the stylesheet still applies.
  let count = 0, since = Date.now();
  const guarded = (_, observer) => { if (Date.now() - since > 2000) { since = Date.now(); count = 0; } if (++count > 40) { observer.disconnect(); return; } apply(); };
  const watch = () => { apply(); new MutationObserver(guarded).observe(document.documentElement, { attributes: true, attributeFilter: ['class', ...(cfg.removeAttrs || []), ...Object.keys(cfg.attrs || {})] }); };
  if (document.documentElement) watch();
  else new MutationObserver((_, observer) => { if (document.documentElement) { observer.disconnect(); watch(); } }).observe(document, { childList: true });
})();
