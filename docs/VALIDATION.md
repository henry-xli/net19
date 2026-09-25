# Validation of 0.2.0

## Automated release checks

`npm run check` passes TypeScript checking, **28 unit tests**, a production build, and **16 real Chromium extension tests**. `npm audit --omit=dev` reports zero production dependency vulnerabilities.

Browser tests use the **unchanged production manifest and bundle** in fresh, isolated profiles. Controlled archive/site responses make timing and visual regressions reproducible. They verify:

- The first uncached destination request occurs after automatic archive preparation; path, query and fragment are preserved locally and never sent to archive indexes.
- New sites need no enable/prepare action. Archive failure opens the current destination once, without a second lookup.
- Changed wrappers and input element types retain working live form controls and nested button labels.
- CSS cascade, external/inline imports, print conditions and raster sprite cropping are preserved. Pixel assertions check the selected sprite region.
- Long pages recover archived grid proportions while keeping current article text and natural row heights.
- Cached first visible frames are styled, with no archive requests or extension loading-page redirect.
- Incompatible structures roll back; continuing early prevents late repaint; concurrent navigations share work.
- Year changes purge other-year entries and cancel stale writes; current-year mode bypasses preparation.
- Strict page CSP, document-specific CSS insertion, independent cover expiry, pause/restore, cache clearing and direct popup controls work.

Unit tests additionally check archive response/decompression bounds, source/date validation, fallback selection, CSS sanitization, safe model decoding, repeat-route matching, cache LRU limits and generation races.

These tests establish behavior on their controlled inputs. They do not establish universal compatibility with arbitrary current websites or guarantee archive availability.

## Actual archive observations

Live checks use `node scripts/check-browser-live.mjs ORIGIN` in a fresh Chromium profile, with actual Wayback and website responses, no fixture routes, and no seeded profiles. Machine-readable outcomes are in [live-validation.json](live-validation.json). Failed live checks remain failed.

- **Google automatic lookup:** the bare homepage resolved to capture `20191231235918`, a different template from the supplied parameterized reference. The general matcher rejected that structure and revealed current styling. Automatic selection of the particular reference remains unverified; this must not be described as a successful Google restoration.
- **Python.org:** a real `20191231233039` capture was downloaded and measured. Inspection uncovered and fixed an insufficient generated-CSS size limit. The subsequent layout failed the readability check and rolled back to current styling.
- **Hacker News:** one real first visit applied a measured `20191231232500` profile. That run's repeat-visit check reported additional preparation, so it was not a complete pass. A later diagnostic run timed out while waiting for destination navigation. Controlled cache tests pass; a successful real-network repeat-visit run is not claimed here.

## Supplied Google reference: isolated parser comparison

Separately, the actual [December 29, 2019 reference](https://web.archive.org/web/20191229024955/https://www.google.com/?gws_rd=ssl) was downloaded and passed through the general inert renderer. Its measured model was seeded into a fresh extension profile to isolate parsing/matching from snapshot discovery. The destination was the actual current, anonymous Google homepage in dark mode.

The adapter recovered the source's 272 × 92 logo, 484 × 46 search container at (398, 317) in a 1280 × 800 viewport, light controls, button placement, and header links. The reference parser uses no Google-specific selectors or adapter. Some live decorations remain when archived graphics are unavailable.

**This is a source-specific parser comparison, not an automatic archive-discovery pass or a claim of pixel identity.** Google’s bare-homepage archive and the supplied query-bearing homepage differ. Archive downloads, diagnostic HTML, browser profiles and screenshots of live third-party content are excluded from version control and the package.

## Remaining limits

Historical HTML may be incomplete, use unavailable fonts/assets, or depend on scripts that net19 deliberately does not execute. Current markup can have different controls and behavior. Homepage models cannot faithfully reconstruct every subpage, closed shadow tree, canvas interface, SPA transition, or archived template variant. Successful capture measurement alone is not considered successful styling; the live page must also pass matching and readability checks.
