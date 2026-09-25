// net19 handmade theme: Yahoo homepage, 2019, light and dark. Yahoo marks dark mode with html.uds-color-mode-dark.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('uds-color-mode-dark') ? 'dark' : 'light',
  watch: ['class'],
};
