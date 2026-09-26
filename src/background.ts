import { settingsFrom, SETTINGS_KEY, type Settings } from './shared';
import { THEMES, themeMatches, themePaused, type HandmadeTheme } from './themes';
import { navigationRules } from './navigation';

let sync: Promise<unknown> = Promise.resolve();
let settingsWrites: Promise<unknown> = Promise.resolve();

async function settings(): Promise<Settings> {
  return settingsFrom((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
}

async function signedInThemes(): Promise<Set<string>> {
  const ids = new Set<string>();
  await Promise.all(THEMES.filter(theme => theme.legacy?.signedIn).map(async theme => {
    const cookie = await chrome.cookies.get(theme.legacy!.signedIn!).catch(() => null);
    if (cookie?.value) ids.add(theme.id);
  }));
  return ids;
}

// Registers each theme as a document_start stylesheet plus its config script and the shared palette engine, and
// installs the legacy-frontend navigation rules. Top-level pages only: embedded frames (account menus, players,
// ads) are transparent overlays drawn by their own origin. Scripts are only re-registered when the desired set
// changes, because an unregister/register cycle leaves a moment in which a loading page would miss its theme.
function syncScripts(): Promise<unknown> {
  sync = sync.catch(() => undefined).then(async () => {
    const [config, registered, signedIn] = await Promise.all([settings(), chrome.scripting.getRegisteredContentScripts(), signedInThemes()]);
    const active = (theme: HandmadeTheme) => config.enabled && !themePaused(theme, config.disabledHosts);
    const oldRules = await chrome.declarativeNetRequest.getDynamicRules();
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: oldRules.map(rule => rule.id),
      addRules: navigationRules(config, theme => signedIn.has(theme.id)) });
    const desired: chrome.scripting.RegisteredContentScript[] = THEMES.filter(active).map(theme => ({
      id: `net19-theme-${theme.id}`, matches: themeMatches(theme), css: [`themes/${theme.id}.css`],
      js: [`themes/${theme.id}.js`, 'themes/palette.js', 'themes/guard.js'], runAt: 'document_start', allFrames: false, persistAcrossSessions: true }));
    const signature = (list: chrome.scripting.RegisteredContentScript[]) => JSON.stringify(list.map(s => [s.id, s.matches, s.css, s.js]).sort());
    // Anything else registered by an earlier version (the archive pipeline's content script) is removed too.
    const current = registered.filter(script => script.id.startsWith('net19-'));
    if (signature(current) !== signature(desired)) {
      if (current.length) await chrome.scripting.unregisterContentScripts({ ids: current.map(script => script.id) });
      if (desired.length) await chrome.scripting.registerContentScripts(desired);
    }
  });
  return sync;
}

// Earlier versions kept archived style profiles and per-tab navigation rules. None of that is used any more.
async function cleanUp(): Promise<void> {
  const stored = await chrome.storage.local.get(null);
  const stale = Object.keys(stored).filter(key => key !== SETTINGS_KEY);
  if (stale.length) await chrome.storage.local.remove(stale);
  await chrome.storage.session.clear();
  const session = await chrome.declarativeNetRequest.getSessionRules();
  if (session.length) await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: session.map(rule => rule.id) });
}

function isPopup(sender: chrome.runtime.MessageSender): boolean {
  return sender.id === chrome.runtime.id && sender.url?.split(/[?#]/)[0] === chrome.runtime.getURL('popup.html');
}

async function handle(message: unknown, sender: chrome.runtime.MessageSender): Promise<unknown> {
  if (!message || typeof message !== 'object' || !isPopup(sender)) throw new Error('Invalid sender');
  const m = message as { type?: string; patch?: Partial<Settings> };
  if (m.type === 'STATE') return { settings: await settings() };
  if (m.type === 'SETTINGS') {
    const change = settingsWrites.catch(() => undefined).then(async () => {
      const config = settingsFrom({ ...await settings(), ...m.patch });
      await chrome.storage.local.set({ [SETTINGS_KEY]: config });
      await syncScripts();
      return config;
    });
    settingsWrites = change;
    return change;
  }
  throw new Error('Unknown net19 action');
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  void handle(message, sender).then(respond, () => respond({ error: 'net19 could not complete this action.' }));
  return true;
});
chrome.runtime.onInstalled.addListener(() => { void cleanUp().catch(() => undefined).then(syncScripts).catch(() => undefined); });
chrome.runtime.onStartup.addListener(() => { void syncScripts().catch(() => undefined); });
// Signing in or out of a site whose legacy frontend needs an account switches its redirect on or off.
const sessionCookies = THEMES.flatMap(theme => theme.legacy?.signedIn ? [theme.legacy.signedIn.name] : []);
chrome.cookies.onChanged.addListener(({ cookie }) => { if (sessionCookies.includes(cookie.name)) void syncScripts().catch(() => undefined); });
