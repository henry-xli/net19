// net19 handmade theme: Facebook, 2019 ("classic"), light and dark. Facebook marks its dark mode with
// html.__fb-dark-mode; its whole interface is drawn from the variables mapped in facebook.css.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('__fb-dark-mode') ? 'dark' : 'light',
  watch: ['class'],
};
// The signed-out landing page has only generated class names, so its parts are found from the login form and
// marked with data-n19-fb for facebook.css: the two columns, the login card and its buttons. The 2019 wording of
// the headline and buttons is put back in the existing text nodes.
(() => {
  const WORDS = new Map([['Explore the things ', 'Connect with friends and the world around you on Facebook.'], ['you love', ''],
    ['Log in', 'Log In'], ['Forgot password?', 'Forgot account?'], ['Create new account', 'Create New Account'],
    ['Email or mobile number', 'Email or Phone Number']]);
  const mark = (el, name) => { if (el && el.getAttribute('data-n19-fb') !== name) el.setAttribute('data-n19-fb', name); };
  const words = root => {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const to = WORDS.get(node.nodeValue);
      if (to !== undefined) {
        node.nodeValue = to;
        // "Explore the things <span>you love</span>." : the trailing period goes with the old headline
        if (to.startsWith('Connect') && node.parentNode.lastChild?.nodeValue === '.') node.parentNode.lastChild.nodeValue = '';
      }
    }
  };
  const fix = () => {
    const form = document.getElementById('login_form');
    if (!form || !form.querySelector('input[name="pass"]')) return;
    let row = form.parentElement;
    while (row && row !== document.body && !row.querySelector('img')) row = row.parentElement;
    if (!row || row === document.body) return;
    mark(row, 'row');
    for (const col of row.children) mark(col, col.contains(form) ? 'login' : col.querySelector('img') ? 'hero' : 'rule');
    const card = form.parentElement?.parentElement;
    if (card && row.contains(card)) {
      mark(card, 'card');
      for (const part of card.children) if (!part.contains(form)) mark(part, 'title');
    }
    // The footer (its own role="main" block) and the band above it are the two children of their common ancestor.
    const main = [...document.querySelectorAll('[role="main"]')].find(m => !m.contains(form) && !row.contains(m));
    let foot = main;
    while (foot?.parentElement && !foot.parentElement.contains(row)) foot = foot.parentElement;
    if (foot?.parentElement) { mark(foot, 'foot'); mark([...foot.parentElement.children].find(c => c.contains(row)), 'top'); }
    words(row);
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    if (location.pathname !== '/' && !location.pathname.startsWith('/login')) return;
    fix();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
