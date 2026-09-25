import { PAINT_PROPERTIES, normalizedText, linkKey, safePaint, type Box, type Descriptor, type Paint, type Snapshot, type Viewport } from './snapshot';

export type Collected = { snapshot: Snapshot; elements: Element[] };
const round = (value: number) => Math.round(value * 10) / 10;
function contentBox(node: Element, style: CSSStyleDeclaration): Box {
  const b = node.getBoundingClientRect();
  if (node.tagName.toLowerCase() !== 'img') return { x: round(b.x), y: round(b.y), w: round(b.width), h: round(b.height) };
  const top = parseFloat(style.paddingTop) || 0, left = parseFloat(style.paddingLeft) || 0;
  return { x: round(b.x + left), y: round(b.y + top), w: round(b.width - left - (parseFloat(style.paddingRight) || 0)), h: round(b.height - top - (parseFloat(style.paddingBottom) || 0)) };
}
function paint(style: CSSStyleDeclaration): Paint {
  const p: Paint = {};
  for (const key of PAINT_PROPERTIES) {
    const value = style.getPropertyValue(key);
    if (value && safePaint({ [key]: value })) p[key] = value;
  }
  return p;
}

export function collect(document: Document, viewport: Viewport, base: string): Collected {
  const view = document.defaultView!;
  const candidates = Array.from(document.body.querySelectorAll('*')).slice(0, 6000);
  const eligible: Array<{ element: Element; descriptor: Descriptor; box: Box; paint: Paint; rank: number }> = [];
  for (const node of candidates) {
    if (/^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|LINK|META|OPTION|PATH|G|DEFS|CLIPPATH)$/.test(node.tagName.toUpperCase()) || node.closest('svg') && node.tagName.toLowerCase() !== 'svg') continue;
    if (node.id === 'net19-loading-screen') continue;
    const style = view.getComputedStyle(node);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue;
    const box = contentBox(node, style);
    if (box.w <= 0 || box.h <= 0 || box.x + box.w < 0 || box.y + box.h < 0 || box.y > 5000 || box.x >= viewport.width) continue;
    // getBoundingClientRect can be nonzero for descendants of a visibility:hidden ancestor.
    if (node.closest('[hidden],[aria-hidden="true"]') && !node.matches('img,svg')) continue;
    const tag = node.tagName.toLowerCase();
    const type = node.getAttribute('type')?.toLowerCase() ?? '';
    const role = node.getAttribute('role') ?? '';
    const label = normalizedText(node.getAttribute('aria-label') || node.getAttribute('alt') || node.getAttribute('title') ||
      (tag === 'input' ? node.getAttribute('value') ?? '' : (node as HTMLElement).innerText ?? node.textContent ?? ''));
    const directText = Array.from(node.childNodes).some(child => child.nodeType === 3 && child.textContent?.trim());
    let kind: Descriptor['kind'] = tag === 'form' ? 'form' : tag === 'button' || role === 'button' || tag === 'input' && ['submit','button'].includes(type) ? 'button' :
      ['input','textarea','select'].includes(tag) ? 'field' : tag === 'a' && (node.hasAttribute('href') || node.hasAttribute('data-net19-href')) ? 'link' :
      ['img','svg'].includes(tag) || !node.textContent?.trim() && style.backgroundImage.startsWith('url(') ? 'image' : directText ? 'text' : 'box';
    if (kind === 'image' && (box.w > 800 || box.h > 400)) continue;
    const children = Array.from(node.querySelectorAll('a[href],a[data-net19-href],input[name],textarea[name],button,form,img[alt],svg[aria-label]')).slice(0, 12).map(child =>
      child.getAttribute('name') || child.getAttribute('alt') || child.getAttribute('aria-label') ||
      (child.hasAttribute('href') || child.hasAttribute('data-net19-href') ? linkKey(child.getAttribute('href') || child.getAttribute('data-net19-href')!, base) : normalizedText(child.textContent ?? ''))).filter(Boolean);
    if (kind === 'box' && !children.length && style.backgroundImage === 'none' && style.backgroundColor === 'rgba(0, 0, 0, 0)' && parseFloat(style.borderTopWidth) === 0) continue;
    const ancestry: string[] = [];
    for (let parent=node.parentElement, depth=0; parent && depth<2; parent=parent.parentElement,depth++)
      ancestry.push(...Array.from(parent.classList).filter(c=>c.length<=80).slice(0,6));
    const descriptor: Descriptor = { kind, tag, ancestry, id: node.id.slice(0, 80), classes: Array.from(node.classList).filter(c => c.length <= 80).slice(0, 12),
      name: (node.getAttribute('name') ?? '').slice(0, 80), type, label: kind === 'box' || kind === 'form' ? '' : label,
      href: linkKey(node.getAttribute('data-net19-href') || node.getAttribute('href') || node.getAttribute('data-net19-action') || node.getAttribute('action') || '', base), children };
    const rank = kind === 'field' || kind === 'button' || kind === 'form' ? 5 : kind === 'link' || kind === 'image' ? 4 : kind === 'text' ? 3 : 1;
    eligible.push({ element: node, descriptor, box, paint: paint(style), rank });
  }
  const selected = eligible.sort((a, b) => b.rank - a.rank).slice(0, 300);
  // Retain DOM order for ancestry and deterministic matching.
  selected.sort((a, b) => a.element.compareDocumentPosition(b.element) & 4 ? -1 : 1);
  const elements = selected.map(n => n.element);
  const indices = new Map(elements.map((node, i) => [node, i]));
  const styles: Paint[] = [], stylesByKey = new Map<string, number>();
  const nodes = selected.map(node => {
    const key = JSON.stringify(node.paint);
    let style = stylesByKey.get(key);
    if (style === undefined) { style = styles.length; styles.push(node.paint); stylesByKey.set(key, style); }
    let parent = node.element.parentElement;
    while (parent && !indices.has(parent)) parent = parent.parentElement;
    const flow: Paint = {};
    if (['box','form'].includes(node.descriptor.kind)) {
      const computed = view.getComputedStyle(node.element);
      // Preserve flow layouts without fixing current content to archived row heights.
      // Resolved grid tracks become proportions so the live viewport can still shrink.
      if (['grid','flex','block','inline-flex','inline-grid'].includes(computed.display)) {
        flow.display = computed.display;
        for (const key of ['flex-direction','flex-wrap','justify-content','align-items','align-content','grid-auto-flow','column-gap','row-gap','margin-top','margin-bottom'])
          flow[key] = computed.getPropertyValue(key);
        const tracks = computed.gridTemplateColumns.split(' ');
        if (tracks.length <= 8 && tracks.every(track=>/^\d+(?:\.\d+)?px$/.test(track) && parseFloat(track)>0)) {
          const total = tracks.reduce((sum,track)=>sum+parseFloat(track),0);
          flow['grid-template-columns'] = tracks.map(track=>`minmax(0,${(parseFloat(track)/total).toFixed(4)}fr)`).join(' ');
        }
        if (node.box.w >= 200 && node.box.w < viewport.width * .92 && Math.abs(node.box.x - (viewport.width-node.box.w)/2) < 3) {
          flow['max-width'] = `${node.box.w}px`; flow['margin-left'] = flow['margin-right'] = 'auto';
        }
      }
    }
    return { descriptor: node.descriptor, box: node.box, style, flow, parent: parent ? indices.get(parent)! : -1 };
  });
  const pageHeight = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, viewport.height);
  const textSize = selected.filter(n => n.descriptor.kind === 'text').reduce((sum, n) => sum + n.descriptor.label.length, 0);
  const sensitive = !!document.querySelector('input[type="password"],input[autocomplete*="cc-"],form[method="post" i]');
  const snapshot: Snapshot = { version: 1, ...viewport, pageHeight,
    compact: !sensitive && pageHeight <= viewport.height * 1.25 && textSize < 1800 && nodes.length <= 200,
    body: paint(view.getComputedStyle(document.body)), nodes, styles };
  return { snapshot, elements };
}
