// net19 handmade theme: Shutterstock marks its theme with html.theme-dark / html.theme-light; both are restyled.
globalThis.net19Theme = {
  detect() {
    const root = document.documentElement.classList;
    if (root.contains('theme-dark')) return 'dark';
    if (root.contains('theme-light')) return 'light';
    return undefined;
  },
  watch: ['class'],
};
