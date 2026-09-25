# Chrome Web Store submission kit

Package: `downloads/net19-0.2.0.zip`. Its root contains `manifest.json`, bundled JavaScript, extension pages, styles, icons, and third-party notices. Source/test tooling and downloaded archives are excluded. Run `npm ci`, `npm run check`, `npm audit --omit=dev`, and `npm run package` for a release. Keep package, lockfile, manifest and displayed version aligned.

## Listing text

**Name:** net19

**Summary:** Prepare historical website styles before opening pages. Adjustable year, automatic archive lookup and a local cache.

**Description:**

Net19 prepares archived website styling before opening an uncached site. Choose a year from 2007 through today; the default is 2019. Preparation runs automatically and can wait up to 60 seconds for the archive. Saved profiles skip the archive lookup on later visits.

The extension measures historical layouts locally and matches their components to the live page. Compatible pages can recover historical spacing, typography, colors and layout proportions while retaining current text and working controls. If a usable archive or reliable match is unavailable, the current appearance is used. Pixel-identical results on every website are not guaranteed.

Use the toolbar popup to change the year, pause a site, or view the result for this visit. Changing the year deletes cached profiles from other years. Up to 100 profiles are kept locally, subject to a 4 MiB total cache limit.

Net19 sends the public homepage origin and selected year to the Internet Archive, and may request public archived stylesheet/graphic addresses. Visited paths, queries, live page text, form values and cookies are not sent by net19. Analysis and storage happen on your device. There is no account, developer server, remote AI, analytics or telemetry.

Net19 is open source and independent of the Internet Archive. Wayback availability and compatibility with modern pages determine coverage. The current-year setting uses the site's current appearance.

## Disclosures

| Field | Value |
| --- | --- |
| Homepage | https://github.com/henry-xli/net19 |
| Support | https://github.com/henry-xli/net19/issues |
| Privacy policy | https://github.com/henry-xli/net19/blob/main/PRIVACY.md |
| Single purpose | Apply the user's selected historical visual styling to compatible live websites |
| Host permissions | Public HTTP(S) access enables automatic preparation and local page matching; archive connections retrieve public snapshots/resources |
| `declarativeNetRequestWithHostAccess` | Redirect uncached public GET requests to a local preparation page before the destination is contacted |
| `webNavigation` | Remove temporary per-tab navigation allow rules after commit or failure |
| `offscreen` | Measure sanitized archive layouts in an isolated local frame |
| `scripting` | Register startup content scripts and install generated CSS into the correct document |
| `storage` | Local preferences, bounded historical models, and temporary preparation results |
| Remote code | All executable code is bundled. Archived HTML/CSS are inert measurement inputs; archived scripts never run, and original selectors are never injected into live pages |
| Data | Disclose browsing-related homepage addresses sent to the Internet Archive and locally stored origin/recency metadata. Live page data is examined locally for matching, never transmitted or persisted by net19 |

Review the dashboard's current data questionnaire against the actual behavior and privacy policy. Do not claim universal fidelity, offline discovery, instantaneous cold loads, or guaranteed approval.

## Reviewer steps and assets

1. Load the packaged extension with public-site access. Open a public site with 2019 selected.
2. On a first visit, preparation begins automatically on the local loading page. The destination opens after preparation or bounded fallback. There is no preparation button.
3. Inspect the popup for the actual result and source. A saved but incompatible profile must still report current styling for that page.
4. Visit again to exercise caching. Change the year to confirm other-year entries disappear. Pause to restore original styling; clear the cache in Settings.

Deterministic tests exercise successful archives and failures in a real Chromium extension. Optional live checks are separate and can fail when archives or layouts are incompatible. No test responses or browser profiles ship.

Assets: `dist/extension/icons/128.png`, `docs/images/settings.png` (1280 × 800), `docs/images/popup.png`, and optional `docs/images/promo-440.png` (440 × 280). Screenshots show actual extension UI with synthetic example-site data.

A Chrome Web Store developer account is needed to upload and submit. These files do not imply submission or approval. See [Chrome's publishing guide](https://developer.chrome.com/docs/webstore/publish).
