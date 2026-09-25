// net19 handmade theme: Fandom. FandomDesktop marks a wiki's theme with body.theme-fandomdesktop-dark / -light.
globalThis.net19Theme = {
  detect: () => document.body?.classList.contains('theme-fandomdesktop-dark') ? 'dark' : 'light',
  watch: ['class'],
};
