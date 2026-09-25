import { currentYear, isPaused, SETTINGS_KEY, settingsFrom, type ProfileResult } from './shared';
import { loadingTarget, releaseNavigation } from './navigation';

// This page replaces an unprepared GET before the destination's network request is sent.
// It never embeds a live/archived document and never accepts messages from web pages.
void (async () => {
  const target = loadingTarget(location.href, chrome.runtime.getURL('loading.html'));
  if (!target || window !== window.top) return;
  const tab = await chrome.tabs.getCurrent();
  if (tab?.id === undefined || tab.incognito) return;
  const tabId = tab.id;
  const destination = target!;
  const origin = new URL(destination).origin;
  const title = document.getElementById('destination')!;
  const detail = document.getElementById('detail')!;
  const skip = document.getElementById('continue') as HTMLButtonElement;
  title.textContent = new URL(origin).hostname;
  const config = settingsFrom((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
  document.getElementById('year')!.textContent = String(config.year);
  let finished = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  async function finish(result: ProfileResult): Promise<void> {
    if (finished) return;
    finished = true;
    clearTimeout(timer); clearInterval(heartbeat);
    skip.disabled = true;
    try {
      const fresh = settingsFrom((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
      if (fresh.year !== config.year || isPaused(fresh, origin)) result = { reason: 'paused' };
      await releaseNavigation(tabId, destination, fresh.year, result);
      location.replace(destination);
    } catch {
      finished = false;
      skip.disabled = false;
      detail.textContent = 'Chrome could not continue this navigation. Try Continue, or turn net19 off in the Extensions menu.';
    }
  }
  skip.addEventListener('click', () => { void finish({ reason: 'timeout' }); });
  // The loading page can release itself even if its worker stops or the archive hangs.
  // Preparation keeps running in the worker after release, so the next visit is instant.
  timer = setTimeout(() => { void finish({ reason: 'timeout' }); }, config.waitMs);
  heartbeat = setInterval(() => { void chrome.runtime.sendMessage({ type: 'LOADING_PING' }).catch(() => undefined); }, 10_000);
  chrome.storage.onChanged.addListener((changes,area)=>{
    if (finished || area!=='local' || !changes[SETTINGS_KEY]) return;
    const fresh=settingsFrom(changes[SETTINGS_KEY].newValue);
    if (fresh.year!==config.year) location.reload();
    else if (isPaused(fresh,origin)) void finish({reason:'paused'});
  });
  if (!config.enabled || isPaused(config, origin) || config.year === currentYear()) { await finish({ reason: 'current' }); return; }
  try {
    const result = await chrome.runtime.sendMessage({ type: 'PREPARE_NAVIGATION' }) as ProfileResult;
    await finish(result?.pack || result?.reason ? result : { reason: 'unavailable' });
  } catch { await finish({ reason: 'unavailable' }); }
})().catch(() => { document.getElementById('detail')!.textContent = 'Unable to prepare this address. Turn net19 off in the Extensions menu to continue.'; });
