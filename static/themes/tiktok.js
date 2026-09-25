// net19 handmade theme: TikTok. TikTok marks its theme with html[data-theme="dark" | "light"].
globalThis.net19Theme = {
  detect: () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  watch: ['data-theme', 'data-tux-color-scheme'],
  light: { '#ff3b5c': '#fe2c55', '#ff5370': '#ff4368', '#ff4b69': '#ff3c61', '#ff4363': '#fe345b' },
  dark: { '#ff3b5c': '#fe2c55', '#ff5370': '#ff4368', '#ff4b69': '#ff3c61', '#ff4363': '#fe345b' },
};
