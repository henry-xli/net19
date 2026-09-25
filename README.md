# net19

A Chrome extension that prepares archived website styling automatically before opening a site. Choose **2007 through the current year**; the default is **2019**.

[Download net19 0.2.0](https://github.com/henry-xli/net19/raw/refs/heads/main/downloads/net19-0.2.0.zip) · [Privacy](PRIVACY.md) · [Architecture](docs/ARCHITECTURE.md) · [Validation](docs/VALIDATION.md)

## Install or update

1. Download the ZIP and **extract it**. Chrome's **Load unpacked** accepts a folder, not a ZIP.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and select the extracted folder containing `manifest.json`.
4. Open a website normally. Preparation is automatic, including the first visit to a new site.

For an existing unpacked installation, replace its folder contents with this release and click the extension's **Reload** button once. If you load a different folder, remove the old copy so two versions are not running. This is only an installation step; everyday browsing needs no preparation button or extra reload.

Automatic preparation requires access to public websites. Chrome may ask you to accept the expanded permissions when updating from 0.1.0. Pausing a site or the extension restores its current styling.

## What changed in 0.2

- Uncached public GET navigations first open a local loading page. The destination request is held while net19 checks the archive, up to **8 seconds** by default (Settings: 3–30 seconds). If the archive is slower, the page opens with its current style and preparation finishes in the background, so the next visit is instant. About 25 popular homepages are prepared in the background ahead of time. Cached sites skip this lookup.
- The parser measures an archived document in an isolated browser frame. It preserves the CSS cascade, media conditions, component typography, borders, spacing, gradients, and bounded raster graphics.
- A general matcher connects archived components to live elements using labels, links, form names, classes, and structure. There are **no website-specific layout adapters**. Compatible compact pages recover measured geometry; longer pages can recover matched grid/flex proportions while current text continues to flow.
- Live controls and event handlers remain in place. Styles activate while the page is covered. Once a page is revealed, a late archive response cannot restyle it.
- The local cache holds up to **100 profiles**, subject to a **4 MiB** total limit. Changing the year immediately removes profiles from other years and cancels stale downloads. An older fallback capture can be used for one visit but is not stored as a selected-year capture.
- The popup and settings use direct controls and status messages. No manual preparation action is required.

## Handmade themes

For 19 heavily used sites, net19 ships hand-written 2019 themes instead of reconstructing them from the archive: Google (homepage), YouTube, Wikipedia, Reddit, GitHub, Yahoo, Twitch, Amazon, eBay, Bing, Stack Overflow, CNN, The New York Times, IMDb, ESPN, Facebook, Instagram, Twitter/X and LinkedIn. They are built into the extension, so they apply before the first paint with no archive lookup and no loading page, whenever the selected year falls in the era each theme represents (see `src/themes.ts`). Where a site still serves its own 2019-era frontend, net19 uses it (Wikipedia's legacy Vector skin). Sites that switch to dark mode are kept on their own light palette, as they all were in 2019. The themes restyle the live page (colors, type, buttons, corners, and removal of features that did not exist yet); they do not rebuild layouts that changed structurally, and logged-in pages that could not be inspected (Facebook, Instagram, X, LinkedIn feeds) are best-effort. ESPN and The New York Times changed little since 2019, so their themes are small. Netflix is not themed because its 2019 design is essentially the current one.

## Coverage and limitations

A historical site's CSS alone cannot reconstruct a different modern application. Net19 checks correspondence and readability before revealing a result; incompatible pages retain their current appearance. It cannot promise pixel-identical reconstruction across arbitrary sites, recreate behavior from archived JavaScript, recover unavailable graphics/fonts, or discover every alternate archived homepage URL.

Snapshots come from the public homepage, not the private path you are visiting. Subpages with different structures may therefore stay current. The Chrome navigation gate handles ordinary public HTTP(S) GET requests; POST submissions are not redirected or replayed. A site's own service worker, an in-page SPA transition, closed shadow roots, embedded frames, and canvas interfaces have additional limits. See [the exact behavior](docs/ARCHITECTURE.md).

Wayback is the implemented provider. Archive.is is not queried. The timeout covers archive preparation, not the destination site's own load time. Cached rendering still takes local matching and browser work; it is not literally instantaneous. The popup reports whether this page received a layout/style or kept its current appearance.

## Privacy

Archive requests disclose the **public homepage origin and selected year** to the Internet Archive. Archived public stylesheet and graphic addresses may also be requested. A fixed list of popular homepages, identical for every user, is also looked up in the background. Your visited path, query, fragment, current page text, form values, and cookies are not sent by net19. Matching and storage happen locally. There is no developer server, remote AI, account, analytics, or telemetry. [Full privacy policy](PRIVACY.md).

## Development

Requires Node.js 22+ and Chromium installed by Playwright.

```sh
npm ci
npx playwright install chromium
npm run check
npm run package
```

`src/` and `static/` are the source. `dist/extension/` is the unpacked extension; `artifacts/net19-0.2.0.zip` is the packaged build, with a SHA-256 file beside it. Tests, browser profiles, archive downloads, and logs are excluded from the package.

`npm run check:archive -- https://www.example.com` runs an optional real archive/site check in a fresh browser. A failure remains a failed live check, even when deterministic tests pass. See [validation](docs/VALIDATION.md) and the [Chrome Web Store submission kit](docs/CHROME_WEB_STORE.md). This repository is not evidence of Web Store approval.
