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
