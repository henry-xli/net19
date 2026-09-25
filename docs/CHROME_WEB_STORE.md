# Chrome Web Store submission kit

The package is `downloads/net19-0.4.0.zip`. Its root contains:

- `manifest.json`;
- the bundled worker and popup;
- the theme stylesheets and scripts;
- icons.

For a release, run:

```sh
npm ci
npm run check
npm audit --omit=dev
npm run package
```

Keep the package, lockfile, manifest and displayed version aligned.

## Listing text

**Name:** net19

**Summary:** Websites as they looked in 2019.

**Description:**

net19 restyles 90 of the most visited US websites to look as they did in 2019, from Google, YouTube, Wikipedia and Reddit to Walmart, Weather.com, Zillow and the BBC. Each look is designed by hand. It applies before the page first appears and follows the site's own light or dark mode.

Two sites still serve their older design themselves, and net19 uses it:

- Wikipedia opens in its legacy Vector skin.
- Signed-in Reddit opens on old.reddit.com.

The popup has two switches: net19 on or off, and net19 on or off for the current site.

net19 makes no network requests and does not run on any other website. There is no account, server, analytics, or telemetry.

## Disclosures

| Field | Value |
| --- | --- |
| Homepage | https://github.com/henry-xli/net19 |
| Support | https://github.com/henry-xli/net19/issues |
| Privacy policy | https://github.com/henry-xli/net19/blob/main/PRIVACY.md |
| Single purpose | Restyle a fixed set of websites to look as they did in 2019 |
| Host permissions | Only the themed sites' domains, to apply their themes |
| `scripting` | Register the bundled theme stylesheets and scripts at document start |
| `declarativeNetRequestWithHostAccess` | Add Wikipedia's legacy-skin parameter; send signed-in Reddit visits to old.reddit.com |
| `cookies` | Check whether a Reddit session cookie exists; its value is not stored or sent |
| `storage` | The two switches |
| Remote code | None. All code is bundled |
| Data | None collected or transmitted |

## Reviewer steps

1. Load the package and open youtube.com, google.com or github.com. The 2019 look applies on the first load.
2. Open a Wikipedia article: the URL gains `useskin=vector`.
3. Sign in to Reddit and open reddit.com: it opens on old.reddit.com.
4. Use the popup to switch the current site, or net19, off. The site is back to normal on its next load.

Assets:

- `dist/extension/icons/128.png`;
- `docs/images/popup.png`;
- optionally, `docs/images/promo-440.png` (440 × 280).

These files do not imply submission or approval. See [Chrome's publishing guide](https://developer.chrome.com/docs/webstore/publish).
