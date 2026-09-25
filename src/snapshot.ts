// Data shared by the inert archive renderer and the live structural matcher.
// Stored snapshots contain computed values and descriptors, never executable HTML/CSS.
export const PAINT_PROPERTIES = ['color','background-color','background-image','font-family','font-size','font-weight','font-style','line-height',
  'letter-spacing','text-align','text-transform','text-decoration-line','text-decoration-color','white-space',
  'padding-top','padding-right','padding-bottom','padding-left',
  'border-top-width','border-right-width','border-bottom-width','border-left-width',
  'border-top-style','border-right-style','border-bottom-style','border-left-style',
  'border-top-color','border-right-color','border-bottom-color','border-left-color',
  'border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius',
  'box-shadow','fill','stroke','object-fit','opacity'] as const;
export type Paint = Record<string, string>;
const FLOW_PROPERTIES = ['display','flex-direction','flex-wrap','justify-content','align-items','align-content',
  'grid-template-columns','grid-auto-flow','column-gap','row-gap','max-width','margin-left','margin-right','margin-top','margin-bottom'] as const;
export function safeFlow(flow: unknown): flow is Paint {
  return !!flow && typeof flow === 'object' && Object.entries(flow).length <= FLOW_PROPERTIES.length &&
    Object.entries(flow).every(([key,value])=>FLOW_PROPERTIES.includes(key as typeof FLOW_PROPERTIES[number]) &&
      typeof value === 'string' && value.length <= 240 && !/[;{}<>\\]|url\s*\(|expression|@/i.test(value));
}
export type Box = { x: number; y: number; w: number; h: number };
export type Descriptor = { kind: 'box'|'text'|'link'|'button'|'field'|'image'|'form'; tag: string; id: string; classes: string[];
  name: string; type: string; label: string; href: string; children: string[]; ancestry?: string[] };
export type SnapshotNode = { descriptor: Descriptor; box: Box; style: number; parent: number; flow?: Paint; image?: string; background?: string; icon?: boolean };
export type Snapshot = { version: 1; width: number; height: number; pageHeight: number; compact: boolean; body: Paint; nodes: SnapshotNode[]; styles: Paint[] };
export type Viewport = { width: number; height: number };
export const DEFAULT_VIEWPORT: Viewport = { width: 1280, height: 800 };

export function safePaint(paint: unknown): paint is Paint {
  return !!paint && typeof paint === 'object' && Object.entries(paint).length <= PAINT_PROPERTIES.length &&
    Object.entries(paint).every(([key, value]) => PAINT_PROPERTIES.includes(key as typeof PAINT_PROPERTIES[number]) &&
      typeof value === 'string' && value.length <= 240 && !/[;{}<>\\]|url\s*\(|expression|@/i.test(value));
}

export function isSnapshot(data: unknown): data is Snapshot {
  if (!data || typeof data !== 'object') return false;
  const s = data as Snapshot;
  return s.version === 1 && s.width >= 320 && s.width <= 2560 && s.height >= 400 && s.height <= 1600 &&
    s.pageHeight > 0 && s.pageHeight <= 100_000 && safePaint(s.body) && Array.isArray(s.styles) && s.styles.length <= 300 && s.styles.every(safePaint) &&
    Array.isArray(s.nodes) && s.nodes.length >= 3 && s.nodes.length <= 300 && s.nodes.every(n =>
      n && n.box && Object.values(n.box).every(v => Number.isFinite(v) && Math.abs(v) < 100_000) && n.box.w > 0 && n.box.h > 0 &&
      Number.isInteger(n.style) && n.style >= 0 && n.style < s.styles.length && Number.isInteger(n.parent) && n.parent >= -1 && n.parent < s.nodes.length &&
      n.descriptor && ['box','text','link','button','field','image','form'].includes(n.descriptor.kind) &&
      ['tag','id','name','type','label','href'].every(key => typeof n.descriptor[key as keyof Descriptor] === 'string' && (n.descriptor[key as keyof Descriptor] as string).length <= 240) &&
      Array.isArray(n.descriptor.classes) && n.descriptor.classes.length <= 12 && n.descriptor.classes.every(c => typeof c === 'string' && c.length <= 80) &&
      Array.isArray(n.descriptor.children) && n.descriptor.children.length <= 12 && n.descriptor.children.every(c => typeof c === 'string' && c.length <= 240) &&
      (n.descriptor.ancestry === undefined || Array.isArray(n.descriptor.ancestry) && n.descriptor.ancestry.length <= 12 && n.descriptor.ancestry.every(c=>typeof c==='string' && c.length <= 80)) &&
      (n.flow === undefined || safeFlow(n.flow)) && (n.icon === undefined || typeof n.icon === 'boolean') &&
      [n.image,n.background].every(image=>image===undefined||typeof image==='string'&&/^data:image\/png;base64,[a-zA-Z0-9+/=]+$/.test(image)&&image.length<=50_000));
}

export async function encodeSnapshot(snapshot: Snapshot): Promise<string> {
  if (!isSnapshot(snapshot)) throw new Error('Invalid rendered snapshot');
  const stream = new Blob([JSON.stringify(snapshot)]).stream().pipeThrough(new CompressionStream('gzip'));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export async function decodeSnapshot(encoded: string): Promise<Snapshot> {
  if (encoded.length > 90_000 || !/^[A-Za-z0-9+/=]+$/.test(encoded)) throw new Error('Invalid stored snapshot');
  const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
  const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length;
      if (size > 1_000_000) { await reader.cancel(); throw new Error('Stored snapshot exceeds decoding budget'); } chunks.push(value); }
  } finally { reader.releaseLock(); }
  const all = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { all.set(chunk, offset); offset += chunk.length; }
  const snapshot: unknown = JSON.parse(new TextDecoder().decode(all));
  if (!isSnapshot(snapshot)) throw new Error('Invalid stored snapshot');
  return snapshot;
}

export function normalizedText(value: string): string { return value.toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 160); }

export function linkKey(value: string, base: string): string {
  try { const url = new URL(value, base); return ['http:', 'https:'].includes(url.protocol) ?
    (url.hostname.replace(/^www\./, '') + url.pathname).replace(/\/$/, '').slice(0, 240) : ''; } catch { return ''; }
}
