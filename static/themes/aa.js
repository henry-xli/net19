// net19 handmade theme: American Airlines, 2019. aa.com has no dark mode, so the default luminance detection applies.
globalThis.net19Theme = {};
// The header is a web component (adc-header) whose menu tabs live in shadow roots that page CSS cannot reach. One small
// rule is adopted into its shadow root so the main menu words go back to 2019's light blue (a few passes after load).
(() => {
  const rules = 'adc-tab::part(tab){color:var(--n19-blue)!important;font-weight:300!important;font-size:20px!important}'
    + 'adc-tab,adc-tab *{font-weight:300!important;color:var(--n19-blue)!important}';
  let sheet = null;
  const pass = () => {
    const sr = document.querySelector('adc-header')?.shadowRoot;
    if (!sr || sheet && sr.adoptedStyleSheets.includes(sheet)) return;
    if (!sheet) { sheet = new CSSStyleSheet(); sheet.replaceSync(rules); }
    sr.adoptedStyleSheets = [...sr.adoptedStyleSheets, sheet];
  };
  addEventListener('load', () => { for (const ms of [0, 1000, 3000, 6000]) setTimeout(pass, ms); }, { once: true });
})();
