// net19 handmade theme: Apple. Apple.com has a single (light) design with dark tiles.
// On a dark device the page is not flipped: the 2019 nav, its menus and the footer are drawn dark by the stylesheet,
// and the product tiles stay as Apple draws them (their light backgrounds are part of the photography). Flipping
// broke the nav's translucent, blurred menus, which only render correctly unfiltered.
globalThis.net19Theme = { detect: () => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light', watch: [] };
