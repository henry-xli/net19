import { analyze, cssImports, readDocument } from './analyzer';
import { MIN_YEAR, WARM_BUDGET_MS, parseReplay, publicOrigin, sameSite, validTimestamp, type StylePack } from './shared';

type Capture = { timestamp: string; original: string };
type Fetcher = typeof fetch;
export class ArchiveError extends Error {
  constructor(message: string, public reason: 'missing' | 'unavailable' = 'unavailable') { super(message); }
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
      if (size > limit) { await reader.cancel(); throw new ArchiveError('Archive response too large'); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return bytes;
  } finally { reader.releaseLock(); }
}

async function boundedText(response: Response, limit: number): Promise<string> {
  if (Number(response.headers.get('content-length')) > limit) { await response.body?.cancel(); throw new ArchiveError('Archive response too large'); }
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

export class WaybackClient {
  constructor(private fetcher: Fetcher = fetch.bind(globalThis)) {}

  private async request(url: string, signal: AbortSignal, limit: number, kind: 'json' | 'html' | 'css', year: number): Promise<{ text: string; url: string }> {
    const u = new URL(url);
    if (u.protocol !== 'https:' || !['web.archive.org', 'archive.org'].includes(u.hostname)) throw new ArchiveError('Invalid archive endpoint');
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) controller.abort();
    const timer = setTimeout(abort, kind === 'json' ? 6000 : 4500);
    try {
      // The extension's connect-src CSP also blocks redirects to a live website.
      const response = await this.fetcher(url, { signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', redirect: 'follow' });
      if (!response.ok) throw new ArchiveError(`Archive returned ${response.status}`);
      const final = new URL(response.url || url);
      if (final.protocol !== 'https:' || !['web.archive.org', 'archive.org'].includes(final.hostname)) throw new ArchiveError('Redirect outside archive');
      if (kind !== 'json') {
        const replay = parseReplay(final.href);
        if (!replay || !validTimestamp(replay.timestamp, year)) throw new ArchiveError('Capture redirected to a newer year');
      }
      const mime = response.headers.get('content-type')?.toLowerCase() ?? '';
      if (kind === 'html' && !/text\/html|application\/xhtml\+xml/.test(mime)) throw new ArchiveError('Not an HTML capture');
      if (kind === 'css' && !/text\/css|text\/plain|application\/octet-stream/.test(mime)) throw new ArchiveError('Not an archived stylesheet');
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
      endpoint.search = new URLSearchParams({ url: `${new URL(origin).host}/`, timestamp: `${year}0701` }).toString();
      const result = await this.request(endpoint.href, controller.signal, 16_000, 'json', year);
      const closest = JSON.parse(result.text)?.archived_snapshots?.closest;
      if (closest?.available !== true || String(closest.status) !== '200' || !validTimestamp(closest.timestamp, year)) return [];
      const replay = typeof closest.url === 'string' && parseReplay(closest.url.replace(/^http:/, 'https:'));
      return replay && replay.timestamp === closest.timestamp && sameSite(replay.original, origin) ? [replay] : [];
    };
    const jobs = [cdx(), available()];
    try {
      // Race the two public indexes for a target-year hit. An older answer waits for
      // both so it cannot preempt an available capture from the requested year.
      try {
        return await Promise.any(jobs.map(async job => {
          const captures = await job;
          if (captures.some(c => c.timestamp.startsWith(String(year)))) return captures;
          throw new ArchiveError('No target-year capture', 'missing');
        }));
      } catch {
        const results = await Promise.allSettled(jobs);
        const candidates = results.flatMap(result => result.status === 'fulfilled' ? result.value : []);
        if (!candidates.length && results.every(result => result.status === 'rejected')) throw new ArchiveError('Archive indexes unavailable');
        return [...new Map(candidates.map(c => [c.timestamp, c])).values()].sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, 3);
      }
    } finally { signal.removeEventListener('abort', abort); controller.abort(); }
  }

  private async profile(origin: string, targetYear: number, capture: Capture, signal: AbortSignal): Promise<StylePack | null> {
    const html = await this.request(replayUrl(capture), signal, 1_000_000, 'html', targetYear);
    const resolved = parseReplay(html.url);
    if (!resolved || !sameSite(resolved.original, origin)) return null;
    const document = readDocument(html.text, resolved.original);
    if (!document) return null;
    const meta = { origin, targetYear, capturedAt: resolved.timestamp, snapshotUrl: replayUrl(resolved) };
    // Preserve stylesheet order, even when downloads complete out of order.
    let external = 0;
    const selected = document.sheets.filter(s => s.text !== undefined || ++external <= 4);
    const seen = new Set<string>();
    let imports = 0;
    const download = async (href: string): Promise<string[]> => {
      if (seen.has(href) || signal.aborted) return [];
      seen.add(href);
      try {
        const result = await this.request(replayUrl({ timestamp: resolved.timestamp, original: href }), signal, 750_000, 'css', targetYear);
        const imported: string[] = [];
        for (const url of cssImports(result.text, href)) {
          if (imports++ >= 3) break;
          if (seen.has(url)) continue;
          seen.add(url);
          try {
            const nested = await this.request(replayUrl({ timestamp: resolved.timestamp, original: url }), signal, 250_000, 'css', targetYear);
            imported.push(nested.text);
          } catch { /* One missing import does not discard the other sheets. */ }
        }
        return [...imported, result.text];
      } catch { return []; }
    };
    const sheets = await Promise.all(selected.map(s => s.text !== undefined ? Promise.resolve([s.text]) : download(s.href!)));
    if (signal.aborted) return null;
    return analyze(document, sheets.flat(), meta);
  }

  async load(origin: string, year: number, outerSignal?: AbortSignal): Promise<StylePack> {
    if (publicOrigin(origin) !== origin) throw new ArchiveError('Unsupported website', 'missing');
    const controller = new AbortController();
    const abort = () => controller.abort();
    outerSignal?.addEventListener('abort', abort, { once: true });
    if (outerSignal?.aborted) controller.abort();
    const timer = setTimeout(abort, WARM_BUDGET_MS);
    let failed = false;
    try {
      const captures = await this.captures(origin, year, controller.signal);
      for (const capture of captures.slice(0, 2)) {
        if (controller.signal.aborted) break;
        try { const pack = await this.profile(origin, year, capture, controller.signal); if (pack) return pack; }
        catch { failed = true; }
      }
      // An unusable year gets one bounded attempt at the closest older year's capture.
      const olderYear = Number(captures.at(-1)?.timestamp.slice(0, 4) ?? year) - 1;
      if (olderYear >= MIN_YEAR && !controller.signal.aborted) {
        const older = await this.captures(origin, olderYear, controller.signal);
        if (older[0]) {
          try { const pack = await this.profile(origin, year, older[0], controller.signal); if (pack) return pack; }
          catch { failed = true; }
        }
      }
      throw new ArchiveError('No usable historical styling', failed || controller.signal.aborted ? 'unavailable' : 'missing');
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', abort);
      controller.abort();
    }
  }
}
