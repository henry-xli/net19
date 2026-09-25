// net19 handmade theme: The Weather Channel. The site's dark theme is the shadcn/Tailwind `dark` class on <html>.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  watch: ['class'],
};
