// net19 handmade theme: Twitch before the September 2019 rebrand, light and dark. Twitch marks its dark theme
// with html.tw-root--theme-dark.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('tw-root--theme-dark') ? 'dark' : 'light',
  watch: ['class'],
};
