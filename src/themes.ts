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
  // The rest of the US top 100 (SE Ranking), in rank order. Sites without a 2019 design, adult and download sites,
  // and banks are not themed.
  { id: 'yelp', name: 'Yelp', domains: ['yelp.com'], matches: ['*://www.yelp.com/*', '*://yelp.com/*'] },
  { id: 'pinterest', name: 'Pinterest', domains: ['pinterest.com'] },
  { id: 'apple', name: 'Apple', domains: ['apple.com'], matches: ['*://www.apple.com/*'] },
  { id: 'fandom', name: 'Fandom', domains: ['fandom.com'], matches: ['*://*.fandom.com/wiki/*'] },
  { id: 'tiktok', name: 'TikTok', domains: ['tiktok.com'], matches: ['*://www.tiktok.com/*'] },
  { id: 'merriamwebster', name: 'Merriam-Webster', domains: ['merriam-webster.com'] },
  { id: 'walmart', name: 'Walmart', domains: ['walmart.com'], matches: ['/', '/ip/*', '/search*', '/browse/*', '/cp/*', '/shop/*', '/store/*', '/c/*'].map(path => `*://www.walmart.com${path}`) },
  { id: 'tripadvisor', name: 'Tripadvisor', domains: ['tripadvisor.com'], matches: ['', 'Hotel_Review-*', 'Hotels-*', 'Restaurants-*', 'Restaurant_Review-*', 'Attractions-*', 'Attraction_Review-*', 'Tourism-*', 'ShowUserReviews-*', 'Search*'].map(path => `*://www.tripadvisor.com/${path}`) },
  { id: 'weather', name: 'The Weather Channel', domains: ['weather.com'] },
  { id: 'spotify', name: 'Spotify', domains: ['spotify.com'], matches: ['*://open.spotify.com/*', '*://www.spotify.com/', '*://www.spotify.com/*/premium/*', '*://www.spotify.com/*/download/*'] },
  { id: 'indeed', name: 'Indeed', domains: ['indeed.com'], matches: ['*://www.indeed.com/*'] },
  { id: 'nih', name: 'NIH / PubMed', domains: ['nih.gov'], matches: ['*://pubmed.ncbi.nlm.nih.gov/*', '*://www.ncbi.nlm.nih.gov/*', '*://www.nih.gov/*'] },
  { id: 'clevelandclinic', name: 'Cleveland Clinic', domains: ['clevelandclinic.org'], matches: ['*://my.clevelandclinic.org/*'] },
  { id: 'accuweather', name: 'AccuWeather', domains: ['accuweather.com'], matches: ['*://www.accuweather.com/*'] },
  { id: 'zillow', name: 'Zillow', domains: ['zillow.com'], matches: ['*://www.zillow.com/*'] },
  { id: 'quora', name: 'Quora', domains: ['quora.com'] },
  { id: 'britannica', name: 'Britannica', domains: ['britannica.com'], matches: ['*://www.britannica.com/*'] },
  { id: 'homedepot', name: 'The Home Depot', domains: ['homedepot.com'], matches: ['/', '/b/*', '/p/*', '/s/*', '/c/*', '/l/*'].map(path => `*://www.homedepot.com${path}`) },
  { id: 'nygov', name: 'NY.gov', domains: ['ny.gov'], matches: ['*://www.ny.gov/*', '*://ny.gov/*'] },
  { id: 'microsoft', name: 'Microsoft', domains: ['microsoft.com'], matches: ['*://www.microsoft.com/*'] },
  { id: 'mapquest', name: 'MapQuest', domains: ['mapquest.com'] },
  { id: 'target', name: 'Target', domains: ['target.com'], matches: ['/', '/c/*', '/p/*', '/s?*', '/s/*', '/b/*'].map(path => `*://www.target.com${path}`) },
  { id: 'cambridge', name: 'Cambridge Dictionary', domains: ['cambridge.org'], matches: ['*://dictionary.cambridge.org/*'] },
  { id: 'mayoclinic', name: 'Mayo Clinic', domains: ['mayoclinic.org'], matches: ['*://www.mayoclinic.org/*'] },
  { id: 'netflix', name: 'Netflix', domains: ['netflix.com'], matches: ['/', '/browse*', '/title/*', '/search*', '/latest*'].map(path => `*://www.netflix.com${path}`) },
  { id: 'foxnews', name: 'Fox News', domains: ['foxnews.com'] },
  { id: 'adobe', name: 'Adobe', domains: ['adobe.com'], matches: ['*://www.adobe.com/*'] },
  { id: 'rottentomatoes', name: 'Rotten Tomatoes', domains: ['rottentomatoes.com'] },
  { id: 'usps', name: 'USPS', domains: ['usps.com'], matches: ['*://www.usps.com/*', '*://usps.com/*', '*://tools.usps.com/*'] },
  { id: 'timeanddate', name: 'timeanddate.com', domains: ['timeanddate.com'] },
  { id: 'allrecipes', name: 'Allrecipes', domains: ['allrecipes.com'] },
  { id: 'etsy', name: 'Etsy', domains: ['etsy.com'] },
  { id: 'dictionary', name: 'Dictionary.com', domains: ['dictionary.com'] },
  { id: 'fedex', name: 'FedEx', domains: ['fedex.com'] },
  { id: 'lowes', name: "Lowe's", domains: ['lowes.com'] },
  { id: 'wunderground', name: 'Weather Underground', domains: ['wunderground.com'] },
  { id: 'costco', name: 'Costco', domains: ['costco.com'] },
  { id: 'weathergov', name: 'National Weather Service', domains: ['weather.gov'], matches: ['*://www.weather.gov/*', '*://weather.gov/*', '*://forecast.weather.gov/*'] },
  { id: 'craigslist', name: 'craigslist', domains: ['craigslist.org'] },
  { id: 'trustpilot', name: 'Trustpilot', domains: ['trustpilot.com'] },
  { id: 'canva', name: 'Canva', domains: ['canva.com'], matches: ['/', '/?*', '/templates*', '/create/*', '/features/*', '/pricing*', '/about*'].map(path => `*://www.canva.com${path}`) },
  { id: 'ziprecruiter', name: 'ZipRecruiter', domains: ['ziprecruiter.com'] },
  { id: 'genius', name: 'Genius', domains: ['genius.com'] },
  { id: 'gettyimages', name: 'Getty Images', domains: ['gettyimages.com'], matches: ['/', '/photos/*', '/search/*', '/detail/*', '/editorial-images*', '/creative-images*'].map(path => `*://www.gettyimages.com${path}`) },
  { id: 'realtor', name: 'realtor.com', domains: ['realtor.com'] },
  { id: 'nycgov', name: 'NYC.gov', domains: ['nyc.gov'], matches: ['*://www.nyc.gov/*', '*://nyc.gov/*'] },
  { id: 'expedia', name: 'Expedia', domains: ['expedia.com'], matches: ['/', '/Flights*', '/*Hotel*', '/Cars*', '/Cruises*', '/Vacation-Packages*', '/things-to-do*', '/Things-To-Do*', '/Deals*'].map(path => `*://www.expedia.com${path}`) },
  { id: 'shutterstock', name: 'Shutterstock', domains: ['shutterstock.com'], matches: ['/', '/search/*', '/image-*', '/video*', '/editorial*', '/music*', '/category/*'].map(path => `*://www.shutterstock.com${path}`) },
  { id: 'nfl', name: 'NFL', domains: ['nfl.com'], matches: ['*://www.nfl.com/*'] },
  { id: 'collins', name: 'Collins Dictionary', domains: ['collinsdictionary.com'] },
  { id: 'mlb', name: 'MLB', domains: ['mlb.com'], matches: ['*://www.mlb.com/*'] },
  { id: 'ubereats', name: 'Uber Eats', domains: ['ubereats.com'], matches: ['/', '/*store/*', '/*city/*', '/*category/*', '/feed*', '/search*'].map(path => `*://www.ubereats.com${path}`) },
  { id: 'bbc', name: 'BBC', domains: ['bbc.com', 'bbc.co.uk'], matches: ['*://www.bbc.com/*', '*://www.bbc.co.uk/*'] },
  { id: 'healthline', name: 'Healthline', domains: ['healthline.com'], matches: ['*://www.healthline.com/*'] },
  { id: 'kbb', name: 'Kelley Blue Book', domains: ['kbb.com'], matches: ['*://www.kbb.com/*'] },
  { id: 'stanford', name: 'Stanford', domains: ['stanford.edu'], matches: ['*://www.stanford.edu/*'] },
  { id: 'cvs', name: 'CVS', domains: ['cvs.com'], matches: ['/', '/?*', '/shop/*', '/content/*', '/store-locator/*', '/weeklyad*'].map(path => `*://www.cvs.com${path}`) },
  { id: 'bestbuy', name: 'Best Buy', domains: ['bestbuy.com'] },
  { id: 'oanda', name: 'OANDA', domains: ['oanda.com'], matches: ['*://www.oanda.com/currency-converter/*', '*://www1.oanda.com/currency/converter/*'] },
  { id: 'uga', name: 'University of Georgia', domains: ['uga.edu'], matches: ['*://www.uga.edu/*'] },
  { id: 'nypost', name: 'New York Post', domains: ['nypost.com'] },
  { id: 'aa', name: 'American Airlines', domains: ['aa.com'], matches: ['*://www.aa.com/', '*://www.aa.com/homePage.do*', '*://www.aa.com/i18n/*'] },
  { id: 'ytblog', name: 'YouTube Official Blog', domains: ['blog.youtube'] },
  { id: 'openai', name: 'OpenAI', domains: ['openai.com'] },
  { id: 'walgreens', name: 'Walgreens', domains: ['walgreens.com'], matches: ['/', '/?*', '/store/*', '/topic/*', '/storelocator/*', '/offers/*'].map(path => `*://www.walgreens.com${path}`) },
  { id: 'gocom', name: 'ABC', domains: ['go.com', 'abcnews.com', 'abc.com'] },
  { id: 'usnews', name: 'U.S. News & World Report', domains: ['usnews.com'] },
  { id: 'cagov', name: 'CA.gov', domains: ['ca.gov'], matches: ['*://www.ca.gov/*'] },
  { id: 'booking', name: 'Booking.com', domains: ['booking.com'], matches: ['*://www.booking.com/*'] },
  { id: 'istockphoto', name: 'iStock', domains: ['istockphoto.com'] },
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
