// net19 handmade theme: Google Search, 2019. Palette tokens live in google.css (mapped onto Google's own
// variables by name). Google renders its light/dark palette server-side and may differ from the device setting,
// so the mode is read from one of Google's variables that the theme leaves untouched.
globalThis.net19Theme = {
  detect() {
    const probe = getComputedStyle(document.documentElement).getPropertyValue('--yTtsEf').trim().toLowerCase();
    if (probe === '#c4eed0') return 'dark';
    if (probe === '#072711') return 'light';
    return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  },
};
// "AI Overview" did not exist in 2019. It has no stable id, so its top-level block is found by its heading.
(() => {
  const hide = () => {
    for (const heading of document.querySelectorAll('h1, h2, div[role="heading"], strong')) {
      if (heading.textContent.trim() !== 'AI Overview' || heading.closest('[data-net19-hidden]')) continue;
      let block = heading;
      while (block.parentElement && !['rso', 'center_col', 'search', 'rcnt', 'main'].includes(block.parentElement.id) && block.parentElement !== document.body) block = block.parentElement;
      if (block.parentElement && block.parentElement !== document.body) { block.setAttribute('data-net19-hidden', ''); block.style.setProperty('display', 'none', 'important'); }
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; hide(); }); };
  const start = () => { hide(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
// Signed-in homepages replace the two buttons with a row of pill chips ("Create images", "Ask about files",
// "Brainstorm", "I'm feeling lucky"). guard.js hides the three AI chips; the remaining "I'm feeling lucky" chip is
// marked so google.css can draw it as the 2019 gray button. The chip has no stable class, so it is found by its text.
(() => {
  const LUCKY = /^i['’]?m feeling lucky$/i;
  const mark = () => {
    for (const el of document.querySelectorAll('a, button, [role="button"], [role="link"]')) {
      if (el.hasAttribute('data-net19-lucky') || el.closest('#rso, #search')) continue;
      const text = (el.textContent || '').replace(/\s+/g, ' ').replace(/^[^\p{L}]+|[^\p{L}]+$/gu, '').trim();
      if (LUCKY.test(text)) el.setAttribute('data-net19-lucky', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; mark(); }); };
  const start = () => { mark(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
