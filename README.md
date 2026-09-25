# net19

A Chrome extension that shows popular websites as they looked in **2019**.

[Download net19 0.3.0](https://github.com/henry-xli/net19/raw/refs/heads/main/downloads/net19-0.3.0.zip) · [Privacy](PRIVACY.md) · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md)

## Install or update

1. Download the ZIP and **extract it**. Chrome's **Load unpacked** accepts a folder, not a ZIP.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.

To update an existing unpacked installation, replace its folder contents and click the extension's **Reload** button once.

## Sites

The 2019 look is designed by hand for these sites, using the [Web Design Museum](https://www.webdesignmuseum.org/gallery/)'s capture of each one as the reference:

- Google Search, YouTube, Wikipedia, Reddit, GitHub, Yahoo
- Twitch, Amazon, eBay, Bing, Stack Overflow, CNN
- The New York Times, IMDb, ESPN, Facebook, Instagram, Twitter/X, LinkedIn

net19 does nothing on any other site.

Each look is a set of styling rules on the site's own design variables. Everything the site draws, including menus, popups and content that loads while scrolling, gets the same palette. The look applies before the first paint.

Every theme has a light and a dark variant and follows the site's own light or dark setting. Sites that had a dark theme in 2019 (YouTube, Twitch, Twitter) use it. The others get a dark version of their 2019 look.

Two sites still serve their older design themselves:

- **Wikipedia** articles open in its legacy Vector skin.
- **Reddit**, while you are signed in, opens on old.reddit.com: the list with vote arrows, blue titles and the sidebar Reddit used through 2021. Old Reddit has no dark mode, so when your device is dark, net19 gives the same layout a dark palette. Signed out, old.reddit.com only offers a sign-in page, so Reddit stays on its current app with 2019 colors and a flat list.

The popup has two switches: net19 on or off, and net19 on or off for the current site.

## Limits

- Where a site's structure has changed since 2019, the theme restyles the current layout rather than rebuilding the old one.
- Signed-in feeds that could not be inspected (Facebook, Instagram, X, LinkedIn) are best-effort.
- A site redesign can break parts of a theme until the theme is updated.

## Privacy

net19 makes no network requests and has access only to the themed sites. It stores only its two switches. For Reddit, it checks whether Reddit's session cookie exists, and nothing more. [Full privacy policy](PRIVACY.md).

## Development

Requires Node.js 22+ and Chromium installed by Playwright.

```sh
npm ci
npx playwright install chromium
npm run check
npm run package
```

- `src/` and `static/` are the source; the themes are in `static/themes/`.
- `dist/extension/` is the unpacked extension.
- `artifacts/net19-0.3.0.zip` is the packaged build, with a SHA-256 file beside it.
