import { absoluteCSS, cssImports, cssImageURLs, readDocument } from './analyzer';
import { MIN_YEAR, SCHEMA, WARM_BUDGET_MS, parseReplay, publicOrigin, sameSite, validTimestamp, type StylePack } from './shared';
import { encodeSnapshot, DEFAULT_VIEWPORT } from './snapshot';
import { type Renderer, type Raster } from './render';

// `html` is present when the lookup itself already downloaded the capture (replay probe).
type Capture = { timestamp: string; original: string; html?: { text: string; url: string } };
type Fetcher = typeof fetch;
// News homepages of the era often exceed 1 MB of inline markup; the document is parsed inertly.
const HTML_LIMIT = 3_000_000;
export class ArchiveError extends Error {
  constructor(message: string, public reason: 'missing' | 'unavailable' | 'unusable' = 'unavailable') { super(message); }
}

export function cdxUrl(original: string, year: number): string {
  const url = new URL('https://web.archive.org/cdx/search/cdx');
  url.search = new URLSearchParams({ url: original, output: 'json', fl: 'timestamp,original,statuscode,mimetype',
    from: `${MIN_YEAR}`, to: `${year}1231235959`, matchType: 'exact', limit: '-3', fastLatest: 'true' }).toString();
  url.searchParams.append('filter', 'statuscode:200');
  url.searchParams.append('filter', 'mimetype:text/html');
  return url.href;
}

export function parseCaptures(data: unknown, origin: string, year: number): Capture[] {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return [];
  const [header, ...rows] = data as unknown[][];
  const t = header.indexOf('timestamp'), o = header.indexOf('original'), s = header.indexOf('statuscode'), m = header.indexOf('mimetype');
  if (t < 0 || o < 0 || s < 0 || m < 0) return [];
  return rows.filter(row => Array.isArray(row) && validTimestamp(row[t], year) && row[s] === '200' &&
    row[m] === 'text/html' && typeof row[o] === 'string' && publicOrigin(row[o] as string) && sameSite(row[o] as string, origin))
    .map(row => ({ timestamp: row[t] as string, original: row[o] as string }))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);
}

export function replayUrl(capture: Capture): string {
  return `https://web.archive.org/web/${capture.timestamp}id_/${capture.original}`;
}

async function boundedBytes(stream: ReadableStream<Uint8Array>, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new ArchiveError('Archive response too large', 'unusable'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally { reader.releaseLock(); }
}

async function boundedText(response: Response, limit: number): Promise<string> {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new ArchiveError('Archive response too large', 'unusable'); }
  if (!response.body) return '';
  let bytes = await boundedBytes(response.body, limit);
  // Raw Wayback id_ replays can retain gzip bytes while omitting Content-Encoding.
  // Fetch only decompresses when that header is correct. Bound BOTH byte streams.
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    const inflated = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    bytes = await boundedBytes(inflated, limit);
  }
  return new TextDecoder().decode(bytes);
}

// Wayback serves a stylesheet/image from its capture NEAREST to the page capture, which
// is often a few days or months later (a Dec 31 page commonly resolves its CSS to January).
// Rejecting those made most captures "unusable". Assets may come from the following year.
export function assetTimestamp(value: unknown, year: number): value is string {
  return validTimestamp(value, Math.min(year + 1, new Date().getFullYear()));
}
const RETRY_STATUS = new Set([429, 502, 503, 504]);
const sleep = (ms: number, signal: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal.aborted) { reject(new ArchiveError('Cancelled')); return; }
  const timer = setTimeout(() => { signal.removeEventListener('abort', stop); resolve(); }, ms);
  const stop = () => { clearTimeout(timer); reject(new ArchiveError('Cancelled')); };
  signal.addEventListener('abort', stop, { once: true });
});

export class WaybackClient {
  // Wayback rate-limits bursts (429/503). All jobs share one small request pool.
  private active = 0;
  private waiting: Array<() => void> = [];
  constructor(private fetcher: Fetcher = fetch.bind(globalThis), private renderer?: Renderer, private poolSize = 6, private retryDelayMs = 1200, private cdxGraceMs = 2500) {}

  private async pooled<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
    if (this.active >= this.poolSize) await new Promise<void>((resolve, reject) => {
      const go = () => { signal.removeEventListener('abort', stop); resolve(); };
      const stop = () => { const i = this.waiting.indexOf(go); if (i >= 0) this.waiting.splice(i, 1); reject(new ArchiveError('Cancelled')); };
      this.waiting.push(go); signal.addEventListener('abort', stop, { once: true });
    });
    this.active++;
    try { return await work(); } finally { this.active--; this.waiting.shift()?.(); }
  }

  // One retry for rate limiting, gateway errors and dropped connections. Aborts are final.
  private async fetchRetry(url: string, signal: AbortSignal, init: RequestInit): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      try {
        const response = await this.pooled(signal, () => this.fetcher(url, { ...init, signal }));
        if (attempt === 0 && RETRY_STATUS.has(response.status)) {
          await response.body?.cancel().catch(() => undefined);
          await sleep(this.retryDelayMs * (response.status === 429 ? 2 : 1), signal); continue;
        }
        return response;
      } catch (error) {
        if (signal.aborted || attempt > 0 || error instanceof ArchiveError) throw error;
        await sleep(this.retryDelayMs, signal);
      }
    }
  }

  private async raster(url: string, signal: AbortSignal, year: number): Promise<string | null> {
    const controller = new AbortController();
    const abort = () => controller.abort(); signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    const timer = setTimeout(abort, 10_000);
    try {
      const response = await this.fetchRetry(url, controller.signal, { credentials: 'omit', referrerPolicy: 'no-referrer' });
      const final = parseReplay(response.url || url);
      if (!response.ok || !final || !assetTimestamp(final.timestamp, year) || !/^image\/png/i.test(response.headers.get('content-type') ?? '') || !response.body) { await response.body?.cancel(); return null; }
      const bytes = await boundedBytes(response.body, 40_000);
      if (![137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return null;
      let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      return `data:image/png;base64,${btoa(binary)}`;
    } catch { return null; } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
  }

  private async request(url: string, signal: AbortSignal, limit: number, kind: 'json' | 'html' | 'css', year: number): Promise<{ text: string; url: string }> {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !['web.archive.org', 'archive.org'].includes(u.hostname)) throw new ArchiveError('Invalid archive endpoint');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    // CDX regularly takes 15-30 s; Availability and replays usually answer in a few seconds.
    const timer = setTimeout(abort, url.includes('/cdx/') ? 25_000 : kind === 'json' ? 12_000 : 15_000);
    try {
      // The extension's connect-src CSP also blocks redirects to a live website.
      const response = await this.fetchRetry(url, controller.signal, { credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow' });
      if (!response.ok) throw new ArchiveError(`Archive returned ${response.status}`, response.status === 404 ? 'unusable' : 'unavailable');
      const final = new URL(response.url || url);
      if (final.protocol !== 'https:' || !['web.archive.org', 'archive.org'].includes(final.hostname)) throw new ArchiveError('Redirect outside archive');
      if (kind !== 'json') {
        const replay = parseReplay(final.href);
        if (!replay || !(kind === 'css' ? assetTimestamp(replay.timestamp, year) : validTimestamp(replay.timestamp, year)))
          throw new ArchiveError('Capture redirected to a newer year', 'unusable');
      }
      const mime = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (kind === 'html' && !/text\/html|application\/xhtml\+xml/.test(mime)) throw new ArchiveError('Not an HTML capture', 'unusable');
      if (kind === 'css' && !/text\/css|text\/plain|application\/octet-stream/.test(mime)) throw new ArchiveError('Not an archived stylesheet', 'unusable');
      const text = await boundedText(response, limit);
      return { text, url: final.href };
    } finally { clearTimeout(timer); signal.removeEventListener('abort', abort); }
  }

  private async captures(origin: string, year: number, signal: AbortSignal): Promise<Capture[]> {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    const cdx = async () => {
      const result = await this.request(cdxUrl(`${origin}/`, year), controller.signal, 64_000, 'json', year);
      return parseCaptures(JSON.parse(result.text), origin, year);
    };
    const available = async (): Promise<Capture[]> => {
      const endpoint = new URL('https://archive.org/wayback/available');
      // The Availability index can miss older HTTP→HTTPS migrations when queried
      // with only today's HTTPS origin. A scheme-less homepage covers both.
      // Ask for the capture closest to MID-year. Asking for Dec 31 usually returns a
      // Jan 1 capture of the following year, which is then rejected as too new.
      endpoint.search = new URLSearchParams({ url: `${new URL(origin).host}/`, timestamp: `${year}0701` }).toString();
      const result = await this.request(endpoint.href, controller.signal, 16_000, 'json', year);
      const closest = JSON.parse(result.text)?.archived_snapshots?.closest;
      if (closest?.available !== true || String(closest.status) !== '200' || !validTimestamp(closest.timestamp, year)) return [];
      const replay = typeof closest.url === 'string' && parseReplay(closest.url.replace(/^http:/, 'https:'));
      return replay && replay.timestamp === closest.timestamp && sameSite(replay.original, origin) ? [replay] : [];
    };
    // The replay engine is the most reliable index: it redirects a mid-year timestamp to
    // the nearest real capture in about a second and returns the page itself. Availability
    // returns nothing for many heavily archived sites, and CDX often needs 15-40 s.
    const probe = async (): Promise<Capture[]> => {
      const html = await this.request(`https://web.archive.org/web/${year}0701000000id_/${origin}/`, controller.signal, HTML_LIMIT, 'html', year);
      const replay = parseReplay(html.url);
      return replay && sameSite(replay.original, origin) ? [{ ...replay, html }] : [];
    };
    type Settled = { status: 'fulfilled'; value: Capture[] } | { status: 'rejected'; reason: unknown };
    const jobs: Promise<Settled>[] = [probe(), available(), cdx()].map(job => job.then(value => ({ status: 'fulfilled' as const, value }), reason => ({ status: 'rejected' as const, reason })));
    try {
      // Continue as soon as any index yields a usable capture, after a short grace period
      // in which a slower index may still contribute a newer capture from the same year.
      const results: Settled[] = [];
      await new Promise<void>(resolve => {
        let done = 0, grace: ReturnType<typeof setTimeout> | undefined;
        const finish = () => { clearTimeout(grace); resolve(); };
        for (const job of jobs) void job.then(result => {
          results.push(result);
          if (++done === jobs.length) finish();
          else if (result.status === 'fulfilled' && result.value.length && !grace) grace = setTimeout(finish, this.cdxGraceMs);
        });
        controller.signal.addEventListener('abort', finish, { once: true });
      });
      const candidates = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
      if (!candidates.length && results.length === jobs.length && results.every(result => result.status === 'rejected')) {
        const unusable = results.every(r => r.status === 'rejected' && r.reason instanceof ArchiveError && r.reason.reason === 'unusable');
        throw new ArchiveError('Archive indexes unavailable', unusable ? 'missing' : 'unavailable');
      }
      const unique = new Map<string, Capture>();
      for (const capture of candidates) if (!unique.get(capture.timestamp)?.html) unique.set(capture.timestamp, capture);
      return [...unique.values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);
    } finally { signal.removeEventListener('abort', abort); controller.abort(); }
  }

  private async profile(origin: string, targetYear: number, capture: Capture, signal: AbortSignal): Promise<StylePack | null> {
    const html = capture.html ?? await this.request(replayUrl(capture), signal, HTML_LIMIT, 'html', targetYear);
    const resolved = parseReplay(html.url);
    if (!resolved || !sameSite(resolved.original, origin)) return null;
    const document = readDocument(html.text, resolved.original);
    if (!document) return null;
    const meta = { origin, targetYear, capturedAt: resolved.timestamp, snapshotUrl: replayUrl(resolved) };
    // Preserve stylesheet order, even when downloads complete out of order.
    let external = 0;
    const selected = document.sheets.filter(s => s.text !== undefined || ++external <= 6);
    type Sheet = { text: string; base: string };
    const downloads = new Map<string, Promise<Sheet | null>>();
    const download = (href: string, limit: number): Promise<Sheet | null> => {
      let pending = downloads.get(href);
      if (!pending) {
        pending = this.request(replayUrl({ timestamp: resolved.timestamp, original: href }), signal, limit, 'css', targetYear)
          .then(result=>({text:result.text,base:parseReplay(result.url)?.original??href}),()=>null);
        downloads.set(href,pending);
      }
      return pending;
    };
    const [mainSheets, images] = await Promise.all([
      Promise.all(selected.map(s=>s.text!==undefined ? Promise.resolve({text:s.text,base:s.base??resolved.original}) : download(s.href!,750_000))),
      Promise.all(document.images.map(async image => {
        const data = await this.raster(replayUrl({ timestamp: resolved.timestamp, original: image.url }), signal, targetYear);
        return data ? { id: image.id, data } : null;
      })),
    ]);
    if (selected.some(s=>s.href) && !selected.some((s,i)=>s.href && mainSheets[i]?.text.trim())) return null;
    // Discover imports in source order after the parallel downloads finish. A shared
    // resource is fetched once but appears at every original cascade position.
    const references = mainSheets.map(sheet=>sheet ? cssImports(sheet.text,sheet.base) : []);
    const importURLs = [...new Set(references.flat().map(ref=>ref.url))].slice(0,3);
    const imported = new Map(await Promise.all(importURLs.map(async url=>[url,await download(url,250_000)] as const)));
    const wrap = (text: string, media?: string) => media ? `@media ${media}{${text}}` : text;
    const sheets = mainSheets.flatMap((sheet,index)=>{
      if (!sheet) return [];
      const pieces = references[index].flatMap(ref=>{
        const nested=imported.get(ref.url);
        return nested ? [wrap(absoluteCSS(nested.text,nested.base),ref.media)] : [];
      });
      pieces.push(absoluteCSS(sheet.text,sheet.base));
      return pieces.map(css=>wrap(css,selected[index].media));
    });
    const backgrounds = await Promise.all(cssImageURLs(sheets,resolved.original).map(async(url,index)=>{
      const data=await this.raster(replayUrl({timestamp:resolved.timestamp,original:url}),signal,targetYear);
      return data?{id:`css-${index}`,url,data}:null;
    }));
    if (signal.aborted) return null;
    if (document.sheets.length && !sheets.some(sheet=>sheet.trim())) return null;
    if (!this.renderer) throw new ArchiveError('A local browser renderer is required');
    const resources: Raster[] = [...images.filter((image): image is Raster => !!image), ...backgrounds.filter(image=>image!==null)];
    const snapshot = await this.renderer({ document, sheets, images: resources, original: resolved.original, viewport: DEFAULT_VIEWPORT });
    if (!snapshot || snapshot.nodes.length < 3 || signal.aborted) return null;
    return { ...meta, schema: SCHEMA, source: 'wayback', snapshot: await encodeSnapshot(snapshot), palette: [], createdAt: Date.now(), ruleCount: snapshot.nodes.length };
  }

  async load(origin: string, year: number, outerSignal?: AbortSignal): Promise<StylePack> {
    if (publicOrigin(origin) !== origin) throw new ArchiveError('Unsupported website', 'missing');
    const controller = new AbortController();
    const abort = () => controller.abort();
    outerSignal?.addEventListener('abort', abort, { once: true });
    if (outerSignal?.aborted) controller.abort();
    const timer = setTimeout(abort, WARM_BUDGET_MS);
    let failed = false, found = false;
    const attempt = async (capture: Capture): Promise<StylePack | null> => {
      found = true;
      try { return await this.profile(origin, year, capture, controller.signal); }
      catch (error) { if (!(error instanceof ArchiveError && error.reason === 'unusable')) failed = true; return null; }
    };
    try {
      const captures = await this.captures(origin, year, controller.signal);
      for (const capture of captures.slice(0, 2)) {
        if (controller.signal.aborted) break;
        const pack = await attempt(capture); if (pack) return pack;
      }
      // An unusable year gets one bounded attempt at the closest older year's capture.
      const olderYear = Number(captures.at(-1)?.timestamp.slice(0, 4) ?? year) - 1;
      if (olderYear >= MIN_YEAR && !controller.signal.aborted) {
        const older = await this.captures(origin, olderYear, controller.signal);
        if (older[0]) { const pack = await attempt(older[0]); if (pack) return pack; }
      }
      // Distinguish an archive outage (retry soon) from "captures exist but cannot be read"
      // and from "never archived", so each is reported and cached for an appropriate time.
      throw new ArchiveError('No usable historical styling', failed || controller.signal.aborted ? 'unavailable' : found ? 'unusable' : 'missing');
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', abort);
      controller.abort();
    }
  }
}
