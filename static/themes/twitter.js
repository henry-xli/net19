// net19 handmade theme: Twitter, late 2019. Two apps serve x.com: signed out, a newer app that marks
// html[data-theme="light" | "dark"]; signed in, the React Native Web app whose Default, Dim and Lights out backgrounds
// (all from 2019) are painted on <body>. Dark in the signed-out app becomes 2019's Dim; Lights out keeps its black.
globalThis.net19Theme = {
  detect() {
    const root = document.documentElement;
    const theme = root.getAttribute('data-theme');
    if (theme && !document.getElementById('react-root')) { root.removeAttribute('data-n19-tw-bg'); return /dark|dim/.test(theme) ? 'dark' : 'light'; }
    const bg = getComputedStyle(document.body || root).backgroundColor;
    const [r, g, b, a = 1] = (bg.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
    if (a === 0) return /dark|dim/.test(theme || '') ? 'dark' : 'light';
    const black = r + g + b < 12;
    if (black !== root.hasAttribute('data-n19-tw-bg')) black ? root.setAttribute('data-n19-tw-bg', 'black') : root.removeAttribute('data-n19-tw-bg');
    return .2126 * r + .7152 * g + .0722 * b < 90 ? 'dark' : 'light';
  },
  watch: ['style', 'class', 'data-theme'],
  // Later additions guard.js hides wherever they show up as a control
  later: /^(?:grok|ask grok|explain this post|analy[sz]e (?:this )?post|grok actions|profile summary|get verified|subscribe|subscribe to premium|upgrade to premium\+?|premium\+?|verified orgs|creator studio|monetization|communities|spaces|start a space|jobs|articles|business|everyone can reply|schedule|live on x|get the app|download the app)$/i,
  keepLabels: /^(?:messages|home|explore|notifications|bookmarks|lists|profile|more|search|tweet|reply|retweet|like|share)$/i,
};
// Wording and small marks. 2019 said "Tweet" and "Retweet", not "Post" and "Repost"; its sidebar said "What's happening";
// titles ended in "/ Twitter". Only whole labels on controls, tabs, headings and counters are changed, never tweet text.
(() => {
  const EXACT = new Map([
    ['Post', 'Tweet'], ['Posts', 'Tweets'], ['Post all', 'Tweet all'], ['Repost', 'Retweet'], ['Reposts', 'Retweets'], ['Reposted', 'Retweeted'],
    ['Undo repost', 'Undo Retweet'], ['Quote', 'Retweet with comment'], ['Post your reply', 'Tweet your reply'], ['Post your reply!', 'Tweet your reply'],
    ['Trending now', 'What’s happening'], ['Chat', 'Messages'], ['Show more posts', 'Show more Tweets'], ['Show posts', 'Show Tweets'],
    ['Log in or sign up for X', 'New to Twitter?'], ['See what’s happening and join the conversation', 'Sign up now to get your own personalized timeline!'],
    ['Continue with phone', 'Sign up'], ['Log in with username or email', 'Log in'], ['Search X', 'Search Twitter'],
  ]);
  const COUNT = /^([\d.,]+\s*[KMB]?)\s+posts?$/i;
  const PLACES = 'button, a, [role="button"], [role="tab"], [role="menuitem"], [role="link"], [role="heading"], h1, h2, h3, nav, label, [data-testid="User-Name"] ~ div, .public-DraftEditorPlaceholder-inner, [aria-live], aside, header';
  const SKIP = '[data-testid="tweetText"], article div[dir="auto"], [contenteditable="true"], script, style, input, textarea';
  const rewrite = node => {
    const raw = node.nodeValue, text = raw.replace(/\s+/g, ' ').trim();
    if (!text || text.length > 60) return;
    const el = node.parentElement;
    if (!el || el.closest(SKIP)) return;
    let to = EXACT.get(text);
    if (to === undefined && COUNT.test(text)) to = text.replace(COUNT, '$1 Tweets');
    // React splits "74.3K posts" into separate text nodes
    if (to === undefined && /^posts?$/i.test(text) && COUNT.test(el.textContent.replace(/\s+/g, ' ').trim())) to = 'Tweets';
    if (to === undefined) {
      // The profile's "Replies" tab was "Tweets & replies"; the home tabs are shown as 2019's two timelines
      const tab = el.closest('[role="tab"]');
      if (tab && text === 'Replies' && tab.closest('main [role="tablist"]')) to = 'Tweets & replies';
      else if (tab && tab.closest('[data-n19-tw="hometabs"]')) to = text === 'For you' ? 'Top Tweets' : text === 'Following' ? 'Latest Tweets' : undefined;
    }
    if (to === undefined || !el.closest(PLACES)) return;
    node.nodeValue = raw.replace(text, to);
  };
  const walk = scope => {
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) rewrite(n);
  };
  const marks = () => {
    // Home timeline tabs (For you / Following, 2023)
    for (const list of document.querySelectorAll('[data-testid="primaryColumn"] [role="tablist"]:not([data-n19-tw])')) {
      const labels = [...list.querySelectorAll('[role="tab"]')].map(t => t.textContent.trim());
      if (labels.includes('For you') && labels.includes('Following')) { list.setAttribute('data-n19-tw', 'hometabs'); walk(list); }
    }
    // Views under a tweet's timestamp (2022), with the "·" before it
    for (const label of document.querySelectorAll('main article a[href*="/status/"] > div:last-child')) {
      if (label.textContent.trim() !== 'Views') continue;
      const link = label.parentElement;
      if (link.getAttribute('data-n19-tw') === 'views') continue;
      link.setAttribute('data-n19-tw', 'views');
      const dot = link.previousElementSibling;
      if (dot && dot.textContent.trim() === '·') dot.setAttribute('data-n19-tw', 'views');
    }
    // Gray (government) checkmarks in the signed-in app; gold ones carry a gradient and are hidden by CSS
    for (const svg of document.querySelectorAll('svg[data-testid="icon-verified"]:not([data-n19-tw-seen])')) {
      svg.setAttribute('data-n19-tw-seen', '');
      const fill = getComputedStyle(svg.querySelector('path') || svg).fill;
      if (/130,\s*154,\s*171/.test(fill) || /130,\s*154,\s*171/.test(getComputedStyle(svg).color)) svg.setAttribute('data-n19-tw', 'badge');
    }
    // Sidebar modules that came later: Premium, Live on X (Spaces), Today's News, Grok stories
    for (const h of document.querySelectorAll('[data-testid="sidebarColumn"] :is(h2, [role="heading"]), aside section h2')) {
      if (!/^(?:subscribe to premium|live on x|today’s news|today's news|get verified|upgrade to premium\+?|explore|trending with grok|happening now)$/i.test(h.textContent.trim())) continue;
      let module = h;
      while (module.parentElement && [...module.parentElement.children].filter(c => c.querySelector('h2, [role="heading"]')).length < 2) module = module.parentElement;
      if (module && module.parentElement && !module.querySelector('input, textarea, [contenteditable]') && !module.hasAttribute('data-n19-tw')) module.setAttribute('data-n19-tw', 'later');
    }
    // "Search Twitter"
    for (const input of document.querySelectorAll('[data-testid="SearchBox_Search_Input"], aside input[placeholder="Search"], header input[placeholder="Search"], [role="search"] input[placeholder="Search"]')) {
      if (input.placeholder !== 'Search Twitter') input.placeholder = 'Search Twitter';
    }
    if (/ \/ X$| on X: /.test(document.title)) document.title = document.title.replace(/ \/ X$/, ' / Twitter').replace(/ on X: /, ' on Twitter: ');
  };
  // Signed in, colors come from React Native Web's atomic stylesheet (today's #0f1419 text, #536471 grays, #eff3f4
  // rules, #1d9bf0 blue). Its rules are copied once each into an override sheet with 2019's values for the mode shown.
  const BLUE = { '29,155,240': '#1da1f2', '26,140,216': '#1a91da' };
  const MAPS = {   // text colors (color, fill, stroke) and surface colors (backgrounds, borders) per 2019 background
    light: { fg: { ...BLUE, '15,20,25': '#14171a', '83,100,113': '#657786' }, bg: { ...BLUE, '239,243,244': '#e6ecf0', '247,249,249': '#f5f8fa', '207,217,222': '#ccd6dd' } },
    dim: { fg: { ...BLUE, '247,249,249': '#ffffff', '139,152,165': '#8899a6' }, bg: { ...BLUE, '30,39,50': '#192734', '39,51,64': '#253341' } },
    black: { fg: { ...BLUE, '231,233,234': '#d9d9d9', '113,118,123': '#6e767d' }, bg: { ...BLUE, '22,24,28': '#15181c' } },
  };
  const PROPS = [['color', 'fg'], ['fill', 'fg'], ['stroke', 'fg'], ['background-color', 'bg'], ['border-top-color', 'bg'], ['border-bottom-color', 'bg'], ['border-left-color', 'bg'], ['border-right-color', 'bg']];
  let sheetEl = null, map = null, which = '', done = new WeakSet(), out = [];
  const key = v => { const m = v.match(/[\d.]+/g); if (!m || m.length < 3) return ''; const [r, g, b, a] = m.map(Number); return a === undefined || a === 1 ? `${r},${g},${b}` : `${r},${g},${b},${a}`; };
  const recolor = () => {
    if (!document.getElementById('react-root')) return;
    const root = document.documentElement, mode = root.getAttribute('data-net19-mode');
    const now = mode !== 'dark' ? 'light' : root.hasAttribute('data-n19-tw-bg') ? 'black' : 'dim';
    if (now !== which) { which = now; map = MAPS[now]; done = new WeakSet(); out = []; }
    let added = false;
    for (const sheet of document.styleSheets) {
      if (sheet.ownerNode === sheetEl || !(sheet.ownerNode?.id === 'react-native-stylesheet' || /^\.(?:r|css)-/.test(sheet.cssRules?.[0]?.selectorText || ''))) continue;
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (done.has(rule) || !rule.style) continue;
        done.add(rule);
        const decl = [];
        for (const [prop, kind] of PROPS) { const v = rule.style.getPropertyValue(prop); const to = v && map[kind][key(v)]; if (to) decl.push(`${prop}:${to}!important`); }
        if (decl.length) { out.push(`${rule.selectorText}{${decl.join(';')}}`); added = true; }
      }
    }
    if (!sheetEl) { sheetEl = document.createElement('style'); sheetEl.id = 'net19-twitter-colors'; }
    if (!sheetEl.isConnected) (document.head || root).append(sheetEl);
    if (added || sheetEl.textContent === '' && out.length) sheetEl.textContent = out.join('\n');
  };
  let queued = false, pending = [];
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; const roots = pending; pending = []; for (const r of roots) if (r.isConnected) walk(r); marks(); }); };
  const start = () => {
    walk(document.body); marks(); recolor();
    new MutationObserver(records => {
      for (const r of records) {
        if (r.type === 'characterData') { if (r.target.parentElement) pending.push(r.target.parentElement); }
        else for (const n of r.addedNodes) if (n.nodeType === 1) pending.push(n); else if (n.nodeType === 3 && n.parentElement) pending.push(n.parentElement);
      }
      later();
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
    const title = document.querySelector('title');
    if (title) new MutationObserver(later).observe(title, { childList: true, characterData: true, subtree: true });
    // React Native Web adds rules with insertRule, which no observer sees: new rules are picked up every 1.5 s.
    setInterval(() => { if (!document.hidden) recolor(); }, 1500);
    new MutationObserver(recolor).observe(document.documentElement, { attributes: true, attributeFilter: ['data-net19-mode', 'data-n19-tw-bg'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
// The signed-out landing page (utility class names only, and more than one variant of its login block) is marked
// from its heading and username field with data-n19-tw for twitter.css, which turns it into 2019's split page: a
// blue bird panel on the left, the username field and "Log in" in a row at the top right, and the sign-up block in
// the middle of the right half. Its 2019 wording is put back in the existing text nodes.
(() => {
  const WORDS = new Map([['Happening now', 'See what’s happening in the world right now'], ['Continue with phone', 'Sign up'],
    ['Continue', 'Log in'], ['Email or username', 'Phone, email, or username']]);
  const mark = (el, name) => { if (el && el.getAttribute('data-n19-tw') !== name) el.setAttribute('data-n19-tw', name); };
  const text = el => el.textContent.trim();
  const fix = () => {
    const input = document.querySelector('form input[name^="username"], form input[autocomplete="username"]');
    const form = input?.form || input?.closest('form');
    const h1 = form && [...document.querySelectorAll('h1')].find(h => h.parentElement.contains(form));
    if (!h1) return;
    let col = h1.parentElement;
    while (col?.parentElement && ![...col.parentElement.children].some(c => c !== col && c.querySelector('svg[aria-label="X"], svg[data-icon="icon-logo-x"]'))) col = col.parentElement;
    const row = col?.parentElement;
    if (!row || !row.contains(form)) return;
    mark(row, 'row');
    for (const child of row.children) mark(child, child.contains(form) ? 'main' : 'panel');
    const main = row.querySelector('[data-n19-tw="main"]');
    mark(h1, 'title');
    // The username field and its submit control go to the top-right row; everything between them and the column is static.
    const field = input.closest('label') || input.parentElement;
    const go = [...form.querySelectorAll('button, [role="button"], div')].find(el => /^(Continue|Log in)$/.test(text(el)) && !el.querySelector('input'));
    const goBox = go && (go.closest('button, [role="button"]') || [...form.children].find(c => c.contains(go)) || go);
    mark(field, 'field');
    mark(goBox, 'go');
    for (const start of [field, goBox]) for (let n = start?.parentElement; n && n !== main; n = n.parentElement) if (!n.hasAttribute('data-n19-tw')) mark(n, 'static');
    for (const el of main.querySelectorAll('a[href*="/onboarding/"], button, .jf-gsi-face')) {
      if (el.hasAttribute('data-n19-tw') || el.closest('[data-n19-tw="go"]')) continue;
      mark(el, /mode=signup/.test(el.getAttribute('href') || '') || /^Continue with phone$|^Sign up$/.test(text(el)) ? 'signup' : 'alt');
    }
    for (const el of main.querySelectorAll('div')) if (text(el) === 'or' && !el.querySelector('input, button, a')) { mark(el, 'or'); break; }
    for (const button of document.querySelectorAll('body > div button:has(img)')) if (/scan/i.test(button.textContent)) mark(button, 'qr');
    const walker = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const to = WORDS.get(node.nodeValue.trim());
      if (to === undefined) continue;
      node.nodeValue = to;
      if (node.parentNode === h1) for (const rest of h1.childNodes) if (rest.nodeType === 3 && rest.nodeValue === '.') rest.nodeValue = '';
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    if (location.pathname !== '/') return;
    fix();
    new MutationObserver(() => { if (location.pathname === '/') later(); }).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
