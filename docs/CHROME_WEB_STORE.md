# Chrome Web Store submission kit

The production package is `downloads/net19-0.1.0.zip`. Its root contains `manifest.json`; it contains no Node runtime or development dependencies. Rebuild with `npm ci`, `npm run check`, and `npm run package` before a new version. Increment **both** `package.json` and `static/manifest.json`, plus the displayed settings version, for an update.

## Listing

**Name:** net19

**Summary (also used in the manifest):**

Bring archived website colors and typography to today's web. Choose 2007–today, with local caching and a fast loading fallback.

**Detailed description:**

The web keeps moving. Bring a little of it back.

Net19 adapts a website's archived colors and typography to the live page you're visiting. Start in 2019, or choose a year from 2007 to today. Read current stories, use current links, and keep current controls—surrounded by a little of the site's past.

• Choose your year from a simple toolbar popup.
• Enable individual websites, or opt in across public sites.
• Reuse up to 100 locally saved site/year styles.
• Prepare historical styling behind a brief loading gate, without reloading the page.
• Keep the current site if the archive is missing, incompatible, or slow.
• Pause a site or clear saved styles whenever you like.

Net19 queries the Internet Archive for an enabled site's public homepage address. Your visited paths, searches, page contents, and cookies are never sent by net19. Archive analysis and style storage happen locally. No net19 account, server, analytics, or remote AI.

Historical styling is an adaptation, not an exact recreation of an old site's layout. Coverage depends on available Wayback snapshots and compatibility with today's website. The first uncached visit may retain its current style while a usable profile is prepared for a future page load. The current-year setting uses the live site's current style.

Net19 is open source and independent of the Internet Archive.

## Store fields and disclosures

| Field | Value / explanation |
| --- | --- |
| Category | Accessibility or Tools, according to the categories offered by the dashboard; choose the closest styling/personalization category |
| Language | English |
| Homepage | https://github.com/henry-xli/net19 |
| Support | https://github.com/henry-xli/net19/issues |
| Privacy policy | https://github.com/henry-xli/net19/blob/main/PRIVACY.md |
| Single purpose | Adapt archived website visual styling to live websites for the user's chosen year |
| `storage` | Save local preferences and bounded historical style profiles |
| `scripting` | Register granted-site document-start scripts and inject guarded historical CSS before revealing pages |
| `activeTab` | Identify the current website when the user invokes the toolbar popup |
| Archive host access | Read public capture indexes, archived HTML, and archived CSS from archive.org and web.archive.org |
| Optional website access | Apply styling on user-approved websites; broad access is granted only by an explicit Settings action |
| Remote code | No remotely hosted executable code; archived HTML/CSS are parsed as data into a fixed, local theme compiler |
| Data disclosure | Disclose browsing-related website addresses/history: an enabled site's homepage origin is transmitted to the Internet Archive, and origins/recency are cached locally. Do **not** claim that no data leaves the device. |

Check the dashboard's current questionnaire and describe the actual behavior above. Do not claim full offline archive discovery, universal site support, instant cold loads, exact old layouts, or guaranteed approval. The local cache works without a new archive request; acquiring a new profile requires archive connectivity.

## Assets and reviewer testing

- 128 × 128 icon: `dist/extension/icons/128.png`.
- 1280 × 800 settings screenshot: `docs/images/settings.png` (actual extension UI; example site data is synthetic).
- Popup image: `docs/images/popup.png`. Use within a correctly sized screenshot/promo canvas if required by the dashboard.
- Optional 440 × 280 small promotional tile: `docs/images/promo-440.png`.

Reviewer steps: load the extension, open a public site, enable access, select 2019 and choose **Prepare next visit**. Navigate normally when a usable style is available. If the archive cannot be reached, the page stays current and the popup explains the outcome. Settings exposes waiting time, pause, permissions, and cache clearing. There is no login or paid feature.

Deterministic successful-archive tests are available through `npm run check` without relying on current Wayback uptime. Test fixtures never ship in the extension. Live archive probes are recorded separately in the validation notes and must not be confused with the deterministic test results.

Uploading to the dashboard and submitting for review requires a Chrome Web Store developer account. This repository provides the package and listing material; it is not evidence of store submission or approval. See the [official publishing guide](https://developer.chrome.com/docs/webstore/publish).
