import { currentYear, publicOrigin, type PageStatus, type ProfileResult, type Settings } from './shared';
import { action, announce, element, send, type State } from './ui';

let state: State;
let tab: chrome.tabs.Tab | undefined;
let origin: string | null = null;
let granted = false;
let warming = false;
const yearInput = element<HTMLInputElement>('year');
const power = element<HTMLInputElement>('power');
const primary = element<HTMLButtonElement>('primary');
const warm = element<HTMLButtonElement>('warm');
const pauseSite = element<HTMLInputElement>('pause-site');

function showYear(year: number): void {
  yearInput.value = String(year);
  element('destination').textContent = String(year);
  element('year-hint').textContent = year === currentYear() ? 'The web, as it is today.' : 'A familiar feeling. A living web.';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-year]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.year) === year));
  }
}

function paint(): void {
  showYear(state.settings.year);
  power.checked = state.settings.enabled;
  element('power-state').textContent = power.checked ? 'On' : 'Off';
  element('cache-count').textContent = String(state.cache.count);
  element<HTMLProgressElement>('cache-meter').value = state.cache.count;
  const host = origin ? new URL(origin).hostname : null;
  element('site-name').textContent = host ?? 'Your next destination';
  element('site-pause-row').hidden = !granted || !host;
  pauseSite.checked = !!host && state.settings.disabledHosts.includes(host);
  primary.hidden = granted || !origin;
  element('access-disclosure').hidden = granted || !origin;
  warm.hidden = !granted || !origin;
  warm.disabled = warming || !state.settings.enabled || pauseSite.checked || state.settings.year === currentYear();
  element('site-detail').textContent = !origin ? 'Open a public website to get started.' :
    !state.settings.enabled ? 'Paused everywhere. Current styles stay in place.' :
      pauseSite.checked ? 'This site uses its current style.' :
        !granted ? 'Enable once. Travel back on your next page load.' : 'Ready for your next page load.';
  element('site-state').textContent = !granted ? 'NOT ENABLED' : !state.settings.enabled || pauseSite.checked ? 'PAUSED' : 'ENABLED';
}

async function status(): Promise<void> {
  if (!origin || !granted || !state.settings.enabled || pauseSite.checked) return;
  let page: PageStatus | null = null;
  try { if (tab?.id) page = await chrome.tabs.sendMessage(tab.id, { type: 'PAGE_STATUS' }); } catch { /* Newly granted tabs have no content script yet. */ }
  if (page?.state === 'archived') {
    element('site-state').textContent = `STYLE · ${page.year}`;
    element('site-detail').textContent = `${page.cached ? 'From local storage' : 'From the Wayback Machine'} · ready in ${page.elapsedMs} ms`;
    if (page.snapshotUrl) { const link = element<HTMLAnchorElement>('source'); link.href = page.snapshotUrl; link.hidden = false; }
  } else {
    const cached = await send<ProfileResult | null>('CACHED', { origin });
    if (cached?.pack) {
      element('site-state').textContent = 'SAVED LOCALLY';
      element('site-detail').textContent = `${cached.pack.capturedAt.slice(0, 4)} styling is ready for your next page load.`;
    } else if (page?.state === 'current') {
      element('site-state').textContent = 'CURRENT STYLE';
      element('site-detail').textContent = page.reason === 'timeout' ? 'The archive needed longer. This visit stays as it is.' : 'No usable archive was ready. This visit stays as it is.';
    }
  }
}

async function changeYear(year: number): Promise<void> {
  const selected = Math.max(2007, Math.min(currentYear(), year));
  state.settings = await send<Settings>('SETTINGS', { patch: { year: selected } });
  showYear(selected);
  paint();
  element('source').hidden = true;
  announce('Year saved. Applies on your next page load.');
}

async function prepare(): Promise<void> {
  if (!origin || warming) return;
  warming = true;
  warm.textContent = 'Finding a little of the past…';
  paint();
  announce('Looking for a historical style. You can keep browsing.');
  try {
    const result = await send<ProfileResult>('WARM', { origin });
    announce(result.pack ? `${result.pack.capturedAt.slice(0, 4)} styling saved. Ready for your next page load.` :
      'No usable style was available in time. The current site will load normally.');
    state = await send<State>('STATE');
  } finally {
    warming = false;
    warm.textContent = 'Prepare next visit ↗';
    paint();
    await status();
  }
}

yearInput.addEventListener('input', () => showYear(Number(yearInput.value)));
yearInput.addEventListener('change', action(() => changeYear(Number(yearInput.value))));
element('year-back').addEventListener('click', action(() => changeYear(Number(yearInput.value) - 1)));
element('year-next').addEventListener('click', action(() => changeYear(Number(yearInput.value) + 1)));
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-year]')) {
  button.addEventListener('click', action(() => changeYear(Number(button.dataset.year))));
}
power.addEventListener('change', action(async () => {
  state.settings = await send<Settings>('SETTINGS', { patch: { enabled: power.checked } });
  paint();
  announce(power.checked ? 'Enabled for future page loads.' : 'Paused. Current website styling restored.');
}));
pauseSite.addEventListener('change', action(async () => {
  if (!origin) return;
  const host = new URL(origin).hostname;
  const hosts = state.settings.disabledHosts.filter(h => h !== host);
  if (pauseSite.checked) hosts.push(host);
  state.settings = await send<Settings>('SETTINGS', { patch: { disabledHosts: hosts } });
  paint();
  announce(pauseSite.checked ? 'Current styling restored for this site.' : 'This site is enabled for your next page load.');
}));
primary.addEventListener('click', action(async () => {
  if (!origin) return;
  // Must run directly from the user gesture before any unrelated asynchronous work.
  granted = await chrome.permissions.request({ origins: [`${origin}/*`] });
  if (!granted) { announce('Site access was not granted. Nothing changed.'); return; }
  await send('SYNC');
  state = await send<State>('STATE');
  paint();
  await prepare();
}));
warm.addEventListener('click', action(prepare));
element('settings').addEventListener('click', action(async () => { await chrome.runtime.openOptionsPage(); }));

void (async () => {
  yearInput.max = String(currentYear());
  element('latest-year').textContent = String(currentYear());
  element('today').dataset.year = String(currentYear());
  [state, [tab]] = await Promise.all([send<State>('STATE'), chrome.tabs.query({ active: true, currentWindow: true })]);
  origin = tab?.url && !tab.incognito ? publicOrigin(tab.url) : null;
  granted = !!origin && await chrome.permissions.contains({ origins: [`${origin}/*`] });
  paint();
  await status();
})().catch(() => announce('Open a website, then reopen net19 to get started.'));
