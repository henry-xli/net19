import { ArchiveError, WaybackClient } from './archive';
import { ProfileCache } from './cache';
import { currentYear, isPaused, publicOrigin, settingsFrom, SETTINGS_KEY, type ProfileResult, type Settings } from './shared';

const cache = new ProfileCache(chrome.storage.local);
const archive = new WaybackClient();
const inflight = new Map<string, { promise: Promise<ProfileResult>; controller: AbortController }>();
let failures = 0;
let registration: Promise<unknown> = Promise.resolve();

async function settings(): Promise<Settings> {
  return settingsFrom((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
}

async function allowed(origin: string): Promise<boolean> {
  return chrome.permissions.contains({ origins: [`${origin}/*`] });
}

async function profile(origin: string): Promise<ProfileResult> {
  const config = await settings();
  if (isPaused(config, origin) || !await allowed(origin)) return { reason: 'paused' };
  if (config.year === currentYear()) return { reason: 'current' };
  const hit = await cache.read(origin, config.year);
  if (hit) { void cache.touch(origin, config.year).catch(() => undefined); return hit; }
  const key = `${origin}:${config.year}`;
  const pending = inflight.get(key);
  if (pending) return pending.promise;
  if (inflight.size >= 2) return { reason: 'busy' };
  const until = (await chrome.storage.session.get('archive-backoff'))['archive-backoff'];
  if (typeof until === 'number' && until > Date.now()) return { reason: 'unavailable' };
  // Recheck after the asynchronous backoff read: two same-origin navigations can race.
  if (inflight.has(key)) return inflight.get(key)!.promise;
  if (inflight.size >= 2) return { reason: 'busy' };
  const revision = cache.revision();
  const controller = new AbortController();
  const promise = (async (): Promise<ProfileResult> => {
    try {
      const pack = await archive.load(origin, config.year, controller.signal);
      const fresh = await settings();
      if (controller.signal.aborted || revision !== cache.revision() || isPaused(fresh, origin) || !await allowed(origin)) return { reason: 'paused' };
      // A full disk must not prevent an already downloaded profile from being used.
      await cache.put(pack, revision).catch(() => undefined);
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
    } finally { inflight.delete(key); }
  })();
  inflight.set(key, { promise, controller });
  return promise;
}

function syncScripts(): Promise<unknown> {
  registration = registration.catch(() => undefined).then(async () => {
    const [permissions, config, registered] = await Promise.all([
      chrome.permissions.getAll(), settings(), chrome.scripting.getRegisteredContentScripts(),
    ]);
    const matches = (permissions.origins ?? []).filter(p =>
      !/^https?:\/\/(?:web\.)?archive\.org\//.test(p));
    if (!config.enabled || !matches.length) {
      if (registered.some(s => s.id === 'net19-start')) await chrome.scripting.unregisterContentScripts({ ids: ['net19-start'] });
      return;
    }
    const spec: chrome.scripting.RegisteredContentScript = {
      id: 'net19-start', matches, js: ['content.js'], css: ['gate.css'], runAt: 'document_start',
      allFrames: false, persistAcrossSessions: true,
      excludeMatches: [
        '*://archive.org/*', '*://*.archive.org/*', '*://archive.is/*', '*://archive.today/*', '*://archive.ph/*',
        '*://chromewebstore.google.com/*', '*://localhost/*', '*://*.localhost/*', '*://*.local/*',
        ...config.disabledHosts.map(h => `*://${h}/*`),
      ],
    };
    if (registered.some(s => s.id === spec.id)) await chrome.scripting.updateContentScripts([spec]);
    else await chrome.scripting.registerContentScripts([spec]);
  });
  return registration;
}

function isUI(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id && ['popup.html', 'options.html'].some(path => sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL(path));
}

async function handle(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  if (!message || typeof message !== 'object' || sender.id !== chrome.runtime.id) throw new Error('Invalid sender');
  const m = message as { type?: string; patch?: Partial<Settings>; origin?: string };
  if (m.type === 'ACCESS') {
    const origin = sender.url && publicOrigin(sender.url);
    return !!origin && sender.frameId === 0 && !sender.tab?.incognito &&
      !isPaused(await settings(), origin) && await allowed(origin);
  }
  if (m.type === 'PROFILE') {
    const origin = sender.url && publicOrigin(sender.url);
    if (!origin || sender.frameId !== 0 || !sender.tab?.id || !sender.documentId || sender.tab.incognito) return { reason: 'unsupported' };
    const result = await profile(origin);
    if (result.pack) {
      const config = await settings();
      if (isPaused(config, origin) || config.year !== result.pack.targetYear || !await allowed(origin)) return { reason: 'paused' };
      // Two-phase paint: this stylesheet is inert until THIS document activates its attribute.
      // A late response or navigation cannot restyle the visible page or the next document.
      try {
        await chrome.scripting.insertCSS({ target: { tabId: sender.tab.id, documentIds: [sender.documentId] }, css: result.pack.css, origin: 'USER' });
      } catch { return { reason: 'unavailable' }; }
    }
    return result;
  }
  if (!isUI(sender)) throw new Error('This action requires the extension interface');
  if (m.type === 'STATE') {
    const [config, stats, permissions] = await Promise.all([settings(), cache.stats(), chrome.permissions.getAll()]);
    return { settings: config, cache: stats, origins: permissions.origins ?? [] };
  }
  if (m.type === 'SETTINGS') {
    const config = settingsFrom({ ...await settings(), ...m.patch });
    // Stored host exclusions must also be valid Chrome match patterns.
    config.disabledHosts = config.disabledHosts.filter(host => publicOrigin(`https://${host}`));
    await chrome.storage.local.set({ [SETTINGS_KEY]: config });
    if (!config.enabled) for (const item of inflight.values()) item.controller.abort();
    await syncScripts();
    return config;
  }
  if (m.type === 'CLEAR') {
    for (const item of inflight.values()) item.controller.abort();
    await cache.clear();
    await chrome.storage.session.remove('archive-backoff');
    failures = 0;
    return cache.stats();
  }
  if (m.type === 'SYNC') { await syncScripts(); return true; }
  if (m.type === 'WARM') {
    const origin = typeof m.origin === 'string' && publicOrigin(m.origin);
    if (!origin) return { reason: 'unsupported' };
    return profile(origin);
  }
  if (m.type === 'CACHED') {
    const origin = typeof m.origin === 'string' && publicOrigin(m.origin);
    return origin ? cache.read(origin, (await settings()).year) : null;
  }
  throw new Error('Unknown net19 action');
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  void handle(message, sender).then(respond, () => respond({ error: 'net19 could not complete this action.' }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => { void syncScripts().catch(() => undefined); });
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
