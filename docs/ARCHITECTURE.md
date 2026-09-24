# Architecture and guarantees

## Navigation path

1. A user grants optional site access. The worker registers persistent, top-frame `document_start` content scripts for granted origins, excluding paused and unsupported hosts.
2. Chrome installs the bundled gate CSS before the content script. The script adds an opaque overlay immediately. The underlying website loads concurrently and is not redirected or replaced.
3. Preferences are read locally. Paused/current-year sites reveal immediately. Other pages ask the worker for a profile derived from the **sender's** public origin. A page cannot supply an arbitrary archive target.
4. The worker reads the cache. For a miss, it shares any same-origin/year in-flight job or starts one of at most two simultaneous profile jobs.
5. CDX and Availability requests race for a capture within the selected year. Older results wait for both indexes so they cannot preempt an available selected-year capture. CDX uses exact homepage matching, status/MIME filtering, `fastLatest`, a result limit, and a target-year cutoff. At most two initial captures and one next-older-year capture are analyzed within the overall deadline.
6. The archived HTML is parsed locally, without a DOM or script execution. Up to four linked CSS files and three one-level imports are fetched concurrently/in order as appropriate. Inline sheets retain source order. Conditional/print CSS is omitted. Responses have streaming byte limits and independent abort deadlines.
7. The analyzer extracts known color/typography declarations, resolves bounded CSS variables, checks a readable body color pair, maps fonts to local equivalents, and compiles **new CSS with fixed, guarded selectors**. Archived selectors and script/asset behavior are never injected wholesale.
8. `scripting.insertCSS` installs the result with user origin into the original **document ID**, while all rules remain inactive behind `html[data-net19-styled]`.
9. Only a still-waiting content script, within its original deadline, can activate that attribute. It removes the overlay in the same JavaScript task. Once the gate closes for any reason, that document's application state is terminal.

## Deadlines

| Work | Bound |
| --- | --- |
| Normal reveal delay | 1,800 ms by default; 0–2,200 ms configurable |
| Independent CSS overlay lifetime | 2,400 ms, then a hidden, non-interactive baseline |
| Whole background profile job | 14,000 ms |
| One archive index request | 6,000 ms; CDX and Availability overlap |
| One HTML or CSS request | 4,500 ms |
| Active profile jobs | 2; duplicate origin/year requests share a job |
| HTML response | 1,000,000 bytes |
| Linked stylesheet / imported stylesheet | 750,000 / 250,000 bytes, compressed and expanded |
| Local profile / total cache | 28 KiB / 4 MiB |

These are extension work bounds under normal browser scheduling, not a guarantee that the remote website finishes loading in that time. No JavaScript or CSS can guarantee wall-clock behavior in a renderer that is frozen or has stopped painting. Cached profiles still require Chrome's local storage/worker/CSS-insertion work; “cached” does not mean zero milliseconds.

The CSS gate is **hidden by default** and visible only during a finite animation with no forwards fill. A missing/disabled animation therefore fails open. The independent timer does not depend on an archive response or a live service worker. Navigation and setting changes also close a pending gate.

## Cache lifecycle

Each schema/year/origin profile has its own local storage key. A serialized index maintains recency, counts and bytes. Profiles and negative entries each have a cap of 100. Immutable historical profiles last until eviction or clearing; missing profiles are retried after six hours, transient failures after five minutes. Three network failures trigger a one-minute provider backoff saved in session storage.

Clear increments a cache generation and aborts active jobs before removing entries. Old jobs cannot write into the new generation. Quota failures do not prevent use of an already fetched, validated profile. The index and entries persist across normal MV3 service-worker suspension; in-memory jobs do not. If a worker is terminated mid-request, that document reveals its current page and a future navigation can retry.

## Boundaries

Only the extension's own popup/options URLs may mutate preferences, clear caches, or request explicit warmups. Content messages require the extension sender ID, a supported public origin, a top-level frame, granted permission, and a document ID. No page `postMessage` bridge is exposed. No arbitrary CSS, URLs, or permissions can be supplied by a website message.

All executable code is bundled locally. HTML parsing is data-only (`parse5`); CSS parsing uses `css-tree`. The injected output contains no remote assets, custom font faces, URLs, imports, layout/hiding rules, scripts, arbitrary selectors, or remotely supplied conditions. The extension-page CSP permits connections only to the two archive hosts and contains no unsafe script allowances.

No `webRequest`, `webNavigation`, browser history, `tabs`, `unlimitedStorage`, offscreen document, proxy, native messaging, or content-frame access permission is requested. `activeTab` supplies the user-invoked popup's current-site context; `scripting` registers startup scripts and installs guarded CSS; `storage` stores preferences and profiles.

## Compatibility scope

This is an adaptive historical theme, not a layout reconstruction. It preserves the current DOM, JavaScript behavior, form semantics, links, component placement, and modern responsive layout. Some app-specific styling remains visible. It does not style cross-origin frames, closed shadow roots, canvas rendering, or unknown classed controls. Capture classification is deliberately conservative; unsupported color formats or missing typography can cause a current-style fallback.

Same-origin SPA routes inherit the selected profile without navigation observers or repeated analysis. A fresh document checks preferences again. A year change does not automatically repaint an open page; an explicit pause does restore its current styling. Browsing back to a cached document does not trigger another archive lookup.

## Primary references

- [Chrome content-script lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting)
- [Chrome optional permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions)
- [Chrome's remotely hosted code guidance](https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code)
- [Internet Archive APIs](https://archive.org/help/wayback_api.php)
- [Wayback CDX reference](https://github.com/internetarchive/wayback/tree/master/wayback-cdx-server)
