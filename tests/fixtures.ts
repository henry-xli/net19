import { gzipSync } from 'node:zlib';
import { SCHEMA } from '../src/shared';
import { type Snapshot } from '../src/snapshot';
export const ORIGIN = 'https://net19-fixture.example';
export const TIMESTAMP = '20190912120000';
export const OLD_CSS = `body {background:#f8f0dc;color:#252c22;font:16px/1.5 Georgia,serif}
h1,h2{font-family:Georgia,serif;font-weight:700}a{color:#254f87}
button{background-color:#304d2b;color:#ffffff;border-radius:0px}`;
export const OLD_HTML = `<!doctype html><html><head><title>The Daily Signal</title><style>${OLD_CSS}</style></head><body><h1>The Daily Signal</h1><p>Archived report and navigation example.</p><a href="/story">Read the whole story</a></body></html>`;
export const SAMPLE: Snapshot = {
  version: 1, width: 1280, height: 800, pageHeight: 800, compact: true,
  body: { color: 'rgb(37, 44, 34)', 'background-color': 'rgb(248, 240, 220)', 'font-family': 'Georgia, serif', 'font-size': '16px' },
  styles: [{ color: 'rgb(37, 44, 34)', 'background-color': 'rgba(0, 0, 0, 0)', 'font-family': 'Georgia, serif', 'font-size': '16px' }],
  nodes: ['h1','p','a','form','input','button'].map((tag, i) => ({ descriptor: { kind: tag === 'input' ? 'field' : tag === 'button' ? 'button' : tag === 'form' ? 'form' : tag === 'a' ? 'link' : 'text', tag, id: '', classes: [], name: tag === 'input' ? 'email' : '', type: '', label: tag === 'h1' ? 'Daily Signal' : tag, href: '', children: [] }, box: { x:100,y:70+i*45,w:250,h:32 }, style:0,parent:-1 })),
};
export function makePack(origin = ORIGIN, year = 2019) {
  const timestamp = `${year}0912120000`;
  return { origin, targetYear: year, capturedAt: timestamp, schema: SCHEMA, source: 'wayback' as const,
    snapshotUrl: `https://web.archive.org/web/${timestamp}id_/${origin}/`, snapshot: gzipSync(JSON.stringify(SAMPLE)).toString('base64'), palette: [], createdAt:Date.now(), ruleCount: SAMPLE.nodes.length };
}
