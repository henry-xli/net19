// net19 handmade theme: GitHub in 2019 was light only. Use GitHub's own light palette.
(() => {
  const light = () => {
    const root = document.documentElement;
    if (!root) return;
    if (root.getAttribute('data-color-mode') !== 'light') root.setAttribute('data-color-mode', 'light');
    if (root.getAttribute('data-light-theme') !== 'light') root.setAttribute('data-light-theme', 'light');
  };
  const watch = () => {
    light();
    new MutationObserver(light).observe(document.documentElement, { attributes: true, attributeFilter: ['data-color-mode', 'data-light-theme'] });
  };
  if (document.documentElement) watch();
  else new MutationObserver((_, observer) => { if (document.documentElement) { observer.disconnect(); watch(); } }).observe(document, { childList: true });
  // Turbo navigations can swap the root element's attributes after load.
  document.addEventListener('turbo:load', light);
  document.addEventListener('DOMContentLoaded', light);
})();
