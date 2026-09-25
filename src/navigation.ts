import { canonicalOrigin, publicOrigin, type ProfileResult, type Settings } from './shared';

export const NAVIGATION_TTL_MS = 90_000;
export const PUBLIC_NAVIGATION = '^https?://(?:[a-z0-9-]+\\.)+[a-z][a-z0-9-]*/.*';
export const EXCLUDED_DOMAINS = ['archive.org', 'archive.is', 'archive.today', 'archive.ph', 'chromewebstore.google.com',
  'localhost', 'local', 'localdomain', 'internal', 'lan', 'home', 'test', 'invalid', 'onion', 'home.arpa'];

export function originFilter(origin: string): string {
  const host = new URL(canonicalOrigin(origin)).hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return `^https?://(?:www\\.)?${host}/`;
}

export function loadingTarget(url: string, extensionUrl: string): string | null {
  if (!url.startsWith(`${extensionUrl}#`)) return null;
  const target = url.slice(extensionUrl.length + 1);
  return publicOrigin(target) ? target : null;
}

export function navigationRules(config: Settings, origins: string[], extensionUrl: string, excluded: string[] = [],
  queries: Array<{ pattern: string; params: Array<[string, string]> }> = []): chrome.declarativeNetRequest.Rule[] {
  if (!config.enabled || config.year === new Date().getFullYear()) return [];
  const rules: chrome.declarativeNetRequest.Rule[] = [{
    id: 1, priority: 1,
    action: { type: 'redirect' as chrome.declarativeNetRequest.RuleActionType, redirect: { regexSubstitution: `${extensionUrl}#\\0` } },
    condition: { regexFilter: PUBLIC_NAVIGATION, resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
      requestMethods: ['get' as chrome.declarativeNetRequest.RequestMethod], excludedRequestDomains: [...EXCLUDED_DOMAINS, ...config.disabledHosts, ...excluded] },
  }];
  // A theme's URL parameter (e.g. a site's legacy skin). The pattern only matches URLs
  // without a query, so the redirected URL never matches again.
  for (const [i, query] of queries.slice(0, 20).entries()) rules.push({ id: 60 + i, priority: 3,
    action: { type: 'redirect' as chrome.declarativeNetRequest.RuleActionType, redirect: { transform: { queryTransform: {
      addOrReplaceParams: query.params.map(([key, value]) => ({ key, value })) } } } },
    condition: { regexFilter: query.pattern, resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType],
      requestMethods: ['get' as chrome.declarativeNetRequest.RequestMethod], excludedRequestDomains: config.disabledHosts } });
  for (const [i, origin] of [...new Set(origins.map(canonicalOrigin))].slice(0, 100).entries()) {
    rules.push({ id: 100 + i, priority: 2, action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
      condition: { regexFilter: originFilter(origin), resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType] } });
  }
  return rules;
}

export const navigationKey = (tabId: number): string => `navigation:${tabId}`;
export const releaseRuleId = (tabId: number): number => 1_000_000 + tabId;
export type PreparedNavigation = { origin: string; year: number; expiresAt: number; result: ProfileResult };

export async function releaseNavigation(tabId: number, target: string, year: number, result: ProfileResult): Promise<void> {
  const origin = publicOrigin(target);
  if (!origin) throw new Error('Unsupported destination');
  const id = releaseRuleId(tabId);
  // Keep the result in session memory so a timeout/fallback does not start a second lookup
  // after the site is allowed through. No visited path, query or fragment goes to the archive.
  await chrome.storage.session.set({ [navigationKey(tabId)]: { origin, year, result, expiresAt: Date.now() + NAVIGATION_TTL_MS } satisfies PreparedNavigation });
  await chrome.declarativeNetRequest.updateSessionRules({ removeRuleIds: [id], addRules: [{
    id, priority: 100, action: { type: 'allow' as chrome.declarativeNetRequest.RuleActionType },
    condition: { tabIds: [tabId], regexFilter: originFilter(origin), resourceTypes: ['main_frame' as chrome.declarativeNetRequest.ResourceType] },
  }] });
}
