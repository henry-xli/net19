import { ArchiveError, WaybackClient } from './archive';
import { ProfileCache } from './cache';
import { renderSnapshot } from './render';
import { WARM_BUDGET_MS, currentYear, isPaused, publicOrigin, settingsFrom, SETTINGS_KEY, type ProfileResult, type Settings } from './shared';
import { THEMES, themeFor, themeMatches, themedDomains } from './themes';
import { loadingTarget, navigationKey, navigationRules, releaseRuleId, type PreparedNavigation } from './navigation';

const cache = new ProfileCache(chrome.storage.local);
const archive = new WaybackClient(fetch.bind(globalThis), renderSnapshot);
const inflight = new Map<string, { promise: Promise<ProfileResult>; controller: AbortController }>();
let failures = 0;
let registration: Promise<unknown> = Promise.resolve();
let settingsWrites: Promise<unknown> = Promise.resolve();
let activeJobs = 0;
const queue: Array<() => void> = [];
const initialized = settings().then(config => cache.retainYear(config.year));

function slot(signal: AbortSignal): Promise<() => void> {
  return new Promise((resolve, reject) => {
    const start = () => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) { reject(new Error('Cancelled')); return; }
      activeJobs++;
      resolve(() => { activeJobs--; queue.shift()?.(); });
    };
    const abort = () => { const index = queue.indexOf(start); if (index >= 0) queue.splice(index, 1); reject(new Error('Cancelled')); };
    if (signal.aborted) { reject(new Error('Cancelled')); return; }
    if (activeJobs < 2) start();
    else { queue.push(start); signal.addEventListener('abort', abort, { once: true }); }
  });
}

async function settings(): Promise<Settings> {
  return settingsFrom((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
}

async function allowed(origin: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [`${origin}/*`] });
}

async function profile(origin: string): Promise<ProfileResult> {
  await initialized;
  const config = await settings();
  if (isPaused(config, origin) || !await allowed(origin)) return { reason: 'paused' };
  if (config.year === currentYear()) return { reason: 'current' };
  const hit = await cache.read(origin, config.year);
  if (hit) { void cache.touch(origin, config.year).catch(() => undefined); return hit; }
  const key = `${origin}:${config.year}`;
  const pending = inflight.get(key);
  if (pending) return pending.promise;
  if (inflight.size >= 100) return { reason: 'busy' };
  const until = (await chrome.storage.session.get('archive-backoff'))['archive-backoff'];
  if (typeof until === 'number' && until > Date.now()) return { reason: 'unavailable' };
  // Recheck after the asynchronous backoff read: two same-origin navigations can race.
  if (inflight.has(key)) return inflight.get(key)!.promise;
  if (inflight.size >= 100) return { reason: 'busy' };
  const revision = cache.revision();
  const controller = new AbortController();
  // Independent of the navigation wait: a slow lookup still completes and is cached, so
  // a released first visit is followed by an instant second visit.
  const timer = setTimeout(() => controller.abort(), WARM_BUDGET_MS);
  const promise = (async (): Promise<ProfileResult> => {
    let release: (() => void) | undefined;
    try {
      release = await slot(controller.signal);
      const pack = await archive.load(origin, config.year, controller.signal);
      const fresh = await settings();
      if (controller.signal.aborted || revision !== cache.revision() || fresh.year !== config.year || isPaused(fresh, origin) || !await allowed(origin)) return { reason: 'paused' };
      // A full disk must not prevent an already downloaded profile from being used.
      await cache.put(pack, revision).catch(() => undefined);
      await syncScripts();
      failures = 0;
      return { pack, cached: false };
    } catch (error) {
      if (controller.signal.aborted || revision !== cache.revision()) return { reason: 'paused' };
      const reason = error instanceof ArchiveError ? error.reason : 'unavailable';
      if (reason === 'unavailable' && ++failures >= 3) {
        await chrome.storage.session.set({ 'archive-backoff': Date.now() + 60_000 }).catch(() => undefined);
        failures = 0;
      }
      await cache.miss(origin, config.year, reason, revision).catch(() => undefined);
      return { reason };
    } finally { clearTimeout(timer); release?.(); inflight.delete(key); }
  })();
  inflight.set(key, { promise, controller });
  return promise;
}

// Popular homepages are prepared ahead of time, one at a time and only while no visit is
// being prepared, so their first visit is instant. The list is identical for every user,
// so these lookups reveal nothing about browsing. Results use the ordinary bounded cache.
export const POPULAR = ['https://www.google.com','https://www.youtube.com','https://www.facebook.com','https://www.wikipedia.org',
  'https://en.wikipedia.org','https://www.amazon.com','https://www.reddit.com','https://www.yahoo.com','https://www.bing.com',
  'https://github.com','https://stackoverflow.com','https://www.linkedin.com','https://www.instagram.com','https://twitter.com',
  'https://www.netflix.com','https://www.ebay.com','https://www.cnn.com','https://www.nytimes.com','https://www.bbc.com',
  'https://www.espn.com','https://www.apple.com','https://www.microsoft.com','https://www.twitch.tv','https://www.imdb.com',
  'https://news.ycombinator.com'];
const WARM_KEY = 'warmed-year';
let warming: Promise<void> | null = null;
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
function warmPopular(delayMs = 45_000): Promise<void> {
  warming ??= (async () => {
    await initialized;
    await pause(delayMs);
    let outages = 0;
    for (const origin of POPULAR) {
      const config = await settings();
      if (!config.enabled || config.year === currentYear()) return;
      if ((await chrome.storage.local.get(WARM_KEY))[WARM_KEY] === config.year) return;
      // Visits always come first.
      while (activeJobs > 0 || inflight.size > 0) await pause(2_000);
      if (isPaused(config, origin) || themeFor(new URL(origin).hostname, config.year) || await cache.read(origin, config.year)) continue;
      const result = await profile(origin);
      if (result.reason === 'unavailable' && ++outages >= 2) return; // archive outage: retry on next start
      if (!result.pack && result.reason === 'paused') return;          // year changed or cache cleared mid-run
      await pause(2_000); // be gentle with the Internet Archive
    }
    const config = await settings();
    await chrome.storage.local.set({ [WARM_KEY]: config.year });
  })().catch(() => undefined).finally(() => { warming = null; });
  return warming;
}

function syncScripts(): Promise<unknown> {
  registration = registration.catch(() => undefined).then(async () => {
    await initialized;
    const [permissions, config, registered] = await Promise.all([
      chrome.permissions.getAll(), settings(), chrome.scripting.getRegisteredContentScripts(),
    ]);
    const matches = (permissions.origins ?? []).filter(p =>
      !/^https?:\/\/(?:web\.)?archive\.org\//.test(p));
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRules.map(r => r.id),
      addRules: matches.length ? navigationRules(config, await cache.readyOrigins(), chrome.runtime.getURL('loading.html'), themedDomains(config.year),
        THEMES.filter(t => t.query && config.year >= t.years[0] && config.year <= t.years[1]).map(t => t.query!)) : [] });
    const active = config.enabled && config.year !== currentYear() && matches.length > 0;
    const paused = config.disabledHosts.map(h => `*://${h}/*`);
    // Handmade themes are content-script stylesheets plus a config script and the shared palette engine. Top-level
    // pages only: embedded frames (account menus, players, ads) are transparent overlays drawn by their own origin.
    // They are only re-registered when the desired set actually changes: this runs after every cached profile, and
    // an unregister/register cycle leaves a window in which a loading page would miss its theme.
    const desired: chrome.scripting.RegisteredContentScript[] = active ? THEMES
      .filter(theme => config.year >= theme.years[0] && config.year <= theme.years[1])
      .map(theme => ({ id: `net19-theme-${theme.id}`, matches: themeMatches(theme), css: [`themes/${theme.id}.css`],
        js: [`themes/${theme.id}.js`, 'themes/palette.js'], runAt: 'document_start', allFrames: false, persistAcrossSessions: true,
        ...(paused.length ? { excludeMatches: paused } : {}) } as chrome.scripting.RegisteredContentScript)) : [];
    const signature = (list: chrome.scripting.RegisteredContentScript[]) => JSON.stringify(list.map(s => [s.id, s.matches, s.excludeMatches ?? []]).sort());
    const current = registered.filter(s => s.id.startsWith('net19-theme-'));
    if (signature(current) !== signature(desired)) {
      if (current.length) await chrome.scripting.unregisterContentScripts({ ids: current.map(s => s.id) });
      if (desired.length) await chrome.scripting.registerContentScripts(desired);
    }
    if (!active) {
      if (registered.some(s => s.id === 'net19-start')) await chrome.scripting.unregisterContentScripts({ ids: ['net19-start'] });
      return;
    }
    const spec: chrome.scripting.RegisteredContentScript = {
      id: 'net19-start', matches, js: ['content.js'], css: ['gate.css'], runAt: 'document_start',
      allFrames: false, persistAcrossSessions: true,
      excludeMatches: [
        '*://archive.org/*', '*://*.archive.org/*', '*://archive.is/*', '*://archive.today/*', '*://archive.ph/*',
        '*://chromewebstore.google.com/*', '*://localhost/*', '*://*.localhost/*', '*://*.local/*',
        ...paused,
        // Sites with a handmade theme never go through the archive pipeline.
        ...themedDomains(config.year).flatMap(domain => [`*://${domain}/*`, `*://*.${domain}/*`]),
      ],
    };
    if (registered.some(s => s.id === spec.id)) await chrome.scripting.updateContentScripts([spec]);
    else await chrome.scripting.registerContentScripts([spec]);
  });
  return registration;
}

function isUI(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id && sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('popup.html');
}

async function handle(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  if (!message || typeof message !== 'object' || sender.id !== chrome.runtime.id) throw new Error('Invalid sender');
  const m = message as { type?: string; patch?: Partial<Settings>; origin?: string; css?: string; year?: number };
  const destination = sender.url && loadingTarget(sender.url, chrome.runtime.getURL('loading.html'));
  if (m.type === 'PREPARE_NAVIGATION' || m.type === 'LOADING_PING') {
    if (!destination || sender.frameId !== 0 || sender.tab?.id === undefined || sender.tab.incognito) return { reason: 'unsupported' };
    if (m.type === 'LOADING_PING') return true;
    return profile(new URL(destination).origin);
  }
  if (m.type === 'ACCESS') {
    const origin = sender.url && publicOrigin(sender.url);
    return !!origin && sender.frameId === 0 && !sender.tab?.incognito &&
      !isPaused(await settings(), origin) && await allowed(origin);
  }
  if (m.type === 'PROFILE') {
    const origin = sender.url && publicOrigin(sender.url);
    if (!origin || sender.frameId !== 0 || !sender.tab?.id || !sender.documentId || sender.tab.incognito) return { reason: 'unsupported' };
    const key = navigationKey(sender.tab.id);
    const prepared = (await chrome.storage.session.get(key))[key] as PreparedNavigation | undefined;
    const current = await settings();
    const result = prepared && prepared.expiresAt > Date.now() && prepared.year === current.year &&
      new URL(prepared.origin).hostname.replace(/^www\./, '') === new URL(origin).hostname.replace(/^www\./, '') ? prepared.result : await profile(origin);
    await chrome.storage.session.remove(key);
    return result;
  }
  if (m.type === 'INSTALL_STYLE') {
    const origin = sender.url && publicOrigin(sender.url);
    if (!origin || sender.frameId !== 0 || sender.tab?.id === undefined || !sender.documentId || sender.tab.incognito) return false;
    const config = await settings();
    if (isPaused(config, origin) || m.year !== config.year || !await allowed(origin)) return false;
    if (typeof m.css !== 'string' || m.css.length > 524_288 || !m.css.startsWith('/* net19 generated */\n') || /url\s*\(|@|expression|[<\\]/i.test(m.css)) return false;
    // Only generated selectors from the isolated matcher are accepted. Archive selectors
    // never enter the live document; every rule is inert until this document opts in.
    if (!m.css.split('\n').slice(1).every(line => /^html\[data-net19-styled\]\[data-net19-session="[a-f0-9-]{36}"\](?: (?:body|\[data-net19-(?:node="\d+"|replaced|contents|extra|background|layer|icon|role="(?:surface|text|prose|font|heading|link|button|field|header|header-text|footer)")\](?: :where\(span,b,strong,em,i,div\)| > :not\(\[data-net19-layer\]\))?|\[role="(?:listbox|option)"\]))?\{[^{}]*\}$/.test(line))) return false;
    try { await chrome.scripting.insertCSS({ target: { tabId: sender.tab.id, documentIds: [sender.documentId] }, css: m.css, origin: 'USER' }); return true; }
    catch { return false; }
  }
  if (!isUI(sender)) throw new Error('This action requires the extension interface');
  if (m.type === 'STATE') {
    await initialized;
    const [config, stats, permissions] = await Promise.all([settings(), cache.stats(), chrome.permissions.getAll()]);
    return { settings: config, cache: stats, origins: permissions.origins ?? [] };
  }
  if (m.type === 'SETTINGS') {
    const change = settingsWrites.catch(() => undefined).then(async () => {
      await initialized;
      const previous = await settings();
      const config = settingsFrom({ ...previous, ...m.patch });
      config.disabledHosts = config.disabledHosts.filter(host => publicOrigin(`https://${host}`));
      if (config.year !== previous.year || !config.enabled) for (const item of inflight.values()) item.controller.abort();
      if (config.year !== previous.year || config.enabled !== previous.enabled) void warmPopular();
      if (config.year !== previous.year) {
        await cache.retainYear(config.year);
        await chrome.storage.session.remove('archive-backoff');
        failures = 0;
      }
      await chrome.storage.local.set({ [SETTINGS_KEY]: config });
      await syncScripts();
      return config;
    });
    settingsWrites = change;
    return change;
  }
  if (m.type === 'CLEAR') {
    for (const item of inflight.values()) item.controller.abort();
    await cache.clear();
    await chrome.storage.local.remove(WARM_KEY);
    await chrome.storage.session.remove('archive-backoff');
    failures = 0;
    await syncScripts();
    return cache.stats();
  }
  if (m.type === 'SYNC') { await syncScripts(); return true; }
  if (m.type === 'CACHED') {
    const origin = typeof m.origin === 'string' && publicOrigin(m.origin);
    return origin ? cache.read(origin, (await settings()).year) : null;
  }
  throw new Error('Unknown net19 action');
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (message?.target === 'offscreen') return;
  void handle(message, sender).then(respond, () => respond({ error: 'net19 could not complete this action.' }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => { void syncScripts().catch(() => undefined); });
// Every worker start resumes an unfinished warm-up; it stops at once when already done.
void warmPopular();
chrome.runtime.onStartup.addListener(() => { void syncScripts().catch(() => undefined); });
chrome.permissions.onAdded.addListener(() => { void syncScripts().catch(() => undefined); });
chrome.permissions.onRemoved.addListener(() => {
  for (const item of inflight.values()) item.controller.abort();
  void syncScripts().catch(() => undefined);
  // Query tab IDs afresh: an MV3 worker may have slept since a page was styled.
  // Each surviving content script asks whether its own origin still has access.
  void chrome.tabs.query({}).then(tabs => {
    for (const tab of tabs) if (tab.id) void chrome.tabs.sendMessage(tab.id, { type: 'ACCESS_CHANGED' }).catch(() => undefined);
  }).catch(() => undefined);
});

function committed(tabId: number): void {
  void chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [releaseRuleId(tabId)] }).catch(() => undefined);
}
chrome.webNavigation.onCommitted.addListener(details => { if (details.frameId === 0 && publicOrigin(details.url)) committed(details.tabId); });
chrome.webNavigation.onErrorOccurred.addListener(details => { if (details.frameId === 0 && publicOrigin(details.url)) committed(details.tabId); });
chrome.tabs.onRemoved.addListener(tabId => { committed(tabId); void chrome.storage.session.remove(navigationKey(tabId)).catch(() => undefined); });
