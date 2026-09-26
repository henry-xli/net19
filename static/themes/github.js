// net19 handmade theme: GitHub, 2019 shapes and colors in light and dark. GitHub chooses its palette with
// html[data-color-mode] (light, dark, or auto following the device) and data-dark-theme / data-light-theme.
// The signed-out home page is drawn dark whatever the setting; in 2019 it was a light page under a dark #2b3137 hero,
// which the stylesheet rebuilds as drawn, so that page is treated as light and never flipped.
globalThis.net19Theme = {
  home: () => location.pathname === '/' && !!document.querySelector('body.logged-out, .lp-Home'),
  detect() {
    if (globalThis.net19Theme.home()) return 'light';
    const root = document.documentElement;
    const mode = root.getAttribute('data-color-mode');
    const system = matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = mode === 'dark' || mode === 'auto' && system ? root.getAttribute('data-dark-theme') : root.getAttribute('data-light-theme');
    return /dark/.test(theme || (mode === 'dark' ? 'dark' : '')) ? 'dark' : 'light';
  },
  only: () => globalThis.net19Theme.home() ? 'light' : undefined,
  watch: ['data-color-mode', 'data-light-theme', 'data-dark-theme'],
  // Primer's light colors moved back to the 2019 palette: text, muted text, link blue, the #fafbfc wash, borders,
  // the header, the orange selected-tab edge and the green primary button.
  light: { '#1f2328': '#24292e', '#59636e': '#586069', '#0969da': '#0366d6', '#f6f8fa': '#fafbfc', '#d1d9e0': '#e1e4e8', '#d1d9e0b3': '#eaecef',
    '#25292e': '#24292e', '#fd8c73': '#e36209', '#1f883d': '#28a745', '#ddf4ff': '#f1f8ff' },
};
// 2019 wording, changed in place: the header search was a field reading "Search GitHub", and the repository's green
// button was "Clone or download".
(() => {
  const fix = () => {
    const search = document.querySelector('header.HeaderMktg button[aria-label^="Search or jump" i]');
    if (search && !search.querySelector('[data-net19-label]')) {
      const label = document.createElement('span');
      label.setAttribute('data-net19-label', '');
      label.textContent = 'Search GitHub';
      search.append(label);
    }
    for (const button of document.querySelectorAll('#repo-content-pjax-container button[data-variant="primary"], react-partial button[data-variant="primary"]')) {
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) if (node.data.trim() === 'Code') node.data = node.data.replace('Code', 'Clone or download');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
    // React can re-render the header after hydration without a mutation reaching the label check in time: check again once settled.
    addEventListener('load', later, { once: true }); for (const t of [1000, 3000, 6000]) setTimeout(later, t);
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
