// net19 handmade theme: kbb. Kelley Blue Book has a single (light) design; if it ever renders dark, the palette
// engine detects that from the page background and the dark tokens apply.
globalThis.net19Theme = {};
// The 2019 homepage hero said "Car Shopping Made Easy / KBB.com is your one-stop resource" (today: "Kelley Knows Cars.").
(() => {
  const fix = () => {
    const hero = document.getElementById('superheroSection');
    if (!hero) return false;
    const h1 = hero.querySelector('h1');
    if (h1 && /^\s*Kelley Knows Cars\.?\s*$/.test(h1.textContent)) h1.textContent = 'Car Shopping Made Easy';
    const sub = h1?.nextElementSibling;
    if (sub?.tagName === 'H2' && /values to repairs/i.test(sub.textContent)) sub.textContent = 'KBB.com is your one-stop resource';
    return !!h1;
  };
  let queued = false, observer = null;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    observer = new MutationObserver(later);
    observer.observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
