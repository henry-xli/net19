// net19 handmade theme: Indeed. Indeed has a single (light) design; the default background-luminance detection keeps
// it light. The palette maps move today's navy action blue and warm grays back to 2019's #085ff7 and neutral grays.
(() => {
  const map = {
    '#004fcb': '#085ff7', '#003a9b': '#0452d8', '#002970': '#0444b4',
    '#f7f6f5': '#f7f7f7', '#f3f2f1': '#f2f2f2', '#e4e2e0': '#e4e4e4', '#d4d2d0': '#d4d4d4', '#b4b2b1': '#b3b3b3',
  };
  globalThis.net19Theme = { light: map, dark: map };
})();
// 2019 wording: the search button said "Find Jobs" and the first tab "Find Jobs" (not "Search" and "Home").
(() => {
  const fix = () => {
    // The home page (where the logo sits beside the search fields) is marked for the stylesheet.
    const home = !!document.getElementById('jobsearch-HomePage');
    if (document.documentElement.hasAttribute('data-n19-home') !== home) document.documentElement.toggleAttribute('data-n19-home', home);
    const button = document.querySelector('#jobsearch .yosegi-InlineWhatWhere-primaryButton span');
    if (button && button.textContent === 'Search') button.textContent = 'Find Jobs';
    const tab = document.querySelector('#gnav-main-container a#FindJobs');
    if (tab && tab.childNodes.length === 1 && tab.firstChild.nodeType === 3 && tab.textContent === 'Home') tab.firstChild.nodeValue = 'Find Jobs';
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
