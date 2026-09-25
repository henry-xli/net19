// net19 handmade theme: Facebook, 2019 ("classic"), light and dark. Facebook marks its dark mode with
// html.__fb-dark-mode; its whole interface is drawn from the variables mapped in facebook.css.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('__fb-dark-mode') ? 'dark' : 'light',
  watch: ['class'],
};
