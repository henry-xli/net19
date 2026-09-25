# Validation of 0.3.0

## Automated checks

`npm run check` runs:

- TypeScript checking;
- **6 unit tests**;
- a production build;
- **6 real Chromium extension tests**.

The browser tests load the unchanged production bundle into fresh, isolated profiles. Every site is a local fixture, and a request to any other host fails the test. They verify that:

- A themed site gets its theme; a site without one gets no script, style or redirect. Nothing is requested from the Internet Archive or anywhere else.
- Wikipedia articles open with `useskin=vector`.
- Reddit behaves correctly signed out and signed in:
  - With no `reddit_session` cookie, Reddit is not redirected.
  - Adding the cookie turns the old.reddit.com redirect on, keeping the path and query. The old.reddit theme follows the device's dark mode.
  - Settings pages and share links stay on www.
  - Removing the cookie turns the redirect off again.
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
