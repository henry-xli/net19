// net19 handmade theme: Messenger (messenger.com), 2019. Signed in, messenger.com runs Facebook's Comet app, which marks
// its dark mode with html.__fb-dark-mode; the signed-out login page is light only.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('__fb-dark-mode') ? 'dark' : 'light',
  watch: ['class'],
  // Post-2019 controls, hidden by label: Meta AI and AI images (2023-24), the Stories/People/Marketplace/Communities
  // rail entries (2020-23), vanish mode (2020), chat themes (2020), notes (2022), AI characters and "Imagine".
  later: /^(?:meta ai|ask meta ai|chat with meta ai|imagine|imagine with meta ai|generate(?: an)? (?:ai )?image|create (?:an )?ai image|ai images?|ai studio|ai characters?|create an ai|discover ais?|stories|your story|add to story|people|marketplace|communities|community chats?|create community|vanish mode|turn on vanish mode|change theme|theme|themes|chat themes?|your note|share a note|leave a note|notes|soundmoji|send a soundmoji)$/i,
  keepLabels: /^(?:chats|requests|archive|archived chats|message requests)$/i,
};
(() => {
  const E2EE = /end-to-end encrypt|secured with end-to-end|messages and calls are secured/i;
  const mark = el => { if (el && el.getAttribute('data-n19-msgr') !== 'later') el.setAttribute('data-n19-msgr', 'later'); };
  const fix = () => {
    // "Ask Meta AI or Search" (2023) was "Search Messenger"
    for (const field of document.querySelectorAll('input[type="search"][placeholder], [role="navigation"] input[placeholder]')) {
      if (/meta ai/i.test(field.placeholder) || (field.placeholder === 'Search' && field.closest('[role="navigation"]'))) field.placeholder = 'Search Messenger';
    }
    // the list header said "Messenger"
    for (const h of document.querySelectorAll('[role="navigation"] h1')) {
      const t = h.querySelector('span:not(:has(*))') || h;
      if (!t.querySelector('*') && t.textContent.trim() === 'Chats') t.textContent = 'Messenger';
    }
    const main = document.querySelectorAll('[role="main"]');
    for (const root of main) {
      for (const el of root.querySelectorAll('span, div')) {
        if (el.firstElementChild || el.hasAttribute('data-n19-msgr')) continue;
        const text = el.textContent.trim();
        // "Edited" under a message (2023)
        if (text === 'Edited') { mark(el); continue; }
        // end-to-end encryption notices (2023): the smallest block that holds only the notice
        if (text.length < 200 && E2EE.test(text)) {
          let block = el;
          while (block.parentElement && block.parentElement !== root && block.parentElement.textContent.trim().length <= text.length + 40
            && !block.parentElement.querySelector('input, textarea, [contenteditable="true"]')) block = block.parentElement;
          mark(block);
        }
      }
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; setTimeout(() => requestAnimationFrame(() => { queued = false; fix(); }), 120); };
  const start = () => {
    fix();
    new MutationObserver(later).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['placeholder'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
