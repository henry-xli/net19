// net19 handmade theme: Canva marketing pages, 2019. Canva marks its color scheme with html.theme.light / html.theme.dark.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  watch: ['class'],
};
