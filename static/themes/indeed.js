// net19 handmade theme: Indeed. Indeed has a single (light) design; the default background-luminance detection keeps
// it light. The palette maps move today's navy action blue and warm grays back to 2019's #085ff7 and neutral grays.
(() => {
  const map = {
    '#004fcb': '#085ff7', '#003a9b': '#0452d8', '#002970': '#0444b4',
    '#f7f6f5': '#f7f7f7', '#f3f2f1': '#f2f2f2', '#e4e2e0': '#e4e4e4', '#d4d2d0': '#d4d4d4', '#b4b2b1': '#b3b3b3',
  };
  globalThis.net19Theme = { light: map, dark: map };
})();
