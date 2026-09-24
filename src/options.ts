import { currentYear, type Settings } from './shared';
import { action, announce, bytesLabel, element, send, siteGrants, type State } from './ui';

let state: State;
const year = element<HTMLSelectElement>('year-select');
const wait = element<HTMLSelectElement>('wait-select');
const power = element<HTMLInputElement>('power');
for (let n = currentYear(); n >= 2007; n--) {
  const option = document.createElement('option');
  option.value = String(n); option.textContent = n === currentYear() ? `${n} · Today` : String(n); year.append(option);
}

function paint(): void {
  year.value = String(state.settings.year);
  wait.value = String(state.settings.waitMs);
  power.checked = state.settings.enabled;
  element('cache-count').textContent = String(state.cache.count);
  element('cache-size').textContent = bytesLabel(state.cache.bytes);
  element<HTMLProgressElement>('cache-meter').value = state.cache.count;
  const grants = siteGrants(state.origins);
  const all = grants.includes('https://*/*') && grants.includes('http://*/*');
  element<HTMLButtonElement>('enable-all').disabled = all;
  element('enable-all').textContent = all ? 'Enabled on all public sites' : 'Enable on all public sites ↗';
  const list = element('site-list');
  list.replaceChildren();
  if (!grants.length) {
    const p = document.createElement('p'); p.className = 'empty-list'; p.textContent = 'No sites enabled yet. Open net19 on a website to enable it individually.'; list.append(p);
  }
  for (const grant of grants) {
    const row = document.createElement('div'); row.className = 'grant-row';
    const label = document.createElement('span'); label.textContent = grant === 'https://*/*' ? 'All secure websites (HTTPS)' : grant === 'http://*/*' ? 'All HTTP websites' : grant.replace(/^https?:\/\//, '').replace(/\/\*$/, '');
    const remove = document.createElement('button'); remove.className = 'text-button'; remove.textContent = 'Remove'; remove.setAttribute('aria-label', `Remove access to ${label.textContent}`);
    remove.addEventListener('click', action(async () => {
      await chrome.permissions.remove({ origins: [grant] });
      await send('SYNC');
      state = await send<State>('STATE'); paint(); announce('Site access removed.');
    }));
    row.append(label, remove); list.append(row);
  }
  const paused = element('paused-list');
  paused.replaceChildren();
  for (const host of state.settings.disabledHosts) {
    const row = document.createElement('div'); row.className = 'grant-row';
    const label = document.createElement('span'); label.textContent = `${host} · paused`;
    const resume = document.createElement('button'); resume.className = 'text-button'; resume.textContent = 'Resume';
    resume.addEventListener('click', action(async () => {
      state.settings = await send<Settings>('SETTINGS', { patch: { disabledHosts: state.settings.disabledHosts.filter(h => h !== host) } });
      paint(); announce('Site resumed for future page loads.');
    }));
    row.append(label, resume); paused.append(row);
  }
}

const update = action(async () => {
  state.settings = await send<Settings>('SETTINGS', { patch: { enabled: power.checked, year: Number(year.value), waitMs: Number(wait.value) } });
  paint(); announce('Saved. New preferences apply on the next page load.');
});
year.addEventListener('change', update); wait.addEventListener('change', update); power.addEventListener('change', update);
element('enable-all').addEventListener('click', action(async () => {
  const granted = await chrome.permissions.request({ origins: ['https://*/*', 'http://*/*'] });
  if (!granted) { announce('Access was not granted. Nothing changed.'); return; }
  await send('SYNC'); state = await send<State>('STATE'); paint(); announce('Enabled on public websites for future page loads.');
}));
element('clear-cache').addEventListener('click', action(async () => {
  state.cache = await send<State['cache']>('CLEAR'); paint(); announce('Saved styles cleared. Your preferences and site access are unchanged.');
}));
void send<State>('STATE').then(value => { state = value; paint(); }).catch(() => announce('Settings could not load. Please reopen this page.'));
