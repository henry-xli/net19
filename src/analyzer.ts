import { parse as parseHTML, type DefaultTreeAdapterMap } from 'parse5';
import { parse, generate, walk, lexer, type CssNode, type Declaration, type Rule } from 'css-tree';
import { SCHEMA, sameSite, publicOrigin, type StylePack } from './shared';

type Element = DefaultTreeAdapterMap['element'];
type Node = DefaultTreeAdapterMap['node'];
type Group = 'body' | 'heading' | 'link' | 'button' | 'surface';
type Paint = Record<string, string>;

export type ArchivedDocument = {
  sheets: Array<{ href?: string; text?: string }>;
  hints: Map<string, Group>;
  bodyStyle: string;
  title: string;
};

function attr(node: Element, name: string): string {
  return node.attrs.find(a => a.name === name)?.value ?? '';
}

export function readDocument(html: string, original: string): ArchivedDocument | null {
  const doc = parseHTML(html, { scriptingEnabled: false });
  const sheets: ArchivedDocument['sheets'] = [];
  const hints = new Map<string, Group>();
  let bodyStyle = '', title = '', textLength = 0, count = 0, base = original;
  const stack: Node[] = [doc];
  while (stack.length && count++ < 30_000) {
    const node = stack.pop()!;
    if ('tagName' in node) {
      if (['script', 'iframe', 'object', 'template', 'noscript', 'svg'].includes(node.tagName)) continue;
      const text = ('childNodes' in node ? node.childNodes : [])
        .filter(n => n.nodeName === '#text').map(n => (n as DefaultTreeAdapterMap['textNode']).value).join('');
      if (node.tagName === 'title') title = text.slice(0, 180);
      if (node.tagName === 'base') {
        try { const u = new URL(attr(node, 'href'), original); if (sameSite(u.href, original)) base = u.href; } catch { /* Ignore malformed base. */ }
      }
      const media = attr(node, 'media').trim().toLowerCase();
      // Print/mobile/conditional themes must not override the base desktop theme.
      const screen = !media || media === 'all' || media === 'screen';
      if (node.tagName === 'style' && screen && sheets.length < 12) sheets.push({ text: text.slice(0, 300_000) });
      if (node.tagName === 'link' && screen && /(^|\s)stylesheet(\s|$)/i.test(attr(node, 'rel')) &&
          !/alternate/i.test(attr(node, 'rel')) && !node.attrs.some(a => a.name === 'disabled') && sheets.length < 12) {
        try {
          const u = new URL(attr(node, 'href'), base);
          if (publicOrigin(u.href)) sheets.push({ href: u.href });
        } catch { /* Bad archived URLs are not fatal. */ }
      }
      const group: Group | undefined = node.tagName === 'body' ? 'body' :
        /^h[1-6]$/.test(node.tagName) ? 'heading' : node.tagName === 'a' ? 'link' :
          node.tagName === 'button' ? 'button' : ['header', 'nav'].includes(node.tagName) ? 'surface' : undefined;
      if (group && hints.size < 100) {
        for (const token of attr(node, 'class').split(/\s+/)) if (/^[a-z][\w-]{1,50}$/i.test(token)) hints.set(`.${token}`, group);
        const id = attr(node, 'id');
        if (/^[a-z][\w-]{1,50}$/i.test(id)) hints.set(`#${id}`, group);
      }
      if (node.tagName === 'body') {
        bodyStyle = attr(node, 'style').slice(0, 2000);
        for (const [htmlAttr, property] of [['bgcolor', 'background-color'], ['text', 'color']] as const) {
          const value = attr(node, htmlAttr);
          if (/^#[\da-f]{3,6}$/i.test(value)) bodyStyle = `${property}:${value};${bodyStyle}`;
        }
      }
      if (!['style', 'title', 'head'].includes(node.tagName)) textLength += text.trim().length;
      if (node.tagName === 'style') continue;
    }
    if ('childNodes' in node) for (let i = node.childNodes.length - 1; i >= 0; i--) stack.push(node.childNodes[i]);
  }
  if (textLength < 20 || /^(?:just a moment|access denied|robot check|wayback machine|404|403|error|page not found)/i.test(title.trim())) return null;
  return { sheets, hints, bodyStyle, title };
}

const LOCAL_FONTS: Array<[RegExp, string]> = [
  [/\bgeorgia\b/i, 'Georgia, "Times New Roman", serif'],
  [/\b(times|times new roman)\b/i, '"Times New Roman", Times, serif'],
  [/\b(verdana|tahoma)\b/i, 'Verdana, Geneva, sans-serif'],
  [/\btrebuchet\b/i, '"Trebuchet MS", Arial, sans-serif'],
  [/\b(courier|monaco|consolas|monospace)\b/i, '"Courier New", Courier, monospace'],
  [/\b(arial|helvetica|sans-serif|roboto|open sans|lato|system-ui)\b/i, 'Arial, Helvetica, sans-serif'],
  [/\bserif\b/i, 'Georgia, "Times New Roman", serif'],
];

export function safeValue(property: string, input: string): string | null {
  const value = input.trim();
  if (!value || value.length > 180 || /[\\{};<>!@]|url\s*\(|expression|var\s*\(|attr\s*\(|image|gradient/i.test(value)) return null;
  if (property === 'font-family') return LOCAL_FONTS.find(([pattern]) => pattern.test(value))?.[1] ?? null;
  // An AST allowlist also catches encoded URLs and unusual CSS functions.
  try {
    const ast = parse(value, { context: 'value' });
    let valid = true;
    walk(ast, node => {
      if (['Url', 'Raw', 'Atrule'].includes(node.type) ||
          (node.type === 'Function' && !['rgb', 'rgba', 'hsl', 'hsla'].includes(node.name.toLowerCase()))) valid = false;
    });
    if (!valid || lexer.matchProperty(property, ast).error) return null;
  } catch { return null; }
  if (property.includes('color')) {
    if (/transparent|currentcolor|inherit|initial|unset|revert/i.test(value)) return null;
    // Translucent historic colors depend on backgrounds we cannot reproduce.
    if (/rgba|hsla|\//i.test(value) || /^#[\da-f]{4}$|^#[\da-f]{8}$/i.test(value)) return null;
  }
  if (property === 'font-size') {
    const keywords: Record<string, string> = { 'xx-small': '12px', 'x-small': '12px', small: '13px', medium: '16px', large: '18px', 'x-large': '24px', 'xx-large': '24px' };
    if (keywords[value]) return keywords[value];
    const m = value.match(/^(\d+(?:\.\d+)?)(px|pt|rem|em|%)$/);
    if (!m) return null;
    const px = Number(m[1]) * ({ px: 1, pt: 4 / 3, rem: 16, em: 16, '%': 0.16 }[m[2]] ?? 1);
    if (px < 12 || px > 24) return null;
    return `${Math.round(px * 100) / 100}px`;
  }
  if (property === 'line-height' && (!/^(1(?:\.\d+)?|2(?:\.0+)?|normal)$/.test(value))) return null;
  if (property === 'border-radius' && !/^(?:[0-9]|1[0-6])(?:px)?$/.test(value)) return null;
  if (property === 'font-weight' && !/^(?:normal|bold|[1-9]00)$/.test(value)) return null;
  return value;
}

function resolveVariables(input: string, vars: Map<string, string>): string {
  let value = input;
  for (let depth = 0; depth < 5 && value.includes('var('); depth++) {
    value = value.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]+))?\)/g, (_all, key, fallback) => vars.get(key) ?? fallback ?? '');
  }
  return value;
}

function groupFor(selector: string, hints: Map<string, Group>): Group | null {
  // Never import arbitrary archived selectors, pseudo-elements, state changes, or layout.
  if (/^(?:html|body|:root)(?:[.#][\w-]+)?$/.test(selector)) return 'body';
  if (/^h[1-6]$/.test(selector)) return 'heading';
  if (/^a(?::link)?$/.test(selector)) return 'link';
  if (/^(button|\.btn|\.button)$/.test(selector)) return 'button';
  if (/^(header|nav)$/.test(selector)) return 'surface';
  if (/^[.#][\w-]+$/.test(selector)) return hints.get(selector) ?? null;
  return null;
}

// Extract complete rules only; conditional media, keyframes and imports are handled separately.
function topRules(css: string): Rule[] {
  try {
    const ast = parse(css, { parseCustomProperty: true });
    if (ast.type !== 'StyleSheet') return [];
    const rules: Rule[] = [];
    ast.children.forEach(node => { if (node.type === 'Rule') rules.push(node); });
    return rules;
  } catch { return []; }
}

export function cssImports(css: string, base: string): string[] {
  const urls: string[] = [];
  try {
    const ast = parse(css);
    if (ast.type !== 'StyleSheet') return [];
    ast.children.forEach(node => {
      if (node.type !== 'Atrule' || node.name.toLowerCase() !== 'import' || !node.prelude || urls.length >= 2) return;
      const candidates: string[] = [];
      walk(node.prelude, child => { if (child.type === 'Url' || child.type === 'String') candidates.push(child.value); });
      // Imported print and conditional rules do not describe the base theme.
      const raw = generate(node.prelude);
      if (/\b(print|supports|layer)\b|\)\s+[^;]+|"\s+(?!screen$|all$)/i.test(raw)) return;
      if (candidates[0]) {
        try { const url = new URL(candidates[0], base); if (publicOrigin(url.href)) urls.push(url.href); } catch { /* Skip. */ }
      }
    });
  } catch { /* A broken sheet is not executable and can be skipped. */ }
  return urls;
}

function declarations(nodes: Iterable<CssNode>, vars: Map<string, string>): Paint {
  const paint: Paint = {};
  const accept = (property: string, value: string) => {
    const safe = safeValue(property, resolveVariables(value, vars));
    if (safe) paint[property] = safe;
  };
  for (const node of nodes) {
    if (node.type !== 'Declaration') continue;
    const prop = node.property.toLowerCase();
    const value = generate(node.value);
    if (['color', 'background-color', 'font-family', 'font-size', 'font-weight', 'line-height', 'border-radius'].includes(prop)) accept(prop, value);
    if (prop === 'background') accept('background-color', value);
    if (prop === 'font') {
      const m = value.match(/(\d+(?:\.\d+)?(?:px|pt|em|rem|%)|xx-small|x-small|small|medium|large|x-large|xx-large)(?:\/([^\s]+))?\s+(.+)$/i);
      if (m) { accept('font-size', m[1]); accept('font-family', m[3]); if (m[2]) accept('line-height', m[2]); }
    }
  }
  return paint;
}

function rgb(input: string): number[] | null {
  const names: Record<string, string> = { white: '#ffffff', black: '#000000', navy: '#000080', blue: '#0000ff', red: '#ff0000', gray: '#808080', silver: '#c0c0c0', green: '#008000', yellow: '#ffff00', ivory: '#fffff0' };
  const c = names[input.toLowerCase()] ?? input;
  if (/^#[\da-f]{3}$/i.test(c)) return [...c.slice(1)].map(n => parseInt(n + n, 16));
  if (/^#[\da-f]{6}$/i.test(c)) return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
  const m = c.match(/^rgb\(\s*(\d+)\s*[, ]\s*(\d+)\s*[, ]\s*(\d+)\s*\)$/i);
  return m ? m.slice(1).map(Number) : null;
}

function contrast(a: string, b: string): number | null {
  const aa = rgb(a), bb = rgb(b);
  if (!aa || !bb) return null;
  const lum = (color: number[]) => color.map(v => v / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
  const x = lum(aa), y = lum(bb);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function rule(selector: string, paint: Paint): string {
  const declarations = Object.entries(paint).map(([key, value]) => `${key}:${value} !important`).join(';');
  return declarations ? `${selector}{${declarations}}` : '';
}

export function analyze(
  document: ArchivedDocument,
  sheets: string[],
  meta: { origin: string; targetYear: number; capturedAt: string; snapshotUrl: string },
): StylePack | null {
  const vars = new Map<string, string>();
  const rules = sheets.flatMap(topRules).slice(0, 20_000);
  for (const r of rules) {
    if (!r.prelude || !/^(?:html|body|:root)$/.test(generate(r.prelude))) continue;
    r.block.children.forEach(node => {
      if (node.type === 'Declaration' && node.property.startsWith('--') && vars.size < 100) vars.set(node.property, generate(node.value));
    });
  }
  const groups: Record<Group, Paint> = { body: {}, heading: {}, link: {}, button: {}, surface: {} };
  let matched = 0;
  for (const r of rules) {
    if (!r.prelude) continue;
    const paint = declarations(r.block.children.toArray(), vars);
    if (!Object.keys(paint).length) continue;
    for (const selector of generate(r.prelude).split(',')) {
      const group = groupFor(selector.trim(), document.hints);
      if (group) { Object.assign(groups[group], paint); matched++; }
    }
  }
  try {
    const inline = parse(document.bodyStyle, { context: 'declarationList' });
    if (inline.type === 'DeclarationList') Object.assign(groups.body, declarations(inline.children.toArray() as Declaration[], vars));
  } catch { /* Keep valid stylesheets when the body attribute is malformed. */ }
  const body = groups.body;
  // A color pair and typography are the minimum evidence for a usable historical theme.
  if (!body['font-family'] || !body.color || !matched) return null;
  body['background-color'] ??= '#ffffff';
  const ratio = contrast(body.color, body['background-color']);
  if (ratio === null || ratio < 4.5) return null;
  const bodyPaint = { ...body };
  delete bodyPaint['border-radius'];
  delete bodyPaint['font-weight'];
  // No size changes to headings, form fields, icons or app layout.
  const heading: Paint = {};
  if (groups.heading['font-family']) heading['font-family'] = groups.heading['font-family'];
  if (groups.heading['font-weight']) heading['font-weight'] = groups.heading['font-weight'];
  const link: Paint = {};
  if ((contrast(groups.link.color ?? '', body['background-color']) ?? 0) >= 4.5) link.color = groups.link.color;
  const button: Paint = {};
  if ((contrast(groups.button.color ?? '', groups.button['background-color'] ?? '') ?? 0) >= 4.5) {
    button.color = groups.button.color;
    button['background-color'] = groups.button['background-color'];
    if (groups.button['border-radius']) button['border-radius'] = groups.button['border-radius'];
  }
  const prefix = 'html[data-net19-styled]';
  const compiled = [
    rule(prefix, { 'background-color': body['background-color'] }),
    rule(`${prefix} body`, bodyPaint),
    rule(`${prefix} :where(h1,h2,h3,h4,h5,h6)`, heading),
    rule(`${prefix} a:where(:not([role="button"]):not([class]):not([style]))`, link),
    rule(`${prefix} button:where(:not([disabled]):not([aria-disabled="true"]):not([class]):not([style]))`, button),
  ].filter(Boolean);
  const palette = [...new Set([body['background-color'], body.color, link.color, button['background-color']])]
    .flatMap(c => { const value = c && rgb(c); return value ? ['#' + value.map(v => v.toString(16).padStart(2, '0')).join('')] : []; }).slice(0, 6);
  return { ...meta, schema: SCHEMA, source: 'wayback', css: '/* net19: local historical style */\n' + compiled.join('\n'),
    palette, createdAt: Date.now(), ruleCount: compiled.length };
}
