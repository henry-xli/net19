// net19 handmade theme: YouTube, 2019. YouTube marks its dark theme with html[dark]; both modes are restyled.
// Palette: the current near-black/near-white pair moves to 2019's values (#181818 page and pure white text in
// dark; #030303 text in light); every YouTube variable holding those colors follows.
globalThis.net19Theme = {
  detect: () => document.documentElement.hasAttribute('dark') ? 'dark' : 'light',
  watch: ['dark', 'class'],
  scopes: ['ytd-app'],
  light: { '#0f0f0f': '#030303', '#f2f2f2': '#f1f1f1' },
  dark: { '#0f0f0f': '#181818', '#f1f1f1': '#ffffff', '#272727': '#303030' },
};
