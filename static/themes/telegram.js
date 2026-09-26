// net19 handmade theme: Telegram Web, 2019 (webogram). Both of today's clients keep their own dark setting: K marks it
// with html.night, A with html.theme-dark; both modes are restyled. Menu entries for features added after 2019 are hidden
// by label: guard.js handles A's role="menuitem" rows, and K's plain .btn-menu-item rows are hidden here.
(() => {
  const LATER = /^(?:telegram premium|premium|my stars|stars|buy stars|telegram stars|send (?:a )?gifts?|gifts?|gift premium|my stories|stories|post story|mini apps?|apps|open app|wallet|business|telegram business|my profile gifts|boosts?|stickers? maker|create sticker|translate|show translation|translate to .{2,20}|telegram features|star reactions?|paid reaction|call|video call|voice call|start video chat|video chat|live stream|start live stream)$/i;
  globalThis.net19Theme = {
    detect: () => {
      const c = document.documentElement.classList;
      return c.contains('night') || c.contains('theme-dark') ? 'dark' : 'light';
    },
    watch: ['class'],
    later: LATER,
  };
  const text = el => (el.textContent || '').replace(/\s+/g, ' ').trim();
  const hide = () => {
    for (const item of document.querySelectorAll('.btn-menu .btn-menu-item:not([data-net19-hidden])')) {
      const label = text(item.querySelector('.btn-menu-item-text') || item);
      if (label.length < 40 && LATER.test(label)) item.setAttribute('data-net19-hidden', '');
    }
    // Profile tabs added after 2019 (stories 2023, gifts 2024, saved music 2025)
    for (const tab of document.querySelectorAll('.search-super-tabs .menu-horizontal-div-item:not([data-net19-hidden])')) {
      if (/^(?:stories|gifts|posts|saved music|similar channels|similar bots)$/i.test(text(tab))) tab.setAttribute('data-net19-hidden', '');
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; hide(); }); };
  const start = () => { hide(); new MutationObserver(later).observe(document.body, { childList: true, subtree: true }); };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
