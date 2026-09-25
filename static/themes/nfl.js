// net19 handmade theme: NFL.com marks its dark scheme with html.dark (Tailwind's class strategy); both are restyled.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  watch: ['class'],
};
