// net19 handmade theme: Wikipedia's legacy Vector skin (served by Wikipedia itself). The skin predates night mode,
// so the dark variant follows the device setting.
globalThis.net19Theme = {
  detect: () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
};
