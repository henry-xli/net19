export const SETTINGS_KEY = 'settings';

export type Settings = {
  enabled: boolean;
  disabledHosts: string[];
};

export function settingsFrom(value: unknown): Settings {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  return {
    enabled: v.enabled !== false,
    disabledHosts: Array.isArray(v.disabledHosts) ? [...new Set(v.disabledHosts.filter(h => typeof h === 'string' && /^[a-z0-9.-]{1,253}$/.test(h)))].slice(0, 500) : [],
  };
}

export function isPaused(settings: Settings, hostname: string): boolean {
  return !settings.enabled || settings.disabledHosts.includes(hostname);
}
