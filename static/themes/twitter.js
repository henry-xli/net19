// net19 handmade theme: Twitter, late 2019. Its three backgrounds (Default, Dim, Lights out) all existed in 2019;
// the page background tells which one is in use.
globalThis.net19Theme = {
  detect() {
    const bg = getComputedStyle(document.body || document.documentElement).backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [255, 255, 255]).map(Number);
    return .2126 * r + .7152 * g + .0722 * b < 90 ? 'dark' : 'light';
  },
  watch: ['style', 'class', 'data-theme'],
};
