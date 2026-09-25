import { publicOrigin, type Settings } from './shared';
import { loadingTarget } from './navigation';
import { send, type State } from './ui';

// Two switches: net19 everywhere, and net19 on the current site.
const power = document.getElementById('power') as HTMLInputElement;
const siteSwitch = document.getElementById('site-switch') as HTMLInputElement;
let settings: Settings;
let host: string | null = null;

function paint(): void {
  power.checked = settings.enabled;
  siteSwitch.checked = !!host && !settings.disabledHosts.includes(host);
  siteSwitch.disabled = !settings.enabled;
}
async function save(patch: Partial<Settings>): Promise<void> {
  settings = await send<Settings>('SETTINGS', { patch });
  paint();
}
power.addEventListener('change', () => { void save({ enabled: power.checked }).catch(paint); });
siteSwitch.addEventListener('change', () => {
  if (!host) return;
  const hosts = settings.disabledHosts.filter(h => h !== host);
  if (!siteSwitch.checked) hosts.push(host);
  void save({ disabledHosts: hosts }).catch(paint);
});

void (async () => {
  const [state, [tab]] = await Promise.all([send<State>('STATE'), chrome.tabs.query({ active: true, currentWindow: true })]);
  settings = state.settings;
  const destination = tab?.url && (loadingTarget(tab.url, chrome.runtime.getURL('loading.html')) || tab.url);
  const origin = destination && !tab?.incognito ? publicOrigin(destination) : null;
  if (origin && await chrome.permissions.contains({ origins: [`${origin}/*`] })) {
    host = new URL(origin).hostname;
    document.getElementById('site')!.textContent = host.replace(/^www\./, '');
    siteSwitch.setAttribute('aria-label', host);
    document.getElementById('site-row')!.hidden = false;
  }
  paint();
})();
