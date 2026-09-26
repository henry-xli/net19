// net19 handmade theme: TikTok, 2019. TikTok marks its theme with html[data-theme="dark" | "light"] (its "Auto" setting
// usually picks dark); dark is the 2019 design on TikTok's own #121212 page. The palette maps today's coral back to
// 2019's #fe2c55.
globalThis.net19Theme = {
  detect: () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light',
  watch: ['data-theme', 'data-tux-color-scheme'],
  light: { '#ff3b5c': '#fe2c55', '#ff5370': '#ff4368', '#ff4b69': '#ff3c61', '#ff4363': '#fe345b' },
  dark: { '#ff3b5c': '#fe2c55', '#ff5370': '#ff4368', '#ff4b69': '#ff3c61', '#ff4363': '#fe345b', '#000': '#121212' },
  // Controls that came later; guard.js hides them wherever they appear
  later: /^(?:shop|tiktok shop|sell on tiktok shop|live|go live|live tools|live studio|explore|friends|activity|short dramas|get coins|get app|pc app|download app|open app|tiktok studio|create tiktok effects|effects|rewards|coins|ai-generated|creator labeled as ai-generated|ai self|symphony|tiktok symphony)$/i,
  keepLabels: /^(?:for you|following|profile|more|log in|search)$/i,
};
// The feed's 2019 author row: TikTok now draws the name and caption over the video and the avatar in the action bar.
// tiktok.css moves the name and caption above the video; here each item gets the avatar (a copy of
// TikTok's own image and link), the bold unique id before the display name, and an outlined "Follow" that presses
// TikTok's own follow button. Items are reused as the feed scrolls, so every part is refreshed from its item.
(() => {
  const ITEM = '[data-e2e="recommend-list-item-container"]';
  const make = (tag, name) => { const el = document.createElement(tag); el.setAttribute('data-n19-tt', name); return el; };
  const fix = () => {
    for (const item of document.querySelectorAll(ITEM)) {
      const content = item.querySelector('[class*="--DivOverlayBottomContent"]');
      const creator = item.querySelector('[class*="--DivCreatorInfoContainer"]');
      const authorLink = item.querySelector('a[data-e2e="video-author-avatar"]');
      const href = (creator?.querySelector('a[href*="/@"]') || authorLink)?.getAttribute('href') || '';
      const id = decodeURIComponent((href.match(/\/@([^/?#]+)/) || [])[1] || '');
      if (!content || !creator || !id) continue;
      let avatar = content.querySelector(':scope > [data-n19-tt="avatar"]');
      if (!avatar) { avatar = make('a', 'avatar'); avatar.append(document.createElement('img')); content.prepend(avatar); }
      const src = authorLink?.querySelector('img')?.getAttribute('src') || '';
      const img = avatar.firstElementChild;
      if (avatar.getAttribute('href') !== href) avatar.setAttribute('href', href);
      avatar.setAttribute('aria-label', id);
      if (src && img.getAttribute('src') !== src) img.setAttribute('src', src);
      img.alt = '';
      let uid = creator.querySelector(':scope > [data-n19-tt="uid"]');
      if (!uid) { uid = make('a', 'uid'); creator.prepend(uid); }
      if (uid.getAttribute('href') !== href) uid.setAttribute('href', href);
      if (uid.textContent !== id) uid.textContent = id;
      const real = item.querySelector('[data-e2e="feed-follow"]');
      let follow = content.querySelector(':scope > [data-n19-tt="follow"]');
      if (!follow) {
        follow = make('button', 'follow'); follow.type = 'button'; follow.textContent = 'Follow';
        follow.addEventListener('click', event => { event.preventDefault(); event.stopPropagation(); event.currentTarget.closest(ITEM)?.querySelector('[data-e2e="feed-follow"]')?.click(); });
        content.append(follow);
      }
      follow.hidden = !real;
    }
  };
  let queued = false;
  const later = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; fix(); }); };
  const start = () => {
    fix();
    new MutationObserver(records => { for (const r of records) if (!(r.target instanceof Element && r.target.closest('[data-n19-tt]'))) { later(); return; } })
      .observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['href', 'src'] });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start, { once: true });
})();
