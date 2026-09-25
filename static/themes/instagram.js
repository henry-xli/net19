// net19 handmade theme: Instagram, 2019. Instagram follows the device theme unless changed in its settings;
// it marks the result with a __ig-dark-mode / __ig-light-mode class when present.
globalThis.net19Theme = {
  detect() {
    const classes = document.documentElement.classList;
    if (classes.contains('__ig-dark-mode')) return 'dark';
    if (classes.contains('__ig-light-mode')) return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  watch: ['class'],
};
