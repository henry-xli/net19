// net19 handmade theme: Weather Underground, 2019. The site has no dark mode setting, but its home page is drawn dark
// (as it was in 2019: a #1e2023 page under the black header), while forecast pages are light. The home page is treated as
// dark-only so it is never flipped to light; other pages follow the device as usual.
globalThis.net19Theme = {
  home: () => location.pathname === '/' || !!document.querySelector('.homepage-mast'),
  detect: () => globalThis.net19Theme.home() ? 'dark' : 'light',
  only: () => globalThis.net19Theme.home() ? 'dark' : undefined,
};
