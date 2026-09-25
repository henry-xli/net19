# Architecture

net19 is a set of handmade themes and a service worker that registers them. It does nothing on any site without a theme, makes no network requests, and keeps no cache.

## Themes

`src/themes.ts` lists the themes. Each is two bundled files:

- `static/themes/<id>.css`: rules written against `--n19-*` tokens, with light values on `html` and dark values on `html[data-net19-mode="dark"]`, plus the site's own design variables re-pointed at those tokens.
- `static/themes/<id>.js`: sets `globalThis.net19Theme`, which says how to read the site's own light/dark mode and, optionally, maps the site's current palette colors to 2019 colors.

The shared `palette.js` runs after it in the same isolated world. When `<body>` starts (stylesheets in `<head>` are parsed and nothing has painted yet), it:

1. marks `html[data-net19-mode]`;
2. re-points every root custom property that holds a mapped color;
3. repeats when the site changes mode.

Palette maps are rescanned only on mode changes or new stylesheets, and those rescans are batched. net19's own sheet is disabled while the site's values are read, so the engine never wakes itself.

The looks follow the Web Design Museum's captures of each site (2019 where one exists, otherwise the nearest year), rebuilt by hand as rules for the live pages rather than copied.

## A site's own older frontend

Two sites still serve an older frontend themselves. declarativeNetRequest rules send navigations there:

- **Wikipedia**: article URLs without a query get `useskin=vector`, the legacy Vector skin.
- **Reddit**: `/`, `/r/…`, `/user/…`, `/comments/…`, `/search`, and the listing tabs go to the same path on old.reddit.com.
  - This happens only while the `reddit_session` cookie exists, because signed out, old.reddit.com only shows a sign-in page.
  - The worker checks the cookie with `chrome.cookies` and follows `cookies.onChanged`, so signing in or out switches the rule on or off.
  - Share links (`/r/<sub>/s/<id>`) and pages old Reddit does not have (settings, media, chat) are left alone.
  - In light mode, old.reddit.com is left exactly as Reddit draws it. Old Reddit never had a dark mode, so in dark mode the device's preference applies a dark palette to the same layout. Subreddit stylesheets, written for a white page, are switched off via their `media` attribute while dark.
  - Signed out, www.reddit.com gets the `shreddit` theme: the same colors on the current app, with a flat list instead of cards.

## Worker

On install, update, startup, settings changes, and Reddit session changes, the worker:

- registers each active theme as a top-frame `document_start` content script: the theme's CSS, its JS, then `palette.js`. It re-registers only when the set changes, because an unregister/register cycle leaves a moment in which a loading page would miss its theme.
- replaces its dynamic navigation rules.
- removes anything an earlier version registered or stored: the archive content script, profile cache, session rules and warm-up state.

Embedded frames are never themed: account menus, players and ads are transparent overlays drawn by their own origin.

Settings are `{ enabled, disabledHosts }`. Only the popup can change them. Switching a site off pauses every host of that site (www, old., m., and its other domains).

## Permissions

| Permission | Purpose |
| --- | --- |
| Host access to the 20 themed domains | Register the themes and navigation rules on those sites only |
| `scripting` | Register the document-start theme scripts |
| `declarativeNetRequestWithHostAccess` | Wikipedia's legacy-skin parameter and the old.reddit.com redirect |
| `cookies` | Check whether a Reddit session exists, so old.reddit.com is only used when it works |
| `storage` | The two switches |

The extension-page CSP allows no connections.

## Limits

- Themes restyle the current markup; they do not move sites back to their 2019 layout where the structure changed. Old Reddit and Wikipedia's legacy skin are the exceptions, because those sites still serve that structure.
- Logged-in pages that could not be inspected are best-effort.
- A site redesign can stop a theme's selectors from matching until the theme is updated.
