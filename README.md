# net19

A Chrome extension that shows popular websites as they looked in **2019**.

[Download net19 0.8.0](https://github.com/henry-xli/net19/raw/refs/heads/main/downloads/net19-0.8.0.zip) · [Privacy](PRIVACY.md) · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md)

## Install or update

1. Download the ZIP and **extract it**. Chrome's **Load unpacked** accepts a folder, not a ZIP.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.

To update an existing unpacked installation, replace its folder contents and click the extension's **Reload** button once.

## Sites

The 2019 look is designed by hand for 90 sites. The references are the [Web Design Museum](https://www.webdesignmuseum.org/gallery/)'s captures, or the Wayback Machine's 2019 captures where the museum has none.

The sites are most of [SE Ranking's top 100 US websites](https://seranking.com/top-websites-us.html), plus Twitch, Bing and Stack Overflow. From that list, net19 leaves out:

- adult sites and video-download sites;
- banks;
- chatgpt.com, which didn't exist in 2019;
- a few entries that aren't browsable sites, such as amazonaws.com.

The full list is in `src/themes.ts`. net19 does nothing on any other site.

Where a site's 2019 design is essentially today's (Craigslist, Netflix, Best Buy and a few others), its theme only changes type, colors and corners.

Each look is a set of styling rules on the site's own design variables. Everything the site draws, including menus, popups and content that loads while scrolling, gets the same palette. The look applies before the first paint.

Your device's light or dark setting decides how every site looks. Sites that had a dark theme in 2019 (YouTube, Twitch, Twitter and others) use their own dark design when they are set to follow the device.

Most sites have no dark mode, and some keep their own setting. When a site shows the other mode, net19 flips the whole themed page so it matches your device:

- menus, pop-ups, dialogs and content that loads later all flip with it;
- photos, videos, maps and embeds keep their real colors;
- parts that already suit the mode stay as they are, such as a dark navy header on a dark device.

Brand colors keep their hue but change lightness, so a purple button in light mode becomes a lighter purple in dark mode. Netflix and Spotify's player were dark-only in 2019 and stay dark.

Two sites still serve their older design themselves:

- **Wikipedia** articles open in its legacy Vector skin.
- **Reddit**, while you are signed in, opens on old.reddit.com: the list with vote arrows, blue titles and the sidebar Reddit used through 2021. Old Reddit has no dark mode, so when your device is dark, net19 gives the same layout a dark palette. Signed out, old.reddit.com only offers a sign-in page, so Reddit stays on its current app with 2019 colors and a flat list.

The popup has two switches: net19 on or off, and net19 on or off for the current site.

## Limits

- Where a site's structure has changed since 2019, the theme restyles the current layout rather than rebuilding the old one.
- Signed-in pages that could not be inspected (Facebook, Instagram, X, LinkedIn, Netflix, Quora) are best-effort.
- Some sites block automated browsers, so their themes were checked only on recent Wayback copies: Booking.com, Getty Images, Expedia and Shutterstock among them. Booking.com's theme could not be checked at all, so it only changes colors and corner radii.
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
- `artifacts/net19-0.8.0.zip` is the packaged build, with a SHA-256 file beside it.
