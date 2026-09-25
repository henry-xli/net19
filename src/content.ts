import { HARD_GATE_MS, SETTINGS_KEY, currentYear, isPaused, isStylePack, publicOrigin, settingsFrom, type PageStatus, type ProfileResult } from './shared';
import { decodeSnapshot } from './snapshot';
import { adapt, type Adaptation } from './adapt';

(() => {
  if (window !== window.top || chrome.extension.inIncognitoContext) return;
  const origin = publicOrigin(location.href);
  if (!origin) return;
  const start = performance.now();
  let deadline = 60_000, pending = true;
  const controller = new AbortController();
  let adaptation: Adaptation | null = null;
  let status: PageStatus = { state: 'waiting', elapsedMs: 0 };
  let overlay: HTMLDivElement | undefined;
  let rootObserver: MutationObserver | undefined;
  let timer = setTimeout(() => reveal('timeout'), deadline);

  function reveal(reason?: string): void {
    pending = false;
    clearTimeout(timer);
    rootObserver?.disconnect();
    overlay?.remove();
    if (status.state !== 'archived') { controller.abort(); adaptation?.cleanup(); document.documentElement?.removeAttribute('data-net19-styled'); }
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
    controller.abort(); adaptation?.cleanup();
    document.documentElement?.removeAttribute('data-net19-styled');
    status = { state: 'paused', elapsedMs: Math.round(performance.now() - start) };
    reveal();
  }

  async function settle(): Promise<void> {
    // Modern pages often install their header/controls just after DOMContentLoaded.
    // Measure after a short quiet period, with a strict cap for continuously updating pages.
    await new Promise<void>(resolve => {
      let quiet: ReturnType<typeof setTimeout>;
      const done = () => { clearTimeout(quiet); clearTimeout(limit); observer.disconnect(); window.removeEventListener('load',loaded); controller.signal.removeEventListener('abort',done); resolve(); };
      const settled = () => { if (document.readyState === 'complete') done(); };
      const loaded = () => { clearTimeout(quiet); quiet = setTimeout(done,180); };
      const observer = new MutationObserver(() => { clearTimeout(quiet); quiet = setTimeout(settled,180); });
      const limit = setTimeout(done,2500);
      observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden']});
      quiet = setTimeout(settled,180); window.addEventListener('load',loaded,{once:true}); controller.signal.addEventListener('abort',done,{once:true});
      if (controller.signal.aborted) done();
    });
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
        const snapshot = await decodeSnapshot(result.pack.snapshot);
        if (document.readyState === 'loading') await new Promise<void>(resolve => {
          document.addEventListener('DOMContentLoaded', () => resolve(), { once: true });
          controller.signal.addEventListener('abort', () => resolve(), { once: true });
        });
        if (!pending || controller.signal.aborted) return;
        await settle();
        if (!pending || controller.signal.aborted) return;
        adaptation = await adapt(snapshot, crypto.randomUUID(), controller.signal);
        if (!adaptation) { reveal('unmatched-layout'); return; }
        const installed = await chrome.runtime.sendMessage({ type: 'INSTALL_STYLE', css: adaptation.css, year: config.year });
        if (!pending || performance.now() - start >= deadline) { reveal('timeout'); return; }
        if (installed !== true) { reveal('style-rejected'); return; }
        // Activate only under the cover, validate the resulting controls/contrast, then
        // reveal in the same task. A late response never restyles a visible page.
        document.documentElement.setAttribute('data-net19-styled', result.pack.capturedAt.slice(0, 4));
        if (!adaptation.check()) { reveal('unreadable-layout'); return; }
        status = { state: 'archived', year: Number(result.pack.capturedAt.slice(0, 4)),
          elapsedMs: Math.round(performance.now() - start), cached: result.cached, snapshotUrl: result.pack.snapshotUrl, mode: adaptation.mode };
        reveal();
      } else reveal(result?.reason ?? 'unavailable');
    } catch { reveal('unavailable'); }
  })();
})();
