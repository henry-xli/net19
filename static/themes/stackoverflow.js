// net19 handmade theme: Stack Overflow, 2019, light and dark. Stack Overflow sets body.theme-dark, or
// body.theme-system to follow the device.
globalThis.net19Theme = {
  detect() {
    const body = document.body?.classList;
    if (!body) return 'light';
    return body.contains('theme-dark') || body.contains('theme-system') && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  watch: ['class'],
};
// The question list was titled "All Questions" in 2019 (today: "Newest Questions"); the heading's text is changed in place.
(() => {
  const fix = () => {
    const h1 = document.querySelector('#mainbar h1');
    if (!h1 || !/^\/questions\/?$/.test(location.pathname)) return;
    const walker = document.createTreeWalker(h1, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/^\s*Newest Questions\s*$/.test(n.data)) n.data = n.data.replace('Newest Questions', 'All Questions');
  };
  const start = () => { fix(); requestAnimationFrame(fix); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true }); else start();
})();
