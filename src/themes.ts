// Handmade themes: styling rules that recreate a site's 2019 look on its live pages, in a light and a dark
// variant that follow the site's own mode. They ship inside the extension and apply at document_start.
// net19 does nothing on any site that is not listed here.
export type HandmadeTheme = {
  id: string;
  name: string;
  domains: string[];           // registrable domains; the per-site switch pauses all of them
  matches?: string[];          // narrower URL patterns when only some pages or hosts are themed
  // Each theme is themes/<id>.css (styling rules on --n19-* tokens, with light and dark values) and
  // themes/<id>.js (sets globalThis.net19Theme: how to read the site's own mode, and its palette map).
  // Some sites still serve their own 2019-era frontend behind a URL parameter (Wikipedia's legacy Vector skin)...
  query?: { pattern: string; params: Array<[string, string]> };
  // ...or on a separate host (old.reddit.com). `pattern` is an RE2 regular expression over the full URL and
  // `substitution` its replacement; `except` URLs (share links the legacy host cannot resolve) are left alone. `signedIn` names the session cookie the legacy host needs: without it the
  // legacy host only shows a sign-in page, so the redirect is used only while that cookie exists.
  legacy?: { pattern: string; substitution: string; except?: string; signedIn?: { url: string; name: string } };
};

export const THEMES: HandmadeTheme[] = [
  { id: 'google', name: 'Google', domains: ['google.com'], matches: ['www.google.com', 'google.com'].flatMap(host => ['/', '/?*', '/search*', '/webhp*', '/imghp*'].map(path => `*://${host}${path}`)) },
  { id: 'youtube', name: 'YouTube', domains: ['youtube.com'] },
  { id: 'wikipedia', name: 'Wikipedia', domains: ['wikipedia.org'],
    query: { pattern: '^https://[a-z-]+\\.wikipedia\\.org/wiki/[^?#]*$', params: [['useskin', 'vector']] } },
  // Reddit as it looked through 2021 for anyone signed in on old.reddit.com: the list with vote arrows, blue titles and the right sidebar.
  { id: 'reddit', name: 'Reddit', domains: ['reddit.com'], matches: ['*://old.reddit.com/*'],
    legacy: { pattern: '^https://(?:www\\.)?reddit\\.com(/(?:(?:r|u|user|comments|search|domain|hot|new|rising|controversial|top|best)(?:[/?#].*)?|[?#].*)?)$',
      substitution: 'https://old.reddit.com\\1', except: '^https://(?:www\\.)?reddit\\.com/r/[^/]+/s/', signedIn: { url: 'https://www.reddit.com/', name: 'reddit_session' } } },
  // Signed out, the current Reddit app is all there is; it gets the same colors and a flat list.
  { id: 'shreddit', name: 'Reddit', domains: ['reddit.com'], matches: ['*://www.reddit.com/*', '*://reddit.com/*'] },
  { id: 'github', name: 'GitHub', domains: ['github.com'] },
  { id: 'yahoo', name: 'Yahoo', domains: ['yahoo.com'], matches: ['*://www.yahoo.com/*', '*://yahoo.com/*'] },
  { id: 'twitch', name: 'Twitch', domains: ['twitch.tv'] },
  { id: 'amazon', name: 'Amazon', domains: ['amazon.com'] },
  { id: 'ebay', name: 'eBay', domains: ['ebay.com'] },
  { id: 'bing', name: 'Bing', domains: ['bing.com'] },
  { id: 'stackoverflow', name: 'Stack Overflow', domains: ['stackoverflow.com'] },
  { id: 'cnn', name: 'CNN', domains: ['cnn.com'] },
  { id: 'nytimes', name: 'The New York Times', domains: ['nytimes.com'] },
  { id: 'imdb', name: 'IMDb', domains: ['imdb.com'] },
  { id: 'espn', name: 'ESPN', domains: ['espn.com'] },
  { id: 'facebook', name: 'Facebook', domains: ['facebook.com'] },
  { id: 'instagram', name: 'Instagram', domains: ['instagram.com'] },
  { id: 'twitter', name: 'Twitter', domains: ['x.com', 'twitter.com'] },
  { id: 'linkedin', name: 'LinkedIn', domains: ['linkedin.com'] },
];

export function themeMatches(theme: HandmadeTheme): string[] {
  return theme.matches ?? theme.domains.flatMap(domain => [`*://${domain}/*`, `*://*.${domain}/*`]);
}

const within = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

export function themeFor(hostname: string): HandmadeTheme | undefined {
  const host = hostname.toLowerCase();
  return THEMES.find(theme => theme.domains.some(domain => within(host, domain)));
}

// A paused host pauses the whole site it belongs to (www, old., m. and the site's other domains).
export function themePaused(theme: HandmadeTheme, disabledHosts: string[]): boolean {
  return disabledHosts.some(host => theme.domains.some(domain => within(host, domain) || within(domain, host)));
}

export const THEMED_DOMAINS = [...new Set(THEMES.flatMap(theme => theme.domains))];
