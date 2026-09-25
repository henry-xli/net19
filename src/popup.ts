import { type Settings } from './shared';
import { themeFor, themePaused, type HandmadeTheme } from './themes';
import { send, type State } from './ui';

// Two switches: net19 everywhere, and net19 on the current site. The site switch only appears on a site net19 themes.
const power = document.getElementById('power') as HTMLInputElement;
const siteSwitch = document.getElementById('site-switch') as HTMLInputElement;
let settings: Settings;
let theme: HandmadeTheme | undefined;

function paint(): void {
  power.checked = settings.enabled;
  siteSwitch.checked = !!theme && !themePaused(theme, settings.disabledHosts);
  siteSwitch.disabled = !settings.enabled;
}
async function save(patch: Partial<Settings>): Promise<void> {
  settings = await send<Settings>('SETTINGS', { patch });
  paint();
}
power.addEventListener('change', () => { void save({ enabled: power.checked }).catch(paint); });
siteSwitch.addEventListener('change', () => {
  if (!theme) return;
  const site = theme;
  const hosts = settings.disabledHosts.filter(host => !themePaused(site, [host]));
  if (!siteSwitch.checked) hosts.push(site.domains[0]);
  void save({ disabledHosts: hosts }).catch(paint);
});

void (async () => {
  const [state, [tab]] = await Promise.all([send<State>('STATE'), chrome.tabs.query({ active: true, currentWindow: true })]);
  settings = state.settings;
  let host = '';
  try { if (tab?.url && !tab.incognito && /^https?:$/.test(new URL(tab.url).protocol)) host = new URL(tab.url).hostname; } catch { /* not a web page */ }
  theme = host ? themeFor(host) : undefined;
  if (theme) {
    document.getElementById('site')!.textContent = theme.domains.find(domain => host === domain || host.endsWith(`.${domain}`)) ?? theme.domains[0];
    siteSwitch.setAttribute('aria-label', theme.name);
    document.getElementById('site-row')!.hidden = false;
  }
  paint();
})();
