// net19 handmade theme: Twitter, late 2019. Its three backgrounds (Default, Dim, Lights out) all existed in 2019;
// the page background tells which one is in use.
globalThis.net19Theme = {
  detect() {
    const bg = getComputedStyle(document.body || document.documentElement).backgroundColor;
    const [r, g, b] = (bg.match(/\d+/g) || [255, 255, 255]).map(Number);
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
