// net19 handmade theme: Canva marketing pages, 2019. Canva marks its color scheme with html.theme.light / html.theme.dark.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  watch: ['class'],
  // Menu entries for tools that arrived after 2019 (the AI generators, Magic Write and friends, Canva Code)
  later: /^(?:AI [\w ]+|[\w ]+ AI|All Canva AI|Canva AI[\w ]*|Canva Code|Magic (?:Write|Animate|Layers|Insights|Formulas|Media|Design|Studio)|Text to speech voiceover|Image enhancer|Marketing and AI)$/i,
};
// 2019 wording: the hero subtitle had no "AI-powered" (Canva's AI tools arrived in 2022).
(() => {
  const fix = () => {
    const h1 = document.querySelector('#root main h1');
    const box = h1?.parentElement;
    if (!box) return;
    const walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) if (/\bAI-powered\s+/i.test(n.nodeValue)) n.nodeValue = n.nodeValue.replace(/\bAI-powered\s+/gi, '');
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => { fix(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
