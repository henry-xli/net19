import { analyze, readDocument } from '../src/analyzer';
export const ORIGIN = 'https://net19-fixture.example';
export const TIMESTAMP = '20190912120000';
export const OLD_CSS = `body {background:#f8f0dc;color:#252c22;font:16px/1.5 Georgia,serif}
h1,h2{font-family:Georgia,serif;font-weight:700}a{color:#254f87}
button{background-color:#304d2b;color:#ffffff;border-radius:0px}`;
export const OLD_HTML = `<!doctype html><html><head><title>The Daily Signal</title><style>${OLD_CSS}</style></head><body><h1>The Daily Signal</h1><p>Independent ideas for a thoughtful day on the web.</p><a href="/story">Read the whole story</a></body></html>`;
export const LIVE_HTML = `<!doctype html><html><head><title>The Daily Signal</title><style>body{margin:0;background:#f0f1fa;color:#25305b;font-family:Arial,sans-serif;font-size:16px}main{max-width:850px;margin:70px auto;padding:32px}h1{font:700 64px Arial;line-height:1.05;letter-spacing:-2px}p{line-height:1.7}header{border-bottom:1px solid #8993bb;padding:20px 0;font-weight:bold}button{background:#554ac9;color:white;border:0;border-radius:16px;padding:12px 20px}input{padding:10px}a{color:#554ac9}</style></head><body><main><header>THE DAILY SIGNAL <span> / INDEPENDENT SINCE 2007</span></header><h1>A slower corner<br>of the internet.</h1><p>This is today's content. With net19, a familiar palette and typography can come from the past, while links, forms, and stories stay right here.</p><p><a href="/next">Discover something worth your time →</a></p><form><label>Your email <input name="email" type="email" placeholder="you@example.com"></label><button type="button" onclick="document.getElementById('result').textContent='You are subscribed.'">Subscribe</button></form><p id="result" role="status"></p></main></body></html>`;
export function makePack(origin = ORIGIN, year = 2019) {
  const timestamp = `${year}0912120000`;
  const doc = readDocument(OLD_HTML, `${origin}/`)!;
  const pack = analyze(doc, [OLD_CSS], { origin, targetYear: year, capturedAt: timestamp,
    snapshotUrl: `https://web.archive.org/web/${timestamp}id_/${origin}/` });
  if (!pack) throw new Error('Fixture did not produce a style pack');
  return pack;
}
