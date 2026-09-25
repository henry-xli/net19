import { parse as parseHTML, serialize, type DefaultTreeAdapterMap } from 'parse5';
import { parse, generate, walk, type CssNode, type ListItem, type List } from 'css-tree';
import { publicOrigin, sameSite } from './shared';

type Element = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];
export type ArchivedDocument = { sheets: Array<{ href?: string; text?: string; media?: string; base?: string }>; html: string; title: string;
  images: Array<{ id: string; url: string }> };
const attr = (node: Element, name: string) => node.attrs.find(a => a.name === name)?.value ?? '';
const DROP = new Set(['script','iframe','object','embed','template','noscript','video','audio','source','track','base','link','meta',
  'foreignObject','use','image','animate','animateTransform','set']);

function safeCSSNode(node: CssNode): boolean {
  let safe = true;
  walk(node, part => {
    if (part.type === 'Url' && !/^net19-image:(?:image|css)-\d+$/.test(part.value) || part.type === 'Raw') safe = false;
    if (part.type === 'Function' && /^(?:url|expression|image|image-set|paint|element|attr)$/i.test(part.name)) safe = false;
  });
  return safe;
}

export function sanitizeCSS(css: string, inline = false, images = new Map<string,string>(), base = 'https://invalid.invalid/'): string {
  if (css.length > 750_000) return '';
  try {
    const ast = parse(css, { context: inline ? 'declarationList' : 'stylesheet', parseCustomProperty: true });
    walk(ast,node=>{if(node.type==='Url'){try{const id=images.get(new URL(node.value,base).href);if(id)node.value=`net19-image:${id}`;}catch{/* Invalid URLs are removed below. */}}});
    walk(ast, {
      enter(node: CssNode, item: ListItem<CssNode>, list: List<CssNode>) {
        if (node.type === 'Atrule' && !['media','supports','layer'].includes(node.name.toLowerCase())) { if (item && list) list.remove(item); return walk.skip; }
        if (node.type !== 'Declaration') return;
        const property = node.property.toLowerCase();
        // Archive CSS is used only inside a sandboxed, network-isolated measurement frame.
        // Disable all external resources, generated content and ongoing activity there.
        if (!safeCSSNode(node.value) || /^(?:animation|transition|behavior|-moz-binding|cursor|content|filter|backdrop-filter|list-style-image|mask)/.test(property)) {
          if (item && list) list.remove(item); return;
        }
        if (property === 'font-family') {
          const value = generate(node.value);
          const local = /Georgia/i.test(value) ? 'Georgia,serif' : /Times/i.test(value) ? '"Times New Roman",serif' :
            /Verdana|Tahoma/i.test(value) ? 'Verdana,sans-serif' : /Courier|monospace/i.test(value) ? 'monospace' :
              /serif/i.test(value) && !/sans-serif/i.test(value) ? 'serif' : 'Arial,Helvetica,sans-serif';
          const parsed = parse(local, { context: 'value' });
          if (parsed.type === 'Value') node.value = parsed;
        }
      },
    });
    return generate(ast);
  } catch { return ''; }
}

export function readDocument(html: string, original: string): ArchivedDocument | null {
  if (html.length > 1_500_000) return null;
  const doc = parseHTML(html, { scriptingEnabled: false });
  const sheets: ArchivedDocument['sheets'] = [], images: ArchivedDocument['images'] = [];
  let title = '', textLength = 0, count = 0, base = original;
  const visit = (node: Node): void => {
    if (++count > 30_000) return;
    if ('tagName' in node) {
      const direct = node.childNodes.filter(n => n.nodeName === '#text').map(n => (n as DefaultTreeAdapterMap['textNode']).value).join('');
      if (node.tagName === 'title') title = direct.trim().slice(0, 180);
      if (node.tagName === 'base') { try { const value = new URL(attr(node, 'href'), original); if (sameSite(value.href, original)) base = value.href; } catch { /* Ignore malformed URLs. */ } }
      const media = attr(node, 'media');
      if (node.tagName === 'style' && sheets.length < 64) sheets.push({ text: absoluteCSS(direct,base), media, base });
      if (node.tagName === 'link' && /(^|\s)stylesheet(\s|$)/i.test(attr(node, 'rel')) && !/alternate/i.test(attr(node, 'rel')) && sheets.length < 64) {
        try { const url = new URL(attr(node, 'href'), base); if (publicOrigin(url.href)) sheets.push({ href: url.href, media }); } catch { /* Ignore malformed URLs. */ }
      }
      if (DROP.has(node.tagName) || node.tagName === 'style') return;
      if (node.tagName === 'img' && images.length < 3) {
        // Bounded branding candidates, not a general archive asset loader. Raster bytes
        // are decoded and re-encoded by Chrome before any can appear on a live page.
        const source = attr(node, 'src');
        const hint = `${attr(node, 'alt')} ${attr(node, 'id')} ${source}`;
        if (/logo|brand|masthead/i.test(hint) && !/avatar|profile|user/i.test(hint)) {
          try { const url = new URL(source, base); if (publicOrigin(url.href)) {
            const id = `image-${images.length}`; images.push({ id, url: url.href }); node.attrs.push({ name: 'data-net19-image', value: id });
          } } catch { /* Keep current images if unavailable. */ }
        }
      }
      if (!['head','title'].includes(node.tagName)) textLength += direct.trim().length;
      const cleaned = [];
      for (const a of node.attrs) {
        if (a.name === 'style') { cleaned.push({ ...a, value: sanitizeCSS(a.value, true) }); continue; }
        if (['href','action'].includes(a.name)) {
          cleaned.push({ name: `data-net19-${a.name}`, value: a.value });
          // Keep inert link attributes for :link and attribute-selector fidelity. The
          // measurement frame cannot run scripts/forms or navigate its parent.
          if(a.name==='href'&&node.tagName==='a'){try{if(publicOrigin(new URL(a.value,base).href))cleaned.push(a);}catch{/* Invalid links remain non-interactive metadata. */}}
          continue;
        }
        if (/^(?:id|class|name|type|role|alt|title|width|height|viewBox|viewbox|d|fill|stroke|stroke-width|cx|cy|r|rx|ry|x|y|x1|x2|y1|y2|points|transform|method|dir|lang|value|checked|selected|disabled|hidden|bgcolor|text|color|face|size|align|valign|border|cellspacing|cellpadding|colspan|rowspan|jsname|aria-[\w-]+|data-[\w-]+)$/.test(a.name) && !/[<>]|url\s*\(/i.test(a.value)) cleaned.push(a);
      }
      node.attrs = cleaned;
    }
    if ('childNodes' in node) {
      const keep: Node[] = [];
      for (const child of node.childNodes) {
        visit(child);
        if (!('tagName' in child) || !DROP.has(child.tagName) && child.tagName !== 'style') keep.push(child);
      }
      node.childNodes = keep as typeof node.childNodes;
    }
  };
  visit(doc);
  if (count > 30_000 || textLength < 20 || /^(?:just a moment|access denied|robot check|wayback machine|404|403|error|page not found)/i.test(title)) return null;
  return { sheets, html: serialize(doc), title, images };
}

export function cssImports(css: string, base: string): Array<{ url: string; media: string }> {
  const urls: Array<{ url: string; media: string }> = [];
  try {
    const ast = parse(css); if (ast.type !== 'StyleSheet') return [];
    ast.children.forEach(node => {
      if (node.type !== 'Atrule' || node.name.toLowerCase() !== 'import' || node.prelude?.type !== 'AtrulePrelude' || urls.length >= 3) return;
      const parts = node.prelude.children.toArray();
      const first = parts.shift();
      if (first?.type !== 'Url' && first?.type !== 'String') return;
      // Unknown layer/supports import conditions are skipped instead of becoming
      // unconditional CSS. Media conditions are preserved through flattening.
      if (parts.some(part => part.type === 'Function' || part.type === 'Identifier' && part.name === 'layer')) return;
      try {
        const url = new URL(first.value, base);
        if (publicOrigin(url.href)) urls.push({ url: url.href, media: parts.map(part => generate(part)).join(' ') });
      } catch { /* Skip malformed imports. */ }
    });
  } catch { /* Broken archive CSS is a missing resource, not executable code. */ }
  return urls;
}

export function cssImageURLs(sheets: string[], base: string): string[] {
  const urls = new Set<string>();
  for (const css of sheets) {
    try { walk(parse(css),node=>{
      if(node.type!=='Url'||urls.size>=3)return;
      const url=new URL(node.value,base);
      if(publicOrigin(url.href)&&/\.png$/i.test(url.pathname))urls.add(url.href);
    }); } catch { /* Malformed assets do not prevent measuring the remaining CSS. */ }
  }
  return [...urls];
}

export function absoluteCSS(css: string, base: string): string {
  try {const ast=parse(css);walk(ast,node=>{if(node.type==='Url'){try{const url=new URL(node.value,base);if(publicOrigin(url.href))node.value=url.href;}catch{/* Keep malformed URLs for the sanitizer to reject. */}}});return generate(ast);}
  catch{return css;}
}
