# Validation of 0.9.0

## Automated checks

`npm run check` runs:

- TypeScript checking;
- **6 unit tests**;
- a production build;
- **8 real Chromium extension tests**.

The browser tests load the unchanged production bundle into fresh, isolated profiles. Every site is a local fixture, and a request to any other host fails the test. They verify that:

- A themed site gets its theme; a site without one gets no script, style or redirect. Nothing is requested from the Internet Archive or anywhere else.
- Wikipedia articles open with `useskin=vector`.
- Reddit behaves correctly signed out and signed in:
  - With no `reddit_session` cookie, Reddit is not redirected.
  - Adding the cookie turns the old.reddit.com redirect on, keeping the path and query. The old.reddit theme follows the device's dark mode.
  - Settings pages and share links stay on www.
  - Removing the cookie turns the redirect off again.
- A light site on a dark device is flipped. Photos keep their colors, drawn logos flip, already-dark bars are kept, and modal dialogs flip too. Switching the device back to light removes the flip.
- Switching net19 off removes every script and rule, and reloaded pages come back unstyled.
- The popup is two switches:
  - The site switch appears only on a themed site.
  - Switching a site off unregisters only that site's theme.

Unit tests check:

- the settings shape;
- that host permissions equal the themed domains;
- that the per-site pause covers every host of a site;
- the Wikipedia and Reddit URL patterns, including hosts and paths that must not match;
- the theme stylesheet contract: no generated text, no script-computed layout variables, no `html, body` backgrounds, a dark token set wherever light tokens exist, and themes never switch a site's own mode.

## Visual checks

Each theme was compared against the Web Design Museum's capture of that site: 2019 where it exists, otherwise the nearest year. Reddit's reference is 2021; there is none for 2018–2020.

The comparisons were made on live pages in a real browser with the built extension, in light and dark. The one exception is old.reddit.com, which blocks cloud browsers; its theme was checked on Wayback captures of old.reddit.com from 2021:

- the front page;
- a subreddit;
- a comment thread.

Pages behind a sign-in are best-effort.

## Breakage audit

Every themed site's homepage (or a typical inner page) was loaded twice in real Chromium, once with the built extension and once without. The two runs were compared for:

- horizontal overflow;
- the number of visible links, buttons and fields in the first screen;
- text drawn in nearly the same color as its background.

Differences were inspected by hand. One theme created unreadable text: Trustpilot, whose header links were black on navy. It was fixed.

About 20 sites answered this cloud browser with a bot check or an access-denied page, so their live pages could not be compared. They were checked on recent Wayback copies instead. Booking.com is excluded from the Wayback Machine, so its theme was never checked.

A navigation benchmark measured the median page load of a local fixture with 20 and with 120 registered themes. Both runs measured 17–21 ms, with no measurable difference. Only the matching site's theme loads on any page.

## Interaction audit

Every themed site was driven in real Chromium with the built extension, once with a light device and once with a dark one. On each run the audit:

1. loaded the page;
2. clicked the first visible search field and typed a query;
3. pressed Escape;
4. opened the first menu button in the header.

After each step it recorded:

- whether the theme and the light/dark decision were still in place;
- how many texts were drawn in nearly their background color;
- a screenshot.

All 176 screenshots were reviewed by hand. Themes stayed in place after typing and after opening menus on every site that loaded. What the audit found in dark mode, and what was fixed:

- Search suggestion lists opening under an already-dark header stayed white. They now flip with the page.
- Closed menus and flyouts that only get a size when opened were skipped. They are now judged again after clicks and key presses.
- Pages that paint no background of their own showed a white canvas. The root now gets a background that flips.
- Drawn logos and icons (SVG, small PNG) turned invisible when kept in their original colors. They now flip with the page; photos still keep their colors.
- Strong brand bars (red, blue) turned pastel. They are now kept as drawn.

A known limit remains: strongly saturated brand colors inside a flipped page lose some saturation. Stanford's cardinal red becomes a darker brick red, for example, because CSS hue rotation clips colors outside sRGB.

About 25 sites answered the cloud browser with a bot check, so only their check page could be driven.

## Side-by-side comparison with 2019

Two kinds of 2019 reference were used:

- the Web Design Museum captures the user uses;
- offline renders of the Wayback Machine's July 2019 captures, made from the archived HTML, CSS and images.

Each theme was compared against its reference in one side-by-side image. The two pages were placed next to each other at 1280px. The most visible differences were listed, fixed, and the comparison repeated. Each theme went through at least four rounds.

Every site went through this comparison, 2 to 5 rounds each.

About 20 sites blocked the test browser with a bot check, and the Wayback Machine was often unreachable. For those, the themes were checked against the 2019 stylesheets only, or left as they were. These sites include:

- Instagram, eBay, Etsy, Genius, Indeed and Britannica;
- Tripadvisor, NY.gov, realtor.com and Costco;
- Expedia, Shutterstock, Getty Images and Collins;
- American Airlines, Canva, Quora, Yelp, Booking.com, Adobe and Uber Eats.

## Stress audit

`npm run audit` loads every themed site with the built extension, once in light and once in dark. On each site it:

1. hovers up to six header menu items;
2. opens the first menu;
3. types into the search field.

In every state it flags:

- faint text, measured from the screenshot's pixels, so filters, blur and translucency count;
- visible post-2019 labels and "ask" placeholders;
- header items off their row's center;
- round buttons drawn inside text fields.

The first full run found real problems, all fixed, on 30 sites. Examples:

- Apple's menus were unreadable in dark mode.
- Bing's "More" menu had white text on white.
- USPS's "Quick Tools" was unreadable.
- GitHub's Copilot menu entries were still showing.
- The FedEx and Lowe's assistants were still showing.
- Several hero headlines were re-inked over photos.

The re-run leaves only false flags, which were checked by hand:

- carousel slides that are off screen or fading in;
- line-clamped text;
- two-line cells;
- news headlines that mention AI;
- bot-check pages.

Sites that block automated browsers were checked in a real Chrome on a Mac instead. This covered Indeed, Booking.com, Expedia, eBay, Instagram, Adobe, Tripadvisor, Walmart, Quora, Britannica, Canva, Collins, Getty Images, Shutterstock, American Airlines, NY.gov, Costco, Uber Eats, TikTok, timeanddate, Etsy and Yelp. realtor.com, Fandom, Genius and Allrecipes could not be checked there either.

## Social apps (0.9.0)

0.9.0 adds Discord, Telegram Web, WhatsApp Web, Tumblr and Messenger. It also rebuilds YouTube's watch page and the themes for Facebook, Instagram, X, TikTok, Pinterest, Reddit, LinkedIn, Twitch and Quora.

For each site, the 2019 design was written down region by region:

- header;
- navigation;
- feed or list;
- post or message;
- comments;
- composer;
- menus;
- light and dark.

The sources were the Wayback Machine where it answered, and the open-source 2019 Telegram Web client. For each site, a list was also made of every feature added since 2019, and the theme hides each one.

Signed-in apps could not be opened with a real account. Their rules were built from each site's own shipped stylesheet and label files. They were checked on local pages that reproduce the real markup, in light, dark and flipped modes, with real mouse clicks and typing in search and message fields.

Signed-out pages were checked live: login pages, public profiles, posts, feeds and channel pages. YouTube's watch page and comments were checked in a real Chrome on a Mac, in light and dark.

The stress audit now clicks each site's search field with the mouse, the way a person would, and types into it. It reports the site as blocked when the field does not take focus. On the full run, every blocked field was caused by the site itself, not by a theme; the same happened without net19. The causes were:

- a bot check covering the page;
- a cookie banner;
- a field hidden behind a search icon.

Two shared fixes came out of this round:

- The page flip never keeps `<body>` as drawn. Keeping it had left Telegram's login page half flipped.
- The readability guard reads colors written as `oklab()` or `oklch()` (Tailwind v4, used by X). Before, it had misjudged those backgrounds as nearly black.
