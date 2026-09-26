// net19 handmade theme: Tripadvisor. The site has a single (light) design; the default background-luminance detection
// keeps it light. The palette map turns today's forest-green ink (#002b11) back to 2019's near-black #000a12 (2019 CSS).
globalThis.net19Theme = {
  light: { '#002b11': '#000a12', '#335541': '#4a4a4a' },
  dark: { '#002b11': '#000a12', '#335541': '#4a4a4a' },
};
// "Plan with AI" and "Ask AI" did not exist in 2019. They carry no stable label to select by, so they are found by
// their visible text (buttons and links only).
(() => {
  const AI = /^\s*(Plan with AI|Ask AI|Build a trip with AI|Try AI)\s*$/i;
  const hide = () => {
    for (const node of document.querySelectorAll('header button, header a, form button, [data-automation^="topNav"] a, [data-automation^="topNav"] button')) {
      if (!AI.test(node.textContent || '')) continue;
      // Take the wrapper too (it carries the button's animated glow) while it holds no other text.
      let target = node;
      while (target.parentElement && !target.parentElement.matches('header, nav, form, ul, body')
        && target.parentElement.textContent.trim() === node.textContent.trim()) target = target.parentElement;
      if (!target.hasAttribute('data-net19-hidden')) target.setAttribute('data-net19-hidden', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; hide(); }); };
  const start = () => { hide(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
