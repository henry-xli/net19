import { type ArchivedDocument, sanitizeCSS } from './analyzer';
import { type Snapshot, type Viewport, DEFAULT_VIEWPORT, isSnapshot } from './snapshot';

export type Raster = { id: string; data: string; url?: string };
export type RenderRequest = { document: ArchivedDocument; sheets: string[]; original: string; images: Raster[]; viewport: Viewport };
export type Renderer = (request: RenderRequest) => Promise<Snapshot | null>;
let creating: Promise<void> | undefined;

export const renderSnapshot: Renderer = async request => {
  const url = chrome.runtime.getURL('offscreen.html');
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT' as chrome.runtime.ContextType], documentUrls: [url] });
  if (!contexts.length) {
    creating ??= chrome.offscreen.createDocument({ url: 'offscreen.html', reasons: ['IFRAME_SCRIPTING' as chrome.offscreen.Reason],
      justification: 'Measure sanitized archived layouts and computed styles locally without executing archive scripts or opening a tab.' }).finally(() => { creating = undefined; });
    await creating;
  }
  const images = new Map(request.images.filter(image=>image.url).map(image=>[image.url!,image.id]));
  const css = request.sheets.map(sheet => sanitizeCSS(sheet,false,images,request.original)).join('\n');
  if (css.length > 2_000_000) return null;
  const result = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'RENDER', html: request.document.html,
    css, images: request.images, viewport: request.viewport ?? DEFAULT_VIEWPORT, original: request.original });
  return isSnapshot(result) ? result : null;
};
