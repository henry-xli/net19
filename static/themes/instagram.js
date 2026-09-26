// net19 handmade theme: Instagram, 2019. Instagram follows the device theme unless changed in its settings;
// it marks the result with a __ig-dark-mode / __ig-light-mode class (__fb-dark-mode / __fb-light-mode on the
// logged-out page) when present.
globalThis.net19Theme = {
  detect() {
    const classes = document.documentElement.classList;
    if (classes.contains('__ig-dark-mode') || classes.contains('__fb-dark-mode')) return 'dark';
    if (classes.contains('__ig-light-mode') || classes.contains('__fb-light-mode')) return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
  watch: ['class'],
};
// The logged-out home page is built from atomic class names only, so its parts are found from the login form and
// marked with data-n19-ig for the stylesheet: the two-column row, its left (pictures) and right (form) columns and
// the rule between them, the white box around the heading and form, and the buttons below the fields.
(() => {
  const mark = (el, name) => { if (el && el.getAttribute('data-n19-ig') !== name) el.setAttribute('data-n19-ig', name); };
  const fix = () => {
    const form = document.querySelector('form#login_form');
    if (!form || !form.isConnected) return;
    const picture = form.closest('body')?.querySelector('img');
    let row = form.parentElement;
    while (row && row !== document.body && !(picture && row.contains(picture) && row.children.length >= 2)) row = row.parentElement;
    if (row && row !== document.body) {
      mark(row, 'row');
      const [left, rule, right] = row.children;
      if (row.children.length === 3) { mark(left, 'left'); mark(rule, 'rule'); mark(right, 'right'); }
      for (let page = row.parentElement; page && page !== document.body; page = page.parentElement) {
        if (page.parentElement?.id?.startsWith('mount_')) { mark(page, 'page'); break; }
      }
      const headline = left?.querySelector('span span')?.parentElement;
      if (headline && !headline.querySelector('img')) mark(headline, 'headline');
    }
    for (let b = form.parentElement; b && b !== row; b = b.parentElement) {
      if (b.previousElementSibling || b.parentElement?.children.length > 1) { mark(b.parentElement, 'box'); break; }
    }
    const buttons = form.querySelectorAll('[role="button"]');
    mark(buttons[0], 'login');
    if (buttons[1]) mark(buttons[1], 'facebook');
    mark(form.querySelector('a[href*="/accounts/emailsignup"]'), 'signup');
    mark(form.querySelector('a[href*="/accounts/password/reset"]'), 'forgot');
    const meta = form.querySelector('svg[aria-label="Meta logo"]') || document.querySelector('[data-n19-ig="right"] svg[aria-label="Meta logo"]');
    mark(meta?.parentElement, 'meta');
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
