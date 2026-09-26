# Architecture

net19 is a set of handmade themes and a service worker that registers them. It does nothing on any site without a theme, makes no network requests, and keeps no cache.

## Themes

`src/themes.ts` lists the themes. Each is two bundled files:

- `static/themes/<id>.css`: rules written against `--n19-*` tokens, with light values on `html` and dark values on `html[data-net19-mode="dark"]`, plus the site's own design variables re-pointed at those tokens.
- `static/themes/<id>.js`: sets `globalThis.net19Theme`. It says:
  - how to read the site's own light/dark mode;
  - optionally, a map from the site's current palette colors to 2019 colors;
  - optionally, `only: 'dark'` for designs that were dark-only in 2019.

The shared `palette.js` runs after it in the same isolated world. When `<body>` starts (stylesheets in `<head>` are parsed and nothing has painted yet), it:

1. marks `html[data-net19-mode]`;
2. re-points every root custom property that holds a mapped color;
3. repeats when the site changes mode.

Palette maps are rescanned only on mode changes or new stylesheets, and those rescans are batched. net19's own sheet is disabled while the site's values are read, so the engine never wakes itself.

### Light and dark follow the device

The device's `prefers-color-scheme` decides the mode. When the site's own mode differs, `palette.js` flips the page instead of recoloring it piece by piece:

- `html[data-net19-flip]` gets `filter: invert(1) hue-rotate(180deg) contrast(.88)`.
- Media gets the exact inverse filter, so it shows its real colors. This covers `img`, `video`, `canvas`, `iframe`, `embed`, `object` and SVG `image`.
- Top-layer elements get the filter themselves, because they are drawn outside the root's filter. These are modal dialogs, popovers and fullscreen elements.
- Some elements are marked `data-net19-keep` and turned back whole:
  - elements with a photo as a CSS background;
  - opaque bars and panels that already suit the target mode, such as a dark header for a dark device.
- Translucent scrims (`data-net19-scrim`) get a background color that flips back to their own. Only the scrim itself is recolored, so a dialog sitting on it still flips.

Classification runs once per element in `requestAnimationFrame`, before the frame is painted. It reads style first and layout only for candidates.

On cnn.com, flipping adds about 150–250 ms of main-thread time during load. There is no cost when the site already matches the device.

### Guard

`guard.js` runs after every theme and palette.js. It has two parts.

**Post-2019 features.** Controls labelled as AI or assistant features that did not exist in 2019 are hidden by their label: "Create images", "Brainstorm", "Ask AI", "AI Mode", Copilot, Gemini, Grok, Rufus and similar. Placeholders such as "Search or ask a question" go back to "Search". A theme can add its own labels with a `later` regex, or protect labels with `keepLabels`.

**Readability.** After loading, a change of mode, and every hover, click, key press, animation end or scroll, visible text is checked against the background it sits on:

- The check accounts for translucent layers and for the page flip.
- Text under about 2.2:1 contrast is given a dark or light ink.
- Text over photos, gradients or media, including those in sibling layers, is left alone, because its background is unknown.
- Ink is removed again once the text reads correctly without it.

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
| Host access to the themed domains (93 domains for 90 themes) | Register the themes and navigation rules on those sites only |
| `scripting` | Register the document-start theme scripts |
| `declarativeNetRequestWithHostAccess` | Wikipedia's legacy-skin parameter and the old.reddit.com redirect |
| `cookies` | Check whether a Reddit session exists, so old.reddit.com is only used when it works |
| `storage` | The two switches |

The extension-page CSP allows no connections.

## Limits

- Themes restyle the current markup; they do not move sites back to their 2019 layout where the structure changed. Old Reddit and Wikipedia's legacy skin are the exceptions, because those sites still serve that structure.
- Logged-in pages that could not be inspected are best-effort.
- A site redesign can stop a theme's selectors from matching until the theme is updated.
