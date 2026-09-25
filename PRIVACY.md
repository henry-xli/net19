# net19 privacy policy

Effective September 24, 2026. Applies to net19 0.2.0.

Net19 prepares historical visual styling for live websites. It has no developer-operated server, account system, analytics, advertisements, remote AI, or telemetry.

## What leaves your device

With net19 enabled and Chrome website access granted, navigating to an uncached public site automatically queries the Internet Archive for its **public homepage origin** and the selected year. Net19 may download public archived HTML, a bounded number of archived stylesheets and imports, and small archived PNG branding/background graphics. Asset paths and query strings come from the public archive, not the current page. Net19 also prepares a fixed list of about 25 popular homepages in the background; the list is built into the extension, is the same for every user, and does not depend on your browsing.

Net19 does not transmit your visited path, query string, fragment, current page contents, form values, cookies, passwords, authentication tokens, or account data. Requests omit credentials and referrers. Remote connections made by the extension are restricted to `archive.org` and `web.archive.org`; its network policy also blocks redirects to other hosts.

The Internet Archive receives these public homepage/asset requests, timestamp queries, your network IP address, and normal connection metadata. Its [terms and privacy policy](https://archive.org/about/terms.php) apply. Net19 does not submit sites for archiving, bypass archive access controls, or send requests to Archive.is.

## Local processing and storage

Archived documents are sanitized and measured locally in a script-disabled, network-isolated browser frame. The extension examines the live page's labels, links, element structure, computed styles, and positions locally to match components. Current page data is not sent to an archive or saved as a profile. Archived scripts never run.

Chrome local extension storage contains:

- Settings: selected year, preparation timeout, enabled state, and paused hostnames.
- Up to 100 profiles: public origin, selected/capture year, snapshot URL, timestamps, and compressed computed measurements, component descriptors, and normalized raster graphics from the public archive.
- Up to 100 temporary failure entries to avoid repeated unavailable archive requests.

The profile/failure cache is limited to 4 MiB, with a 96 KiB limit per profile. Other-year and obsolete-format entries are removed on startup and year changes. No complete archived HTML/CSS documents, live page contents, or visited full URLs are persisted by net19.

During navigation, the local loading page temporarily holds the original destination in its URL fragment so it can continue to the correct address. It is not sent to the archive. Chrome session storage briefly holds a tab identifier, public origin, year, preparation result, and expiry; completed/closed tabs remove these entries, and entries expire logically after 90 seconds. A provider backoff timestamp can also be held in session storage. Chrome independently maintains its normal browsing history and network cache.

Cached origins and recency can reveal which sites you use. They stay on this device: net19 does not synchronize, sell, or share this cache with the developer or advertisers.

## Controls

Public HTTP(S) website access is requested at installation so preparation works automatically. You can restrict access in Chrome's extension controls, pause individual sites in the popup, or pause the extension in Settings. Incognito, IP/local addresses, non-default ports, browser pages, and archive sites are excluded.

Changing the year deletes other years' cache entries and cancels stale jobs. **Clear saved styles** removes profile/failure entries and cancels active lookups; preferences remain. Pausing immediately restores the current styling. Uninstalling removes the extension's storage.

Report questions through [the repository](https://github.com/henry-xli/net19/issues). Avoid posting private addresses, credentials, or personal page contents in public issues. Material changes to these practices will be reflected here and in the extension disclosures.
