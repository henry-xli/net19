// net19 handmade theme: Spotify. The web player marks its dark theme with html.encore-dark-theme (it is always dark
// today); spotify.com's marketing pages are light. The palette map moves today's bright green back to 2019's #1db954.
globalThis.net19Theme = {
  detect: () => document.documentElement.classList.contains('encore-dark-theme') ? 'dark' : 'light',
  watch: ['class'],
  light: { '#1ed760': '#1db954' },
  dark: { '#1ed760': '#1db954' },
};
