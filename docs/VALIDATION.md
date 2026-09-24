# Validation of 0.1.0

Initial release validation: September 24, 2026, on macOS using real Chromium 153 and Node.js 24.

## Deterministic checks

- TypeScript strict checks passed.
- 24 unit/integration tests passed, covering target-year bounds, HTTP-to-HTTPS archive lookup, URL privacy, capture validation, inert HTML/CSS parsing, unsafe CSS rejection, contrast fallback, CSS imports/variables, gzip replay decoding and expansion limits, request cancellation, LRU eviction, simultaneous writes, negative-cache expiration, and clearing during in-flight work.
- 11 browser tests passed against the bundled extension in real Chromium: cached paint ordering and no reload; cold archived styling; raw gzip replay CSS; delayed response warming without a later repaint; archive outage; shared concurrent jobs; current-year bypass; strict page CSP and document isolation across navigation; the independent CSS gate expiry; settings/clear/pause; and popup/year controls.
- The cache test requires the first archived-style frame within 500 ms on a controlled local fixture, with **zero visible unstyled frames, zero archive requests, and one page load**. This is a local regression assertion, not a claim about Internet Archive latency or every website.
- The independent gate test verifies that an abandoned overlay becomes hidden and non-interactive without JavaScript removal.
- `npm audit` reported zero known dependency vulnerabilities at validation time.
- The shipping archive uses an explicit file allowlist, contains bundled executable code, and excludes test fixtures, browser profiles, developer logs, and environment files.

Browser tests use a copy of the real production bundle with **only** two extra required fixture origins in its test manifest. Archived responses are controlled at the network boundary. Production optional permissions, CSS, scripts, analyzer and cache code are retained. For popup screenshots, the current-tab query is supplied with the real fixture tab ID because a normal toolbar popup is not itself a browser tab.

## Live archive evidence and limits

Initial checks on `www.wikipedia.org` and `www.python.org` encountered index timeouts and unusable styling. Investigation found raw gzip CSS bytes in a Wayback `id_` response whose headers did not instruct fetch to decompress it. The final client detects this format and bounds both compressed and expanded bytes.

After that correction, a **live Wayback request for `www.python.org` produced a usable profile from capture `20190701215108` in 2,963 ms**, including real archived HTML/CSS downloads and local analysis. This exceeded the default page reveal budget, illustrating why background warming and the next-visit cache path are necessary.

A separate **live Chromium check** then visited the actual Python.org homepage using a fresh browser profile and the bundled extension. It acquired the July 2019 profile in 3,022 ms. On the next normal test navigation, the content script applied the cached style in **14 ms**, with **zero archive requests** during that visit. See [the recorded result](live-validation.json). Run `node scripts/check-browser-live.mjs` after a build to reproduce this optional external check; it does not use the user's browser profile.

Those results demonstrate one real capture, not broad real-site coverage or a latency guarantee. Deterministic browser tests and live probes are recorded separately. The measured local cached fixture produced its first styled frame in approximately 37 ms, with zero visible unstyled frames, zero archive requests, and a single navigation. Timing for cached style application excludes the live website's own network loading time.

Run `npm run check:archive` to repeat an explicit, bounded live check on the default public homepages. Its local output is `artifacts/live-archive-check.json`; exit status 1 records that no usable profile was obtained. This external availability check is kept separate from deterministic CI.

## Release boundaries

The public ZIP and its SHA-256 checksum are in `downloads/`. Store listing text, permission explanations, privacy disclosures and visual assets are provided. Chrome Web Store submission and approval are separate from publishing the repository.

No arbitrary-site compatibility, exact historical layout reconstruction, guaranteed cold-load speed, or store approval is claimed. A site can always be paused to recover its current styling.
