// net19 handmade theme: TikTok. TikTok marks its theme with html[data-theme="dark" | "light"].
// The dark palette moves today's pure-black surfaces to the 2019 page's charcoal (#1c1c1c) and #252525 panels.
globalThis.net19Theme = {
  detect: () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  watch: ['data-theme', 'data-tux-color-scheme'],
  light: { '#ff3b5c': '#fe2c55', '#ff5370': '#ff4368', '#ff4b69': '#ff3c61', '#ff4363': '#fe345b' },
  dark: { '#ff3b5c': '#fe2c55', '#ff5370': '#ff4368', '#ff4b69': '#ff3c61', '#ff4363': '#fe345b',
    '#000': '#1c1c1c', '#121212': '#1c1c1c', '#181818': '#252525', '#1e1e1e': '#252525', '#1f1f1f': '#252525' },
};
