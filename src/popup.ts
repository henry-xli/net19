import { currentYear, publicOrigin, type PageStatus, type ProfileResult, type Settings } from './shared';
import { loadingTarget } from './navigation';
import { action, announce, element, send, type State } from './ui';

let state: State;
let tab: chrome.tabs.Tab | undefined;
let origin: string | null = null;
let granted = false;
const yearInput = element<HTMLInputElement>('year');
const power = element<HTMLInputElement>('power');
const pauseSite = element<HTMLInputElement>('pause-site');

function showYear(year: number): void {
  yearInput.value = String(year);
  element('destination').textContent = String(year);
  element('year-hint').textContent = year === currentYear() ? 'Use the current website appearance.' : 'Prepared automatically before pages open.';
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
  element('site-name').textContent = host ?? 'Current website';
  element('site-pause-row').hidden = !granted || !host;
  pauseSite.checked = !!host && state.settings.disabledHosts.includes(host);
  element('site-detail').textContent = !origin ? 'Open a public website to get started.' :
    !state.settings.enabled ? 'Paused everywhere. Current styles stay in place.' :
      pauseSite.checked ? 'This site uses its current style.' :
        !granted ? 'Chrome has limited access to this site.' : 'Archive lookup runs automatically on navigation.';
  element('site-state').textContent = !granted ? 'NOT ENABLED' : !state.settings.enabled || pauseSite.checked ? 'PAUSED' : 'ENABLED';
}

async function status(): Promise<void> {
  if (!origin || !granted || !state.settings.enabled || pauseSite.checked) return;
  let page: PageStatus | null = null;
  try { if (tab?.id) page = await chrome.tabs.sendMessage(tab.id, { type: 'PAGE_STATUS' }); } catch { /* Newly granted tabs have no content script yet. */ }
  if (page?.state === 'archived') {
    element('site-state').textContent = `${page.mode === 'layout' ? 'LAYOUT' : 'STYLE'} · ${page.year}`;
    element('site-detail').textContent = `${page.cached ? 'From local storage' : 'From the Wayback Machine'} · ready in ${page.elapsedMs} ms`;
    if (page.snapshotUrl) { const link = element<HTMLAnchorElement>('source'); link.href = page.snapshotUrl; link.hidden = false; }
  } else {
    if (page?.state === 'current') {
      element('site-state').textContent = 'CURRENT STYLE';
      element('site-detail').textContent = page.reason === 'unmatched-layout' ? 'The archive and this page could not be matched reliably.' :
        page.reason === 'unreadable-layout' ? 'The archived layout failed the readability check.' :
          page.reason === 'style-rejected' ? 'Chrome could not install the prepared style.' : 'No usable archive was available for this visit.';
      return;
    }
    const cached = await send<ProfileResult | null>('CACHED', { origin });
    if (cached?.pack) {
      element('site-state').textContent = 'SAVED LOCALLY';
      element('site-detail').textContent = `${cached.pack.capturedAt.slice(0, 4)} snapshot saved. Compatibility is checked as each page opens.`;
    }
  }
}

async function changeYear(year: number): Promise<void> {
  const selected = Math.max(2007, Math.min(currentYear(), year));
  state.settings = await send<Settings>('SETTINGS', { patch: { year: selected } });
  state = await send<State>('STATE');
  showYear(selected);
  paint();
  element('source').hidden = true;
  announce('Year saved. Other years were removed from the cache.');
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
element('settings').addEventListener('click', action(async () => { await chrome.runtime.openOptionsPage(); }));

void (async () => {
  yearInput.max = String(currentYear());
  element('latest-year').textContent = String(currentYear());
  element('today').dataset.year = String(currentYear());
  [state, [tab]] = await Promise.all([send<State>('STATE'), chrome.tabs.query({ active: true, currentWindow: true })]);
  const destination = tab?.url && (loadingTarget(tab.url, chrome.runtime.getURL('loading.html')) || tab.url);
  origin = destination && !tab?.incognito ? publicOrigin(destination) : null;
  granted = !!origin && await chrome.permissions.contains({ origins: [`${origin}/*`] });
  paint();
  if (tab?.url?.startsWith(chrome.runtime.getURL('loading.html'))) {
    element('site-state').textContent = 'PREPARING';
    element('site-detail').textContent = 'Checking the archive before opening this website.';
  } else await status();
})().catch(() => announce('Open a website, then reopen net19 to get started.'));
