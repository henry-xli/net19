import { currentYear, MIN_YEAR, type Settings } from './shared';
import { action, announce, bytesLabel, element, send, type State } from './ui';
let state: State;
const year = element<HTMLSelectElement>('year-select');
const wait = element<HTMLSelectElement>('wait-select');
const power = element<HTMLInputElement>('power');
for (let value = currentYear(); value >= MIN_YEAR; value--) { const option = document.createElement('option'); option.value = String(value); option.textContent = String(value); year.append(option); }
function paint(): void {
  year.value = String(state.settings.year); wait.value = String(state.settings.waitMs); power.checked = state.settings.enabled;
  element('cache-count').textContent = String(state.cache.count); element('cache-size').textContent = bytesLabel(state.cache.bytes);
  element<HTMLProgressElement>('cache-meter').value = state.cache.count;
  const paused = element('paused-list'); paused.replaceChildren();
  for (const host of state.settings.disabledHosts) {
    const row = document.createElement('div'); row.className = 'grant-row';
    const label = document.createElement('span'); label.textContent = `${host} · paused`;
    const resume = document.createElement('button'); resume.className = 'text-button'; resume.textContent = 'Resume';
    resume.addEventListener('click', action(async () => {
      await send<Settings>('SETTINGS', { patch: { disabledHosts: state.settings.disabledHosts.filter(h => h !== host) } });
      state = await send<State>('STATE'); paint(); announce('Site resumed.');
    })); row.append(label,resume); paused.append(row);
  }
}
const update = action(async () => {
  await send<Settings>('SETTINGS', { patch: { enabled: power.checked, year: Number(year.value), waitMs: Number(wait.value) } });
  state = await send<State>('STATE'); paint(); announce('Saved. Other years are removed from the cache.');
});
year.addEventListener('change', update); wait.addEventListener('change', update); power.addEventListener('change', update);
element('clear-cache').addEventListener('click', action(async () => {
  state.cache = await send<State['cache']>('CLEAR'); paint(); announce('Saved snapshots cleared.');
}));
void send<State>('STATE').then(value => { state = value; paint(); }).catch(() => announce('Settings could not load. Reopen this page.'));
