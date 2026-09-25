// net19 handmade themes: runs in the page's own context on sites that pick dark mode from
// the operating system in script. It reports "light" for prefers-color-scheme queries so
// the site renders its own light palette, as every one of these sites did in 2019.
(() => {
  const original = window.matchMedia.bind(window);
  window.matchMedia = function matchMedia(query) {
    const text = String(query);
    if (/prefers-color-scheme\s*:\s*dark/i.test(text)) return original('not all');
    if (/prefers-color-scheme\s*:\s*light/i.test(text)) return original('all');
    return original(query);
  };
})();
