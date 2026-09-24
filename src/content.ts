import { HARD_GATE_MS, SETTINGS_KEY, currentYear, isPaused, isStylePack, publicOrigin, settingsFrom, type PageStatus, type ProfileResult } from './shared';

(() => {
  if (window !== window.top || chrome.extension.inIncognitoContext) return;
  const origin = publicOrigin(location.href);
  if (!origin) return;
  const start = performance.now();
  let deadline = 2200, pending = true;
  let status: PageStatus = { state: 'waiting', elapsedMs: 0 };
  let overlay: HTMLDivElement | undefined;
  let rootObserver: MutationObserver | undefined;
  let timer = setTimeout(() => reveal('timeout'), deadline);

  function reveal(reason?: string): void {
    pending = false;
    clearTimeout(timer);
    rootObserver?.disconnect();
    overlay?.remove();
    if (status.state === 'waiting') status = { state: 'current', elapsedMs: Math.round(performance.now() - start), reason };
  }

  function gate(): void {
    if (!pending || performance.now() - start >= deadline || !document.documentElement) return;
    overlay = document.createElement('div');
    overlay.id = 'net19-loading-screen';
    overlay.setAttribute('aria-hidden', 'true');
    // No website is hidden without the independently expiring, bundled gate stylesheet.
    document.documentElement.append(overlay);
    rootObserver?.disconnect();
  }

  if (document.documentElement) gate();
  else {
    rootObserver = new MutationObserver(gate);
    rootObserver.observe(document, { childList: true });
  }

  function restore(): void {
    document.documentElement?.removeAttribute('data-net19-styled');
    status = { state: 'paused', elapsedMs: Math.round(performance.now() - start) };
    reveal();
  }

  chrome.runtime.onMessage.addListener((message, sender, respond) => {
    if (sender.id !== chrome.runtime.id) return;
    if (message?.type === 'PAGE_STATUS') respond(status);
    if (message?.type === 'RESTORE') { restore(); respond(true); }
    if (message?.type === 'ACCESS_CHANGED') {
      void chrome.runtime.sendMessage({ type: 'ACCESS' }).then(allowed => { if (allowed !== true) restore(); }, restore);
      respond(true);
    }
  });
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[SETTINGS_KEY]) {
      const config = settingsFrom(changes[SETTINGS_KEY].newValue);
      if (isPaused(config, origin)) restore();
      // Changing the year affects future navigations, never unexpectedly repaints this one.
      else if (pending) reveal('settings-changed');
    }
  });
  window.addEventListener('pagehide', () => reveal('navigation'), { once: true });

  void (async () => {
    try {
      const config = settingsFrom((await chrome.storage.local.get(SETTINGS_KEY))[SETTINGS_KEY]);
      if (isPaused(config, origin)) { restore(); return; }
      if (config.year === currentYear()) { reveal('current-year'); return; }
      deadline = config.waitMs;
      clearTimeout(timer);
      const left = Math.min(deadline, HARD_GATE_MS - 100) - (performance.now() - start);
      if (left <= 0) reveal('timeout');
      else timer = setTimeout(() => reveal('timeout'), left);
      const result = await chrome.runtime.sendMessage({ type: 'PROFILE' }) as ProfileResult;
      if (!pending || performance.now() - start >= deadline) { reveal('timeout'); return; }
      if (isStylePack(result?.pack, origin, config.year)) {
        // CSS was inserted while inert by the worker. Activating it and removing the gate
        // happen in one JavaScript task, before the browser's next paint opportunity.
        document.documentElement.setAttribute('data-net19-styled', result.pack.capturedAt.slice(0, 4));
        status = { state: 'archived', year: Number(result.pack.capturedAt.slice(0, 4)),
          elapsedMs: Math.round(performance.now() - start), cached: result.cached, snapshotUrl: result.pack.snapshotUrl };
        reveal();
      } else reveal(result?.reason ?? 'unavailable');
    } catch { reveal('unavailable'); }
  })();
})();
