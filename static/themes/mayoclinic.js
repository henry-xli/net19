// net19 handmade theme: Mayo Clinic, 2019. Mayo marks its own dark rendering with body.dark-mode.
globalThis.net19Theme = {
  detect: () => document.body?.classList.contains('dark-mode') ? 'dark' : 'light',
  watch: ['class'],
};
