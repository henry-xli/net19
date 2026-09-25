// net19 handmade theme: Stack Overflow, 2019, light and dark. Stack Overflow sets body.theme-dark, or
// body.theme-system to follow the device.
globalThis.net19Theme = {
  detect() {
    const body = document.body?.classList;
    if (!body) return 'light';
    return body.contains('theme-dark') || body.contains('theme-system') && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  watch: ['class'],
};
