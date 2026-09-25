# Validation of 0.6.0

## Automated checks

`npm run check` runs:

- TypeScript checking;
- **6 unit tests**;
- a production build;
- **7 real Chromium extension tests**.

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

So far this covers these sites:

- YouTube;
- Google, Bing, Yahoo and Wikipedia;
- Kelley Blue Book, Rotten Tomatoes and timeanddate;
- Facebook, LinkedIn and Twitter;
- CNN, Healthline, PubMed, Stack Overflow and OpenAI.

eBay and Instagram block this test browser, so their updated themes are unconfirmed. The remaining sites are being done the same way.
