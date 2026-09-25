// Handmade themes: hand-written stylesheets (and, where a site needs it, a tiny script that
// switches the site to its own light palette) recreating a site's 2019 look on its live
// pages. They ship inside the extension, so they apply at document_start with no archive
// lookup and no loading page. Sites listed here are never sent through the archive pipeline.
export type HandmadeTheme = {
  id: string;
  name: string;
  domains: string[];           // registrable domains; www and other subdomains included unless `matches` is set
  matches?: string[];          // narrower URL patterns when only some pages are themed
  css?: false;                 // themes/<id>.css exists unless false
  js?: boolean;                // themes/<id>.js exists
  preferLight?: boolean;       // also report a light prefers-color-scheme to the page's own scripts
  // Some sites still serve their own 2019-era frontend behind a URL parameter (for example
  // Wikipedia's legacy Vector skin). Matching navigations get the parameter added.
  query?: { pattern: string; params: Array<[string, string]> };
  years: [number, number];     // selected years this look represents
};

const home = (host: string) => [`*://${host}/`, `*://${host}/?*`, `*://${host}/webhp*`];

export const THEMES: HandmadeTheme[] = [
  { id: 'google', name: 'Google', domains: ['google.com'], matches: [...home('www.google.com'), ...home('google.com')], years: [2016, 2020] },
  { id: 'youtube', name: 'YouTube', domains: ['youtube.com'], js: true, years: [2018, 2020] },
  { id: 'wikipedia', name: 'Wikipedia', domains: ['wikipedia.org'], css: false, years: [2010, 2022],
    query: { pattern: '^https://[a-z-]+\\.wikipedia\\.org/wiki/[^?#]*$', params: [['useskin', 'vector']] } },
  { id: 'reddit', name: 'Reddit', domains: ['reddit.com'], js: true, years: [2018, 2020] },
  { id: 'github', name: 'GitHub', domains: ['github.com'], js: true, years: [2017, 2020] },
  { id: 'yahoo', name: 'Yahoo', domains: ['yahoo.com'], matches: ['*://www.yahoo.com/*', '*://yahoo.com/*'], js: true, preferLight: true, years: [2017, 2019] },
  { id: 'twitch', name: 'Twitch', domains: ['twitch.tv'], js: true, preferLight: true, years: [2017, 2019] },
  { id: 'amazon', name: 'Amazon', domains: ['amazon.com'], years: [2016, 2021] },
  { id: 'ebay', name: 'eBay', domains: ['ebay.com'], years: [2017, 2020] },
  { id: 'bing', name: 'Bing', domains: ['bing.com'], years: [2016, 2020] },
  { id: 'stackoverflow', name: 'Stack Overflow', domains: ['stackoverflow.com'], years: [2018, 2019] },
  { id: 'cnn', name: 'CNN', domains: ['cnn.com'], years: [2016, 2021] },
  { id: 'nytimes', name: 'The New York Times', domains: ['nytimes.com'], years: [2018, 2021] },
  { id: 'imdb', name: 'IMDb', domains: ['imdb.com'], years: [2016, 2019] },
  { id: 'espn', name: 'ESPN', domains: ['espn.com'], years: [2017, 2021] },
  { id: 'facebook', name: 'Facebook', domains: ['facebook.com'], js: true, preferLight: true, years: [2016, 2019] },
  { id: 'instagram', name: 'Instagram', domains: ['instagram.com'], js: true, preferLight: true, years: [2017, 2019] },
  { id: 'twitter', name: 'Twitter', domains: ['x.com', 'twitter.com'], years: [2019, 2022] },
  { id: 'linkedin', name: 'LinkedIn', domains: ['linkedin.com'], preferLight: true, years: [2017, 2019] },
];

export function themeMatches(theme: HandmadeTheme): string[] {
  return theme.matches ?? theme.domains.flatMap(domain => [`*://${domain}/*`, `*://*.${domain}/*`]);
}

export function themeFor(hostname: string, year: number): HandmadeTheme | undefined {
  const host = hostname.toLowerCase();
  return THEMES.find(theme => year >= theme.years[0] && year <= theme.years[1] &&
    theme.domains.some(domain => host === domain || host.endsWith(`.${domain}`)));
}

export function themedDomains(year: number): string[] {
  return THEMES.filter(theme => year >= theme.years[0] && year <= theme.years[1]).flatMap(theme => theme.domains);
}
