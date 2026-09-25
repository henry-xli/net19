// net19 handmade theme: Twitter, late 2019. Its three backgrounds (Default, Dim, Lights out) all existed in 2019;
// the page background tells which one is in use.
globalThis.net19Theme = {
  detect() {
    // The signed-out landing page paints no body background and marks html[data-theme] instead.
    const bg = getComputedStyle(document.body || document.documentElement).backgroundColor;
    const [r, g, b, a = 1] = (bg.match(/[\d.]+/g) || [255, 255, 255]).map(Number);
    if (a === 0) return /dark|dim/.test(document.documentElement.getAttribute('data-theme') || '') ? 'dark' : 'light';
    return .2126 * r + .7152 * g + .0722 * b < 90 ? 'dark' : 'light';
  },
  watch: ['style', 'class', 'data-theme'],
};
// "Post" was "Tweet" in 2019. The label's text node is replaced in place (CSS text swaps depend on the exact
// element nesting, which differs between accounts and layouts).
(() => {
  const BUTTONS = '[data-testid="SideNav_NewTweet_Button"], [data-testid="tweetButtonInline"], [data-testid="tweetButton"]';
  const relabel = () => {
    for (const button of document.querySelectorAll(BUTTONS)) {
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        if (node.nodeValue.trim() === 'Post') node.nodeValue = node.nodeValue.replace('Post', 'Tweet');
        else if (node.nodeValue.trim() === 'Post all') node.nodeValue = node.nodeValue.replace('Post all', 'Tweet all');
      }
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; relabel(); }); };
  const start = () => { relabel(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
// The signed-out landing page (utility class names only, and more than one variant of its login block) is marked
// from its heading and username field with data-n19-tw for twitter.css, which turns it into 2019's split page: a
// blue bird panel on the left, the username field and "Log in" in a row at the top right, and the sign-up block in
// the middle of the right half. Its 2019 wording is put back in the existing text nodes.
(() => {
  const WORDS = new Map([['Happening now', 'See what\u2019s happening in the world right now'], ['Continue with phone', 'Sign up'],
    ['Continue', 'Log in'], ['Email or username', 'Phone, email, or username']]);
  const mark = (el, name) => { if (el && el.getAttribute('data-n19-tw') !== name) el.setAttribute('data-n19-tw', name); };
  const text = el => el.textContent.trim();
  const fix = () => {
    const input = document.querySelector('form input[name^="username"], form input[autocomplete="username"]');
    const form = input?.form || input?.closest('form');
    const h1 = form && [...document.querySelectorAll('h1')].find(h => h.parentElement.contains(form));
    if (!h1) return;
    let col = h1.parentElement;
    while (col?.parentElement && ![...col.parentElement.children].some(c => c !== col && c.querySelector('svg[aria-label="X"]'))) col = col.parentElement;
    const row = col?.parentElement;
    if (!row || !row.contains(form)) return;
    mark(row, 'row');
    for (const child of row.children) mark(child, child.contains(form) ? 'main' : 'panel');
    const main = row.querySelector('[data-n19-tw="main"]');
    mark(h1, 'title');
    // The username field and its submit control go to the top-right row; everything between them and the column is static.
    const field = input.closest('label') || input.parentElement;
    const go = [...form.querySelectorAll('button, [role="button"], div')].find(el => text(el) === 'Continue' && !el.querySelector('input'));
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
