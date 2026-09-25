import { THEMES, themePaused, type HandmadeTheme } from './themes';
import type { Settings } from './shared';

type Rule = chrome.declarativeNetRequest.Rule;
const MAIN = ['main_frame' as chrome.declarativeNetRequest.ResourceType];
const GET = ['get' as chrome.declarativeNetRequest.RequestMethod];
const REDIRECT = 'redirect' as chrome.declarativeNetRequest.RuleActionType;
const ALLOW = 'allow' as chrome.declarativeNetRequest.RuleActionType;

// Navigation rules for themes that use a site's own older frontend: a URL parameter (Wikipedia's legacy skin)
// or a legacy host (old.reddit.com, only while `signedIn` reports the site's session cookie).
// Nothing else is redirected, and nothing leaves the browser.
export function navigationRules(config: Settings, signedIn: (theme: HandmadeTheme) => boolean = () => false, themes = THEMES): Rule[] {
  if (!config.enabled) return [];
  const rules: Rule[] = [];
  let id = 1;
  for (const theme of themes) {
    if (themePaused(theme, config.disabledHosts)) continue;
    // The query pattern only matches URLs without a query, so the redirected URL never matches again.
    if (theme.query) rules.push({ id: id++, priority: 1,
      action: { type: REDIRECT, redirect: { transform: { queryTransform: { addOrReplaceParams: theme.query.params.map(([key, value]) => ({ key, value })) } } } },
      condition: { regexFilter: theme.query.pattern, resourceTypes: MAIN, requestMethods: GET } });
    const legacy = theme.legacy;
    if (legacy && (!legacy.signedIn || signedIn(theme))) {
      rules.push({ id: id++, priority: 1, action: { type: REDIRECT, redirect: { regexSubstitution: legacy.substitution } },
        condition: { regexFilter: legacy.pattern, resourceTypes: MAIN, requestMethods: GET } });
      if (legacy.except) rules.push({ id: id++, priority: 2, action: { type: ALLOW },
        condition: { regexFilter: legacy.except, resourceTypes: MAIN } });
    }
  }
  return rules;
}
