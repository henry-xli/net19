# net19 privacy policy

Effective September 25, 2026. Applies to net19 0.8.0.

Net19 restyles 90 popular websites to look as they did in 2019. It has no developer-operated server, account system, analytics, advertisements, remote AI, or telemetry.

## What leaves your device

Nothing. Net19 makes no network requests of its own. Its themes are stylesheets and small scripts bundled inside the extension. A few themes show a site's own older logo or icon images (Google, Bing, Wikipedia), which your browser loads from that same site like any other part of the page.

Two themes send you to an older version of a site on that site's own servers:

- Wikipedia article links get `useskin=vector`, Wikipedia's own legacy skin.
- While you are signed in to Reddit, reddit.com links open on old.reddit.com. To know whether you are signed in, net19 checks locally whether Reddit's `reddit_session` cookie exists. It never reads the cookie's contents into storage, copies it, or sends it anywhere.

## Access and storage

Net19 has access only to the 90 sites it themes (listed in `src/themes.ts`). It does not run on any other site and cannot read them.

Chrome local extension storage holds your settings: whether net19 is on, and which sites you switched off. Updating from an earlier version deletes the archive profiles and other data those versions kept.

## Controls

Switch net19 off in the popup, or off for the current site. Either change restores the site's current styling from the next page load. Uninstalling removes the extension's storage.

Report questions through [the repository](https://github.com/henry-xli/net19/issues). Avoid posting private addresses, credentials, or personal page contents in public issues.
