// net19 handmade theme: GitHub, 2019 shapes and colors in light and dark. GitHub chooses its palette with
// html[data-color-mode] (light, dark, or auto following the device) and data-dark-theme / data-light-theme.
globalThis.net19Theme = {
  detect() {
    const root = document.documentElement;
    const mode = root.getAttribute('data-color-mode');
    const system = matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = mode === 'dark' || mode === 'auto' && system ? root.getAttribute('data-dark-theme') : root.getAttribute('data-light-theme');
    return /dark/.test(theme || (mode === 'dark' ? 'dark' : '')) ? 'dark' : 'light';
  },
  watch: ['data-color-mode', 'data-light-theme', 'data-dark-theme'],
};
