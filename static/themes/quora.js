// net19 handmade theme: Quora, 2019, light and dark. Quora marks its own dark mode (2021) with body.q-color-mode--dark.
// Small DOM fixes: the header's icon-only items get their 2019 text labels (Home, Answer, Spaces, Notifications), and
// answers written by Quora's AI "Assistant" bot (Poe, 2023), recognisable by the bot's avatar, are hidden whole.
globalThis.net19Theme = {
  detect: () => document.body?.classList.contains('q-color-mode--dark') ? 'dark' : 'light',
  watch: ['class'],
  // Post-2019 controls, by label: Quora+ (2021), Poe and the AI assistant (2023), the 2021 dark-mode switch.
  later: /^(?:try quora\+?|join quora\+?|subscribe to quora\+?|get quora\+?|quora\+ content|poe|try poe|open in poe|chat with poe|ask poe|ask assistant|assistant|continue in poe|dark mode)$/i,
};
(() => {
  const LABELS = { '/': 'Home', '/answer': 'Answer', '/spaces': 'Spaces', '/notifications': 'Notifications' };
  const labels = () => {
    for (const a of document.querySelectorAll('.spacing_log_header_nav a[href]')) {
      const path = new URL(a.href, location.href).pathname;
      const label = LABELS[path];
      if (!label || a.querySelector('[data-n19-label]') || a.textContent.trim()) continue;
      const span = document.createElement('span'); span.setAttribute('data-n19-label', ''); span.textContent = label;
      (a.querySelector('.q-flex, .q-inlineFlex, div') || a).append(span);
    }
  };
  // The AI Assistant's answers carry the Poe multibot avatar; the whole answer item goes.
  const assistant = () => {
    for (const img of document.querySelectorAll('img[src*="poe.multibot"], img[src*="images.poe"], img[src*="poe_"]')) {
      const item = img.closest('[class*="dom_annotate_question_answer_item"], [class*="dom_annotate_multifeed_bundle"]');
      if (item && !item.hasAttribute('data-n19-ai')) item.setAttribute('data-n19-ai', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; labels(); assistant(); }); };
  const start = () => { labels(); assistant(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
