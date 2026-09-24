# net19 privacy policy

Effective date: September 24, 2026. Applies to net19 0.1.0.

Net19 adapts historical website styling to the current web. It has no developer-operated backend, account system, analytics, advertisements, remote AI, or telemetry.

## What leaves your device

Only after you enable site access, net19 queries the Internet Archive's Wayback Machine for the site's **public homepage origin**, such as `https://example.com/`, and your selected year. It may fetch that public archived HTML and a bounded number of its archived stylesheets. Public stylesheet addresses found in the archived HTML may include their original asset query strings; these come from the public snapshot, never from the live page.

The visited path, query string, fragment, page contents, form values, cookies, passwords, authentication tokens, and account data are not sent by net19. Requests omit credentials and referrers. All remote requests go to `archive.org` or `web.archive.org`; the extension's network policy also blocks redirects to other destinations.

The Internet Archive receives the requested public homepage/asset addresses, timestamp queries, your network IP address, and ordinary connection metadata necessary to serve these requests. Its [terms and privacy policy](https://archive.org/about/terms.php) apply to those requests. Net19 does not submit pages for archiving. No requests are made to Archive.is.

## What is stored locally

Chrome's local extension storage holds:

- Preferences: destination year, maximum waiting time, enabled state, and paused-site hostnames.
- Up to 100 historical style profiles: public site origin, selected year, capture timestamp, source snapshot URL, locally generated CSS, a small color palette, creation time, and last-used time.
- Up to 100 short-lived failure entries, which reduce repeated requests for unavailable archives.

The total style cache has a 4 MiB budget. An additional short-lived service-worker backoff timestamp may be kept in Chrome session storage. Open tab identifiers are briefly queried to notify existing content scripts when permissions are removed; they are not persisted or transmitted.

The cache is browsing-related metadata: its site addresses and last-used times can indicate which enabled sites you use. It is stored on this device, not sent to the developer, synchronized by net19, sold, or shared for advertising. Net19 does not save full archived pages or current page contents. Chrome may separately maintain its normal HTTP cache for public archive requests.

## Your choices

Website access is requested for a single site when you choose **Enable on this site**, or broadly when you explicitly choose **Enable on all public sites** in Settings. The Internet Archive hosts are declared permissions needed for archive lookups. You can remove site access through net19 Settings or Chrome's extension controls.

Pause net19 globally or for one site to restore the current styling. **Clear saved styles** removes the local profile/failure cache and cancels active lookups. Preferences and Chrome-granted permissions remain. Uninstalling net19 removes its extension storage. Private/IP/local URLs, browser pages, archive sites, and incognito are excluded.

## Questions or changes

Report privacy questions through the [net19 repository](https://github.com/henry-xli/net19/issues). Do not post private addresses, credentials, or personal page contents in a public issue. Material changes to data handling will be reflected in this policy and the extension's disclosures.
