// net19 handmade theme: LinkedIn, 2019, light and dark. LinkedIn marks dark mode with a theme--dark class.
globalThis.net19Theme = {
  detect: () => /(^|\s)theme--dark/.test(document.documentElement.className + ' ' + (document.body?.className || '')) ? 'dark' : 'light',
  watch: ['class'],
};
