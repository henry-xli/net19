# Architecture

## Navigation and first paint

1. A persistent dynamic `declarativeNetRequest` rule redirects uncached public GET main-frame requests to the extension's local loading page, before sending the destination request. The original URL is held only in that page's fragment. Archive/local/private/paused addresses are excluded.
2. The loading page requests preparation automatically. The worker derives the public origin from its verified extension-page sender, reads the local cache, and shares duplicate origin/year jobs. At most two jobs run concurrently; queued jobs share the same overall timeout.
3. Three indexes are queried in parallel with the public homepage address: a replay probe (`/web/{year}0701000000id_/{origin}/`, which Wayback redirects to the nearest real capture and returns in one request), Availability (asked for the capture closest to mid-year, because a Dec 31 query usually returns a Jan 1 capture of the following year), and CDX (often 15–40 s). Selection continues 2.5 s after the first index yields a capture. Candidates are ordered newest first; at most two candidates and one older fallback are processed. Archive requests share a pool of six, and one retry follows 429/502/503/504 or a dropped connection. Stylesheets and images may resolve to a capture up to one year after the page (Wayback serves the nearest asset capture). An HTML response redirected outside the archive or past the selected year is rejected.
4. HTML and CSS are parsed as untrusted data. Archived scripts, handlers, embedded browsing contexts, executable SVG features, network fonts, and arbitrary external assets are removed. Up to six linked sheets and three one-level imports preserve cascade order and supported media conditions. Missing essential stylesheets cause fallback.
5. An offscreen document renders the sanitized result in a sandboxed iframe with no scripts, forms, navigation privileges, or network access. The local browser resolves the cascade, CSS variables, layout, media queries, typography and gradients. Bounded archived PNG branding/sprites are decoded and re-encoded; small sanitized SVG decorations become raster pixels. Archived source HTML/CSS are not persisted.
6. The worker stores a validated compressed measurement model. A tab-specific temporary allow rule lets the original URL continue exactly once. A session result prevents a failed preparation from starting a second lookup after release. Commit/error/close removes the temporary rule. Positive cached origins receive bounded persistent allow rules and skip the loading-page redirect on later visits.
7. A registered top-frame `document_start` content script covers the destination while it loads. It decodes the model and waits for document readiness and a short quiet period, capped at 2.5 seconds for settling. It measures the live DOM locally. The matcher uses form names, labels, links, IDs, classes, descendant identities, and matched-parent relationships; changed article text can retain its component's historical styling.
8. The adapter emits newly generated attribute selectors. High-confidence compact interfaces recover measured geometry and bounded raster decorations. Larger matched components can recover grid/flex proportions and typography while current content determines row heights. Current controls, links, values and event handlers stay in the DOM. Unsupported structures, sensitive forms, active dialogs, poor correspondence or unreadable output cause rollback under the cover.
   When the live DOM no longer corresponds to the capture (the common case for redesigned sites), or a reconstruction fails validation, the adapter falls back to the **role theme** (`src/theme.ts`) instead of the current style. The archived computed styles are reduced to tokens per role — page background, body text, headings, links, buttons, text fields, header band, header text, footer — and applied to live elements of the same role through fixed `[data-net19-role]` attributes. It never moves, hides or adds elements. Each role is applied only where the resulting text contrast is at least 3:1; after activation, any element that became hard to read loses its role, and the theme rolls back only if 40% or more of themed text fails.
9. `scripting.insertCSS` targets the original **document ID** with USER origin. Rules remain inactive until that content script enables its unique session attribute. Validation, activation and removal of the cover happen before reveal. A late response cannot activate after this visit has revealed or navigated away.

There is no website-specific adapter or downloaded executable code. A site's archived template is not assumed to match its modern template.

## Bounds

| Resource | Limit |
| --- | --- |
| Preflight wait | 8 seconds by default; Settings offers 3, 5, 8, 15 or 30 seconds. Preparation continues in the background after release |
| Background warm-up | 25 fixed popular homepages, one at a time, 45 s after worker start, only while no visit is being prepared, 2 s apart; stops on two outages and resumes on the next start |
| Archive job | 55 seconds, additionally capped by the chosen timeout |
| Index / HTML-CSS / PNG request | CDX 25, Availability 12 / 15 / 10 seconds; one retry for transient errors |
| Independent document-cover CSS expiry | 65 seconds |
| Active / queued origin jobs | 2 active, at most 100 total |
| HTML / linked CSS / imported CSS | 3,000,000 / 750,000 / 250,000 bytes; compressed and expanded limits |
| Archived graphics | Up to 3 branding PNGs and 3 stylesheet PNGs; 40 KB each; validated dimensions |
| Rendered model | Up to 300 nodes; graphics processing additionally bounded |
| Compressed profile / decoded model | 96 KiB / 1,000,000 bytes |
| Cache | 100 positive + 100 temporary negative entries, 4 MiB total |
| Generated CSS message | 512 KiB; fixed selector grammar, no URLs/imports/code |

These bounds cover extension work under normal browser scheduling, not the destination's network load or a frozen renderer. The CSS cover is hidden by default and visible only during a finite animation. Missing/disabled animation fails open. The loading page has its own release timer and can install its temporary allow rule without relying on a running worker.

## Cache and settings

A schema/year/canonical-origin key identifies each profile. HTTP/HTTPS and the optional leading `www` share a profile; unrelated subdomains do not. Serialized writes maintain LRU recency and byte/count bounds. Missing captures expire after six hours; captures that exist but cannot be read after one hour; transient failures after five minutes. Only provider outages count toward the one-minute session backoff. The archive job's 55-second budget is independent of the navigation wait: when the wait releases a first visit, preparation continues and the next visit is served from the cache.

Startup and year changes remove other-year, old-schema, corrupt and expired entries. A capture from an older fallback year is used transiently, never saved as the selected year. Generation checks prevent cleared caches or changed years from being repopulated by old jobs. Quota errors do not prevent use of an already prepared profile.

Changing the year affects subsequent navigation; it does not unexpectedly repaint an already visible page. Changing it on the loading page restarts preparation there. Pausing restores the original DOM attributes/graphics and disables generated styles immediately. Selecting the current year removes preparation rules and content-script registration.

## Trust boundaries and permissions

Only verified popup/options messages change settings or clear storage. Loading-page messages must come from the top frame of an extension tab. Live content messages require the extension ID, supported sender origin, top frame, site permission, and document ID. No live-page `postMessage` bridge exists.

The extension-page CSP restricts connections to `archive.org` and `web.archive.org`. The measurement frame additionally has `default-src 'none'`, `script-src 'none'`, `connect-src 'none'`, `form-action 'none'` and data-only images. Archived CSS selectors exist only in that inert frame. The live page receives computed values through generated selectors and normalized pixels through canvases.

| Permission | Purpose |
| --- | --- |
| HTTP(S) host access | Automatic public-site navigation handling and styling |
| `declarativeNetRequestWithHostAccess` | Hold uncached GET navigations before the destination request |
| `webNavigation` | Retire temporary tab-specific allow rules after commit/error |
| `scripting` | Register document-start scripts and insert CSS into a specific document |
| `offscreen` | Measure sanitized layouts locally without a visible archive tab |
| `storage` | Preferences, bounded profiles, and transient navigation results |

No history, `tabs`, proxy, debugger, native messaging, unlimited storage, or remotely hosted script permission is requested. The tabs API is used for tab identifiers and context provided by host access; private pages are never sent to the archive.

## Compatibility limits

Only homepage origins are looked up. A parameterized homepage variant can have a different archive than the bare homepage; net19 does not enumerate every public URL or send the user's query to find it. Missing fonts, unavailable or oversized graphics, script-generated archived content, DOM redesigns and shadow/canvas interfaces limit fidelity. A fallback is reported as current styling, even when a source profile was successfully cached.

The navigation redirect applies to ordinary public GET requests. POST requests are not redirected/replayed. Requests served within a site's own service worker can bypass Chrome's request interception; the document cover provides best-effort reveal protection in that case. SPA route changes do not initiate a second layout reconstruction. Only the top frame is adapted. Mobile widths retain conservative styling rather than desktop absolute geometry.

## API references

- [Chrome declarativeNetRequest](https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest)
- [Chrome offscreen documents](https://developer.chrome.com/docs/extensions/reference/api/offscreen)
- [Chrome scripting and document targeting](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Wayback CDX API](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
