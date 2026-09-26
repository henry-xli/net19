// net19 handmade theme: Allrecipes, 2019. allrecipes.com has no dark mode; default detection keeps it light.
// Palette: today's burnt-orange brand family moves to 2019's brighter #ff7e1a orange; brand links follow it.
// The header's "Get the app" link promotes the MyRecipes app (2024), which did not exist in 2019: guard.js hides it by label.
globalThis.net19Theme = {
  later: /^get the app$/i,
  light: { '#d54215': '#ff7e1a', '#b53811': '#e8680a', '#114388': '#e8680a', '#f5f6ea': '#f2f2f2', '#e7ab46': '#feaa26' },
  dark: { '#d54215': '#ff7e1a', '#b53811': '#e8680a' },
};
