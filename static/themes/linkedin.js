// net19 handmade theme: LinkedIn, 2019, light and dark. LinkedIn marks dark mode with a theme--dark class.
globalThis.net19Theme = {
  detect: () => /(^|\s)theme--dark/.test(document.documentElement.className + ' ' + (document.body?.className || '')) ? 'dark' : 'light',
  watch: ['class'],
};
// The signed-out home page's headline changes with each campaign; in 2019 it read "Welcome to your professional
// community". The heading's own text node is replaced in place, on the home page only.
(() => {
  const WELCOME = 'Welcome to your professional community';
  const fix = () => {
    const h1 = document.querySelector('main#main-content > section:first-child h1');
    if (!h1 || h1.children.length) return;
    const node = [...h1.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
    if (node && node.nodeValue.trim() !== WELCOME) node.nodeValue = WELCOME;
  };
  const start = () => {
    if (location.pathname !== '/' || document.querySelector('.global-nav, #global-nav')) return;
    fix();
    requestAnimationFrame(fix);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
