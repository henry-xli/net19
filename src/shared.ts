export const MIN_YEAR = 2007;
export const SCHEMA = 2;
export const MAX_PROFILES = 100;
export const MAX_CACHE_BYTES = 4 * 1024 * 1024;
export const MAX_PROFILE_BYTES = 96 * 1024;
export const HARD_GATE_MS = 65_000;
export const WARM_BUDGET_MS = 55_000;
export const SETTINGS_KEY = 'settings';
export const INDEX_KEY = 'profile-index';

export type Settings = {
  enabled: boolean;
  year: number;
  waitMs: number;
  disabledHosts: string[];
};

export type StylePack = {
  schema: number;
  origin: string;
  targetYear: number;
  capturedAt: string;
  snapshotUrl: string;
  snapshot: string;
  palette: string[];
  createdAt: number;
  source: 'wayback';
  ruleCount: number;
};

export type ProfileResult = {
  pack?: StylePack;
  reason?: 'missing' | 'unavailable' | 'unusable' | 'timeout' | 'busy' | 'paused' | 'current' | 'unsupported';
  cached?: boolean;
};

export type PageStatus = {
  state: 'archived' | 'current' | 'waiting' | 'paused';
  year?: number;
  elapsedMs: number;
  cached?: boolean;
  reason?: string;
  snapshotUrl?: string;
  mode?: 'layout' | 'styles' | 'theme';
};

export function currentYear(): number { return new Date().getFullYear(); }

export function settingsFrom(value: unknown): Settings {
  const v = (value && typeof value === 'object' ? value : {}) as Partial<Settings>;
  return {
    enabled: v.enabled !== false,
    year: Number.isInteger(v.year) ? Math.max(MIN_YEAR, Math.min(currentYear(), v.year!)) : 2019,
    // Migrate the old prepare-only / 1.8-second defaults to automatic preparation.
    waitMs: typeof v.waitMs === 'number' && Number.isFinite(v.waitMs) && v.waitMs >= 10_000 ? Math.min(60_000, v.waitMs) : 60_000,
    disabledHosts: Array.isArray(v.disabledHosts) ? [...new Set(v.disabledHosts.filter(h => typeof h === 'string' && h.length < 254))].slice(0, 500) : [],
  };
}

// Only the public origin leaves the device, never a visited path, query, or fragment.
// Reject IPs rather than attempting unreliable DNS-based private-network detection.
export function publicOrigin(input: string): string | null {
  try {
    const url = new URL(input);
    const host = url.hostname.toLowerCase();
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!host.includes('.') || host.endsWith('.') || /[\[\]:]/.test(host) || /^[\d.]+$/.test(host)) return null;
    if (/(^|\.)(localhost|local|localdomain|internal|lan|home|test|invalid|onion|home\.arpa)$/.test(host)) return null;
    if (/^(?:.*\.)?(?:archive\.org|archive\.(?:is|today|ph)|chromewebstore\.google\.com)$/.test(host)) return null;
    return url.origin;
  } catch { return null; }
}

export function sameSite(a: string, b: string): boolean {
  try { return new URL(a).hostname.replace(/^www\./, '') === new URL(b).hostname.replace(/^www\./, ''); }
  catch { return false; }
}

export function profileKey(origin: string, year: number): string {
  return `profile:${SCHEMA}:${year}:${canonicalOrigin(origin)}`;
}

export function canonicalOrigin(origin: string): string {
  return `https://${new URL(origin).hostname.replace(/^www\./, '')}`;
}

export function validTimestamp(value: unknown, year: number): value is string {
  return typeof value === 'string' && /^\d{14}$/.test(value) &&
    value >= `${MIN_YEAR}0101000000` && value <= `${year}1231235959`;
}

export function parseReplay(input: string): { timestamp: string; original: string } | null {
  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'web.archive.org' || url.port || url.username || url.password) return null;
    const match = url.pathname.match(/^\/web\/(\d{14})(?:[a-z]{1,3}_)?\/(https?:\/\/.+)$/);
    if (!match || !publicOrigin(match[2] + url.search)) return null;
    return { timestamp: match[1], original: match[2] + url.search };
  } catch { return null; }
}

export function isStylePack(value: unknown, origin?: string, year?: number): value is StylePack {
  if (!value || typeof value !== 'object') return false;
  const p = value as StylePack;
  const replay = typeof p.snapshotUrl === 'string' && parseReplay(p.snapshotUrl);
  return p.schema === SCHEMA && p.source === 'wayback' && typeof p.origin === 'string' &&
    publicOrigin(p.origin) === p.origin && (!origin || canonicalOrigin(p.origin) === canonicalOrigin(origin)) &&
    Number.isInteger(p.targetYear) && p.targetYear >= MIN_YEAR && p.targetYear <= currentYear() &&
    (year === undefined || p.targetYear === year) && validTimestamp(p.capturedAt, p.targetYear) &&
    !!replay && replay.timestamp === p.capturedAt && sameSite(replay.original, p.origin) &&
    typeof p.snapshot === 'string' && p.snapshot.length < 90_000 && /^[A-Za-z0-9+/=]+$/.test(p.snapshot) &&
    Array.isArray(p.palette) && p.palette.length <= 6 && p.palette.every(c => /^#[\da-f]{3,8}$/i.test(c)) &&
    Number.isFinite(p.createdAt) && Number.isInteger(p.ruleCount) && p.ruleCount > 0;
}

export function isPaused(settings: Settings, origin: string): boolean {
  return !settings.enabled || settings.disabledHosts.includes(new URL(origin).hostname);
}
