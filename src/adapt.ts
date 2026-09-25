import { collect } from './collect';
import { matchSnapshots } from './matcher';
import { type Paint, type Snapshot, type Box } from './snapshot';
import { applyTheme, background, darkPage, deriveTheme, ratio, themeStrength } from './theme';

export type Adaptation = { css: string; matched: number; coverage: number; mode: 'layout'|'styles'|'theme'; cleanup: () => void; check: () => boolean;
  extend?: () => void };  // theme mode: give roles to elements added after the reveal
const number = (value: number) => Math.round(value * 10) / 10;
function declarations(paint: Paint): string { return Object.entries(paint).map(([p, v]) => `${p}:${v} !important`).join(';'); }
function horizontal(box: Box, parent: Box): string {
  const left = box.x - parent.x, right = parent.w - left - box.w;
  if (box.w > parent.w * .88) return `left:${number(left)}px;right:${number(right)}px;width:auto`;
  if (left < 45) return `left:${number(left)}px;width:${number(box.w)}px`;
  if (right < 45) return `right:${number(right)}px;width:${number(box.w)}px`;
  return `left:calc(50% + ${number(left - parent.w / 2)}px);width:${number(box.w)}px`;
}

export async function adapt(snapshot: Snapshot, session: string, signal: AbortSignal): Promise<Adaptation | null> {
  const live = collect(document, { width: innerWidth, height: innerHeight }, location.href);
  const result = matchSnapshots(snapshot, live.snapshot);
  const modal = Array.from(document.querySelectorAll('[role="dialog"],dialog[open]')).some(e => e.getBoundingClientRect().height > 0);
  const sensitive = document.querySelector('input[type="password"],input[autocomplete*="cc-"],form[method="post" i]');
  const prefix = `html[data-net19-styled][data-net19-session="${session}"]`;
  // A few coincidentally shared colors/links cannot qualify a page for a historical layout.
  // Pages whose DOM no longer corresponds to the capture get the role-based theme instead.
  if (result.matches.length < 5 || result.coverage < .68 || result.liveCoverage < .48 || modal || sensitive) return themed(snapshot, session, prefix, signal);
  const compact = snapshot.compact && live.snapshot.compact && innerWidth >= 768;
  const rules: string[] = ['/* net19 generated */'];
  const attributes: Array<[Element,string,string|null]> = [], additions: Element[] = [];
  let disposed = false;
  const mark = (node: Element, name: string, value = '') => { attributes.push([node,name,node.getAttribute(name)]); node.setAttribute(name,value); };
  const cleanup = () => {
    if (disposed) return; disposed = true;
    for (const node of additions) node.remove();
    for (const [node,key,old] of attributes.reverse()) { if (old === null) node.removeAttribute(key); else node.setAttribute(key,old); }
  };
  signal.addEventListener('abort', cleanup, { once: true });
  try {
    const mapped = new Map<Element, { source: number; target: Element; index: number }>();
    for (const [index, match] of result.matches.entries()) {
      const source = snapshot.nodes[match.archived];
      const element = live.elements[match.live];
      let target = element;
      if (source.image && source.descriptor.kind === 'image') {
        const data = source.image.slice(source.image.indexOf(',') + 1);
        const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
        if (signal.aborted) { bitmap.close(); cleanup(); return null; }
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height; canvas.hidden = true;
        canvas.getContext('2d')!.drawImage(bitmap,0,0); bitmap.close();
        canvas.setAttribute('role','img'); canvas.setAttribute('aria-label', source.descriptor.label || '');
        element.after(canvas); additions.push(canvas); target = canvas; mark(element,'data-net19-replaced');
      }
      if (signal.aborted) { cleanup(); return null; }
      mark(target,'data-net19-node',String(index));
      mapped.set(element, { source: match.archived, target, index });
      if (source.background && !target.matches('input,textarea,select,img,canvas,svg')) {
        const bytes=Uint8Array.from(atob(source.background.split(',')[1]),c=>c.charCodeAt(0));
        const bitmap=await createImageBitmap(new Blob([bytes],{type:'image/png'}));
        if(signal.aborted){bitmap.close();cleanup();return null;}
        const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.hidden=true;
        canvas.getContext('2d')!.drawImage(bitmap,0,0);bitmap.close();canvas.setAttribute('data-net19-layer','');canvas.setAttribute('aria-hidden','true');
        target.prepend(canvas);additions.push(canvas);mark(target,'data-net19-background');if(source.icon)mark(target,'data-net19-icon');
      }
    }
    if (compact) for (const [sourceIndex, source] of snapshot.nodes.entries()) {
      if (!source.image || source.descriptor.kind !== 'image' || [...mapped.values()].some(m => m.source === sourceIndex)) continue;
      let parentIndex = source.parent;
      while (parentIndex >= 0 && ![...mapped.values()].some(m => m.source === parentIndex)) {
        if (['button','link','field'].includes(snapshot.nodes[parentIndex].descriptor.kind)) { parentIndex = -1; break; }
        parentIndex = snapshot.nodes[parentIndex].parent;
      }
      const parent = [...mapped].find(([, m]) => m.source === parentIndex)?.[0];
      if (!parent || ['button','link','field'].includes(snapshot.nodes[parentIndex].descriptor.kind)) continue;
      const bytes = Uint8Array.from(atob(source.image.split(',')[1]),c=>c.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes],{type:'image/png'}));
      if (signal.aborted) { bitmap.close(); cleanup(); return null; }
      const canvas = document.createElement('canvas'); canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.hidden=true;
      canvas.getContext('2d')!.drawImage(bitmap,0,0);bitmap.close();canvas.setAttribute('aria-hidden','true');
      const index=mapped.size;mark(canvas,'data-net19-node',String(index));parent.append(canvas);additions.push(canvas);
      mapped.set(canvas,{source:sourceIndex,target:canvas,index});
    }
    mark(document.documentElement,'data-net19-session',session);
    const body = { ...snapshot.body };
    if (body['background-color'] === 'rgba(0, 0, 0, 0)') body['background-color'] = 'rgb(255, 255, 255)';
    rules.push(`${prefix} body{${declarations(body)}${compact ? ';position:relative !important;display:block !important;margin:0 !important;padding:0 !important;min-height:100vh !important;height:auto !important' : ''}}`);
    rules.push(`${prefix} [data-net19-replaced]{display:none !important}`);
    rules.push(`${prefix} [data-net19-background]{isolation:isolate !important}`);
    rules.push(`${prefix} [data-net19-layer]{display:block !important;position:absolute !important;inset:0 !important;width:100% !important;height:100% !important;pointer-events:none !important;z-index:-1 !important}`);
    rules.push(`${prefix} [data-net19-icon] > :not([data-net19-layer]){visibility:hidden !important}`);
    const retained = new Set<Element>();
    const atomic = new Set([...mapped].filter(([, m]) => !['box','form'].includes(snapshot.nodes[m.source].descriptor.kind)).map(([element]) => element));
    const withinAtomic = (node: Element): boolean => { for (let parent = node.parentElement; parent && parent !== document.body; parent = parent.parentElement) if (atomic.has(parent)) return true; return false; };
    if (compact) {
      for (const element of mapped.keys()) for (let parent: Element | null = element; parent && parent !== document.body; parent = parent.parentElement) retained.add(parent);
      for (const element of retained) if (!mapped.has(element) && element.tagName !== 'SVG' && !withinAtomic(element)) mark(element,'data-net19-contents');
      // Remove only unmatched branches of a highly matched compact interface. Elements stay
      // in the DOM with their original event handlers, form semantics and current values.
      for (const parent of [document.body, ...retained]) for (const child of Array.from(parent.children)) {
        if (atomic.has(parent) || withinAtomic(parent)) continue;
        if (retained.has(child) || additions.includes(child) || child.id === 'net19-loading-screen' || child.matches('script,style,link,meta') ||
            child.matches('input[type="hidden"],[role="listbox"],[role="option"],[aria-live],dialog') || child.querySelector('[role="listbox"],[role="option"],[aria-live],dialog')) continue;
        if (getComputedStyle(child).display !== 'none' && child.getBoundingClientRect().height > 0) mark(child,'data-net19-extra');
      }
      rules.push(`${prefix} [data-net19-contents]{display:contents !important}`);
      rules.push(`${prefix} [data-net19-extra]{display:none !important}`);
    }
    // Unmatched parts of a partially corresponding page still receive the era's theme.
    const base = compact || darkPage() ? null : applyTheme(deriveTheme(snapshot), prefix, mark, new Set(mapped.keys()));
    if (base) rules.push(...base.rules.filter(rule => !rule.startsWith(`${prefix} body{`)));
    const checked: Element[] = [];
    for (const [element, mapping] of mapped) {
      const node = snapshot.nodes[mapping.source], paint = { ...snapshot.styles[node.style] };
      if (!compact && innerWidth >= 768 && node.flow) Object.assign(paint, node.flow);
      let extra = '';
      if (compact) {
        let parent = element.parentElement;
        while (parent && !mapped.has(parent)) parent = parent.parentElement;
        const parentNode = parent ? snapshot.nodes[mapped.get(parent)!.source] : null;
        const base: Box = parentNode ? { ...parentNode.box } : { x: 0,y: 0,w: snapshot.width,h: snapshot.height };
        if (parentNode) {
          const border = snapshot.styles[parentNode.style];
          const left = parseFloat(border['border-left-width']) || 0, top = parseFloat(border['border-top-width']) || 0;
          base.x += left; base.y += top; base.w -= left + (parseFloat(border['border-right-width']) || 0); base.h -= top + (parseFloat(border['border-bottom-width']) || 0);
        }
        const top = node.box.y - base.y;
        const vertical = base.h>=snapshot.height*.9 && node.box.y > snapshot.height - 100 ? `bottom:${number(base.y + base.h - node.box.y - node.box.h)}px;top:auto` : `top:${number(top)}px;bottom:auto`;
        extra = `position:absolute;${horizontal(node.box,base)};${vertical};height:${number(node.box.h)}px;min-height:0;min-width:0;max-width:none;max-height:none;box-sizing:border-box;margin:0;padding:0;transform:none;flex:none;float:none;display:block;opacity:1;visibility:visible;overflow:visible;contain:none;clip:auto;clip-path:none`;
        if(node.box.h>=snapshot.height*.95&&node.box.w>=snapshot.width*.9)extra+=';height:100vh';
        if(paint.opacity)extra+=`;opacity:${paint.opacity}`;
        if (atomic.has(element) && node.descriptor.kind !== 'image') extra += ';' + ['padding-top','padding-right','padding-bottom','padding-left'].map(p=>`${p}:${paint[p] || '0px'}`).join(';');
        if (node.descriptor.kind === 'field') extra += ';resize:none;outline:none';
      } else if (mapping.target.tagName === 'CANVAS') extra = `width:${number(node.box.w)}px;height:${number(node.box.h)}px;display:block`;
      rules.push(`${prefix} [data-net19-node="${mapping.index}"]{${declarations(paint)}${extra ? ';' + extra.split(';').map(d => `${d} !important`).join(';') : ''}}`);
      if (atomic.has(element) && node.descriptor.kind !== 'image') rules.push(`${prefix} [data-net19-node="${mapping.index}"] :where(span,b,strong,em,i,div){color:inherit !important;font-family:inherit !important;font-size:inherit !important;font-weight:inherit !important;line-height:inherit !important}`);
      if (['field','button','text','link'].includes(node.descriptor.kind)) checked.push(mapping.target);
    }
    // The source page's hidden autocomplete panels remain controlled by the live app.
    // Give revealed panels a coherent foreground/background without changing their visibility.
    rules.push(`${prefix} [role="listbox"]{background-color:${body['background-color']} !important;color:${body.color} !important}`);
    rules.push(`${prefix} [role="option"]{color:${body.color} !important}`);
    return { css: rules.join('\n'), cleanup, matched: result.matches.length, coverage: result.coverage, mode: compact ? 'layout' : 'styles',
      check: () => (base ? base.verify() : true) && checked.map(element => {
        const box = element.getBoundingClientRect(), style = getComputedStyle(element);
        // Essential matched controls/text must remain present, within the document and legible.
        const valid = box.width > 0 && box.height > 0 && box.right > 0 && box.left < innerWidth && style.visibility !== 'hidden' &&
          (element.matches(':disabled,[aria-disabled="true"]') || ratio(style.color,background(element)) >= 3);
        return valid;
      }).every(Boolean) };
  } catch { cleanup(); return null; }
}

export function themed(snapshot: Snapshot, session: string, prefix: string, signal: AbortSignal): Adaptation | null {
  const theme = deriveTheme(snapshot);
  if (themeStrength(theme) < 2 || signal.aborted || darkPage()) return null;
  const attributes: Array<[Element,string,string|null]> = [];
  let disposed = false;
  const mark = (node: Element, name: string, value = '') => { attributes.push([node,name,node.getAttribute(name)]); node.setAttribute(name,value); };
  const cleanup = () => {
    if (disposed) return; disposed = true;
    for (const [node,key,old] of attributes.reverse()) { if (old === null) node.removeAttribute(key); else node.setAttribute(key,old); }
  };
  signal.addEventListener('abort', cleanup, { once: true });
  try {
    mark(document.documentElement, 'data-net19-session', session);
    const applied = applyTheme(theme, prefix, mark);
    if (!applied.marked.length) { cleanup(); return null; }
    const extend = () => { if (!disposed && !signal.aborted) applyTheme(theme, prefix, mark).verify(); };
    return { css: ['/* net19 generated */', ...applied.rules].join('\n'), cleanup, matched: 0, coverage: 0, mode: 'theme', check: applied.verify, extend };
  } catch { cleanup(); return null; }
}
