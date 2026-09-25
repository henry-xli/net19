// net19 handmade theme: keep YouTube on its own light palette (2019 had no default dark mode).
(() => {
  const root = document.documentElement;
  const light = () => {
    if (root.hasAttribute('dark')) root.removeAttribute('dark');
    if (!root.hasAttribute('light')) root.setAttribute('light', '');
    root.removeAttribute('darker-dark-theme');
    root.removeAttribute('darker-dark-theme-deprecate');
    for (const node of document.querySelectorAll('ytd-app[dark], ytd-masthead[dark], #masthead[dark], ytd-mini-guide-renderer[dark], tp-yt-app-drawer[dark]')) node.removeAttribute('dark');
  };
  light();
  new MutationObserver(light).observe(root, { attributes: true, attributeFilter: ['dark', 'light', 'darker-dark-theme'] });
  const deep = new MutationObserver(() => light());
  const start = () => deep.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['dark'] });
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
