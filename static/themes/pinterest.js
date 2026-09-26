// net19 handmade theme: Pinterest, 2019. Pinterest's dark theme (signed-in setting) repaints its Gestalt tokens; the
// default background-luminance detection follows it. The palette maps move today's warm stone grays back to 2019's
// neutral grays in whichever mode is active, so every Gestalt surface follows; light text goes back to #333.
(() => {
  const gray = {
    '#fbfbf9': '#fafafa', '#f6f6f3': '#f5f5f5', '#efefeb': '#ececec', '#ebebe5': '#e9e9e9', '#e5e5e0': '#efefef', '#dadad3': '#e2e2e2',
    '#cecec5': '#d0d0d0', '#c8c8c1': '#cdcdcd', '#bcbcb3': '#c4c4c4', '#b0b0a6': '#b0b0b0', '#91918c': '#8e8e8e', '#85857f': '#838383',
    '#787873': '#787878', '#74746c': '#767676', '#676760': '#6a6a6a', '#62625b': '#767676', '#5a5a54': '#5a5a5a', '#55554f': '#5f5f5f',
    '#494943': '#4a4a4a', '#474742': '#474747', '#3b3b36': '#3c3c3c', '#33332e': '#333333', '#2d2d29': '#2d2d2d', '#262622': '#262626',
    '#242421': '#242424', '#181816': '#181818', '#10100f': '#101010',
  };
  // 2019's text was a neutral #333, not today's plum-black #211922
  globalThis.net19Theme = { light: { ...gray, '#211922': '#333333' }, dark: gray };
})();
