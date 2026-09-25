import { type Paint, type Snapshot } from './snapshot';

// Role-based historical theme.
//
// Element-by-element matching only works when a site's DOM survived from the target year,
// which is rare: most sites were redesigned, renamed their classes, or moved to a
// script-built frontend. Instead of rejecting those pages, the archived capture is reduced
// to design tokens per ROLE (page, body text, headings, links, buttons, fields, header,
// footer) and applied to the live page's elements of the same role. Roles exist on every
// page, so this never depends on the two DOMs corresponding. Only computed values from the
// inert renderer are used; selectors are the fixed role attributes below.
export const THEME_ROLES = ['surface','text','prose','font','heading','link','button','field','header','header-text','footer'] as const;
export type Role = typeof THEME_ROLES[number];
export type Theme = Partial<Record<Role | 'body', Paint>>;

const BORDERS = ['top','right','bottom','left'].flatMap(side => [`border-${side}-width`,`border-${side}-style`,`border-${side}-color`]);
const RADII = ['border-top-left-radius','border-top-right-radius','border-bottom-left-radius','border-bottom-right-radius'];
const PROPS: Record<Role | 'body', string[]> = {
  body: ['color','background-color','background-image','font-family'],
  surface: ['background-color','background-image'],
  text: ['color','font-family'],
  prose: ['color','font-family','font-size','line-height'],
  font: ['font-family'],
  heading: ['color','font-family','font-weight','font-style','letter-spacing','text-transform'],
  link: ['color','text-decoration-line','text-decoration-color'],
  button: ['color','background-color','background-image','font-family','font-weight','text-transform','box-shadow',...BORDERS,...RADII],
  field: ['color','background-color','background-image','font-family','box-shadow',...BORDERS,...RADII],
  header: ['color','background-color','background-image','border-bottom-width','border-bottom-style','border-bottom-color'],
  'header-text': ['color'],
  footer: ['color','background-color','background-image','border-top-width','border-top-style','border-top-color'],
};
const TRANSPARENT = /^(?:transparent|rgba\([^)]*,\s*0\))$/;
const ICON_FONT = /icon|symbol|awesome|glyph|material/i;

export function rgb(value: string): number[] { return value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? []; }
export function ratio(a: string, b: string): number {
  const light = (s: string) => rgb(s).map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4)
    .reduce((sum, v, i) => sum + v * [.2126,.7152,.0722][i], 0);
  const x = light(a), y = light(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}
function opaque(paint: Paint): boolean { return !!paint['background-color'] && !TRANSPARENT.test(paint['background-color']) || /gradient/.test(paint['background-image'] ?? ''); }
function surfaceColor(paint: Paint): string | null {
  if (paint['background-color'] && !TRANSPARENT.test(paint['background-color'])) return paint['background-color'];
  return paint['background-image']?.match(/rgba?\([^)]+\)/)?.[0] ?? null;
}
export function background(node: Element): string {
  for (let parent: Element | null = node; parent; parent = parent.parentElement) {
    const style = getComputedStyle(parent);
    const gradient = style.backgroundImage.match(/rgba?\([^)]+\)/)?.[0];
    if (gradient) return gradient;
    if (!TRANSPARENT.test(style.backgroundColor)) return style.backgroundColor;
  }
  return 'rgb(255, 255, 255)';
}
function subset(paint: Paint | undefined, role: Role | 'body'): Paint | undefined {
  if (!paint) return undefined;
  const out: Paint = {};
  for (const key of PROPS[role]) if (paint[key] !== undefined) out[key] = paint[key];
  return Object.keys(out).length ? out : undefined;
}

export function deriveTheme(s: Snapshot): Theme {
  const nodes = s.nodes.map(node => ({ ...node, paint: s.styles[node.style] }));
  // The most frequent computed style among a role's archived nodes is its token.
  const common = (list: typeof nodes) => {
    const counts = new Map<number, number>();
    for (const node of list) counts.set(node.style, (counts.get(node.style) ?? 0) + 1 + Math.min(3, node.descriptor.label.length / 40));
    const best = [...counts].sort((a, b) => b[1] - a[1])[0];
    return best ? s.styles[best[0]] : undefined;
  };
  const band = (node: typeof nodes[number]) => node.box.w >= s.width * .9 && opaque(node.paint) && ['box','form'].includes(node.descriptor.kind);
  const header = nodes.filter(n => band(n) && n.box.y < 80 && n.box.h >= 24 && n.box.h <= 260).sort((a, b) => a.box.y - b.box.y || b.box.h - a.box.h)[0];
  const footer = nodes.filter(n => band(n) && n.box.y + n.box.h >= s.pageHeight - 40 && n.box.h <= 600 && n !== header).sort((a, b) => b.box.y - a.box.y)[0];
  const inside = (n: typeof nodes[number], box?: typeof header) => !!box && n.box.y >= box.box.y && n.box.y + n.box.h <= box.box.y + box.box.h + 1;
  const links = nodes.filter(n => n.descriptor.kind === 'link' && n.descriptor.label && !inside(n, header) && !inside(n, footer));
  const headerLinks = nodes.filter(n => n.descriptor.kind === 'link' && inside(n, header));
  const prose = nodes.filter(n => n.descriptor.kind === 'text' && /^(p|li|td|dd|blockquote)$/.test(n.descriptor.tag));
  const theme: Theme = {
    body: subset(s.body, 'body'),
    heading: subset(common(nodes.filter(n => n.descriptor.kind === 'text' && /^h[1-4]$/.test(n.descriptor.tag))), 'heading'),
    link: subset(common(links.length ? links : nodes.filter(n => n.descriptor.kind === 'link')), 'link'),
    button: subset(common(nodes.filter(n => n.descriptor.kind === 'button')), 'button'),
    field: subset(common(nodes.filter(n => n.descriptor.kind === 'field' && ['','text','search','email','url','tel'].includes(n.descriptor.type))), 'field'),
    prose: subset(common(prose), 'prose'),
    header: subset(header?.paint, 'header'),
    'header-text': subset(common(headerLinks) ?? header?.paint, 'header-text'),
    footer: subset(footer?.paint, 'footer'),
  };
  if (theme.body) {
    theme.text = subset(theme.body, 'text');
    theme.font = subset(theme.body, 'font');
    theme.surface = subset(theme.body, 'surface');
    if (theme.surface && !opaque(theme.surface)) theme.surface = { 'background-color': 'rgb(255, 255, 255)', 'background-image': 'none' };
    if (!opaque(theme.body)) theme.body = { ...theme.body, 'background-color': 'rgb(255, 255, 255)' };
  }
  if (!theme.prose && theme.text) theme.prose = theme.text;
  // Header text must stay readable on the archived header color.
  const headerBg = theme.header && surfaceColor(theme.header);
  if (headerBg && theme['header-text']?.color && ratio(theme['header-text'].color, headerBg) < 3) theme['header-text'] = subset(theme.header, 'header-text');
  if (headerBg && theme['header-text']?.color && ratio(theme['header-text'].color, headerBg) < 3) delete theme['header-text'];
  if (theme.header && !headerBg) delete theme.header;
  return theme;
}

// The archived tokens are light-era colors. Painting them onto a page that is currently
// rendered dark (dark mode, or a dark design) leaves the site's own light text and white
// logos on a light background, which is unreadable. Sample what is actually painted.
export function darkPage(): boolean {
  const points = [[.5,.5],[.25,.3],[.75,.3],[.25,.7],[.75,.7],[.5,.15],[.5,.85],[.1,.5],[.9,.5]];
  let dark = 0, seen = 0;
  for (const [x, y] of points) {
    const node = document.elementFromPoint(innerWidth * x, innerHeight * y);
    if (!node) continue;
    seen++;
    const [r, g, b] = rgb(background(node));
    if (.2126 * r + .7152 * g + .0722 * b < 90) dark++;
  }
  return seen > 0 && dark / seen >= .4;
}

// A theme is worth applying when the capture carried more than browser defaults.
export function themeStrength(theme: Theme): number {
  return (['heading','link','button','field','header','footer','prose'] as const).filter(role => theme[role]).length;
}

type Mark = (node: Element, name: string, value?: string) => void;
export type AppliedTheme = { rules: string[]; marked: Element[]; verify: () => boolean };

export function applyTheme(theme: Theme, prefix: string, mark: Mark, owned: Set<Element> = new Set()): AppliedTheme {
  const view = document.defaultView!;
  const width = innerWidth;
  const marked: Element[] = [];
  const role = (node: Element, value: Role) => { if (!owned.has(node) && !node.hasAttribute('data-net19-role')) { mark(node, 'data-net19-role', value); marked.push(node); } };
  const visible = (node: Element) => {
    const box = node.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return null;
    const style = view.getComputedStyle(node);
    return style.display === 'none' || style.visibility === 'hidden' ? null : { box, style };
  };
  const pageBg = surfaceColor(theme.body ?? {}) ?? 'rgb(255, 255, 255)';
  const headerBg = theme.header ? surfaceColor(theme.header) : null;
  const find = (selector: string, test: (box: DOMRect) => boolean) => Array.from(document.querySelectorAll(selector)).find(node => {
    const v = visible(node); return !!v && test(v.box);
  });
  const header = theme.header ? find('header,[role="banner"]', box => box.top < 160 && box.width >= width * .8 && box.height <= 320) : undefined;
  const footer = theme.footer ? find('footer,[role="contentinfo"]', box => box.width >= width * .8) : undefined;
  if (header) role(header, 'header');
  if (footer) role(footer, 'footer');
  const within = (node: Element, zone?: Element) => !!zone && zone.contains(node);

  // Page-level surfaces: full-width wrappers that paint the page background.
  const surfaces = new Set<Element>([document.documentElement, document.body]);
  if (theme.surface) for (const node of Array.from(document.body.querySelectorAll(':scope > *, :scope > * > *, :scope > * > * > *')).slice(0, 400)) {
    if (node === header || node === footer || within(node, header) || within(node, footer)) continue;
    const v = visible(node);
    if (!v || v.box.width < width * .95 || v.box.height < innerHeight * .6) continue;
    if (TRANSPARENT.test(v.style.backgroundColor) && v.style.backgroundImage === 'none') continue;
    role(node, 'surface'); surfaces.add(node);
  }
  // Is the element drawn directly on the page background (after surfaces are recolored)?
  const pageCache = new Map<Element, boolean>();
  const onPage = (node: Element | null): boolean => {
    if (!node || surfaces.has(node)) return true;
    const known = pageCache.get(node); if (known !== undefined) return known;
    const style = view.getComputedStyle(node);
    const result = TRANSPARENT.test(style.backgroundColor) && style.backgroundImage === 'none' && onPage(node.parentElement);
    pageCache.set(node, result); return result;
  };
  const iconic = (node: Element, style: CSSStyleDeclaration) => ICON_FONT.test(style.fontFamily) || /icon|symbol|glyph|(^|\s)fa-/i.test(node.getAttribute('class') ?? '');
  const readable = (color: string | undefined, bg: string) => !color || ratio(color, bg) >= 3;

  let budget = 5000;
  if (theme.heading) for (const node of Array.from(document.body.querySelectorAll('h1,h2,h3,h4,h5,h6'))) {
    if (--budget < 0 || within(node, header) || within(node, footer)) continue;
    const v = visible(node); if (!v || iconic(node, v.style)) continue;
    if (onPage(node) ? readable(theme.heading.color, pageBg) : false) role(node, 'heading');
  }
  if (theme.link || theme['header-text']) for (const node of Array.from(document.body.querySelectorAll('a[href]')).slice(0, 2000)) {
    if (node.matches('[role="button"],[class*="btn"],[class*="button" i]') || !(node as HTMLElement).innerText?.trim()) continue;
    const v = visible(node); if (!v || iconic(node, v.style)) continue;
    if (within(node, header)) { if (theme['header-text'] && headerBg) role(node, 'header-text'); continue; }
    if (!theme.link || within(node, footer) || node.closest('nav,[role="navigation"]')) continue;
    const bg = onPage(node) ? pageBg : background(node);
    if (readable(theme.link.color, bg)) role(node, 'link');
  }
  if (theme.button) for (const node of Array.from(document.body.querySelectorAll('button,input[type="submit"],input[type="button"],input[type="reset"]')).slice(0, 400)) {
    // Menu toggles in headers and navigation bars are not the era's content buttons.
    if (within(node, header) || node.closest('nav,[role="navigation"],[role="menubar"],[role="tablist"]') || node.matches('[aria-haspopup],[aria-expanded]')) continue;
    const v = visible(node); if (!v || v.box.width > 420 || v.box.height > 90) continue;
    const text = node instanceof HTMLInputElement ? node.value : (node as HTMLElement).innerText;
    if (!text?.trim() || iconic(node, v.style)) continue;
    const bg = surfaceColor(theme.button) ?? (onPage(node) ? pageBg : background(node.parentElement ?? node));
    if (readable(theme.button.color, bg)) role(node, 'button');
  }
  if (theme.field) for (const node of Array.from(document.body.querySelectorAll('input:not([type]),input[type="text"],input[type="search"],input[type="email"],input[type="url"],input[type="tel"],textarea,select')).slice(0, 200)) {
    if (node.matches('[autocomplete*="cc-"]')) continue;
    const v = visible(node); if (!v) continue;
    const bg = surfaceColor(theme.field) ?? background(node);
    if (readable(theme.field.color, bg)) role(node, 'field');
  }
  if (header && theme['header-text'] && headerBg) for (const node of Array.from(header.querySelectorAll('span,p,li,h1,h2,h3,div,label')).slice(0, 300)) {
    if (!Array.from(node.childNodes).some(child => child.nodeType === 3 && child.textContent?.trim())) continue;
    const v = visible(node); if (!v || iconic(node, v.style)) continue;
    const own = !TRANSPARENT.test(v.style.backgroundColor) && node !== header;
    if (!own) role(node, 'header-text');
  }
  // Body copy: archived color and font on the page background, font only elsewhere.
  for (const node of Array.from(document.body.querySelectorAll('p,li,td,th,dd,dt,blockquote,span,div,label,small,strong,em,b,figcaption,cite')).slice(0, 6000)) {
    if (--budget < 0) break;
    if (within(node, header) || within(node, footer) || node.closest('a,button,[role="button"],input,select,textarea,svg')) continue;
    if (!Array.from(node.childNodes).some(child => child.nodeType === 3 && child.textContent?.trim())) continue;
    const v = visible(node); if (!v || iconic(node, v.style)) continue;
    if (onPage(node)) {
      const token = /^(P|LI|TD|DD|BLOCKQUOTE)$/.test(node.tagName) ? 'prose' : 'text';
      if (theme[token] && readable(theme[token]!.color, pageBg)) role(node, token);
    } else if (theme.font) role(node, 'font');
  }

  const declarations = (paint: Paint) => Object.entries(paint).map(([p, v]) => `${p}:${v} !important`).join(';');
  const rules: string[] = [];
  if (theme.body) {
    rules.push(`${prefix}{background-color:${pageBg} !important}`);
    rules.push(`${prefix} body{${declarations(theme.body)}}`);
  }
  for (const name of THEME_ROLES) {
    const paint = theme[name];
    if (paint && marked.some(node => node.getAttribute('data-net19-role') === name)) rules.push(`${prefix} [data-net19-role="${name}"]{${declarations(paint)}}`);
  }
  return {
    rules, marked,
    // After activation: drop the role from any element that became hard to read (for
    // example a site-specific overlay on a recolored surface). Roll back only if a large
    // share of themed text fails, which means the page does not fit this theme at all.
    verify: () => {
      let failed = 0, sampled = 0;
      for (const node of marked) {
        const name = node.getAttribute('data-net19-role');
        if (!name || name === 'surface' || name === 'header' || name === 'footer') continue;
        if (++sampled > 1500) break;
        const style = view.getComputedStyle(node);
        if (style.visibility === 'hidden' || node.matches(':disabled')) continue;
        if (ratio(style.color, background(node)) < 3) { node.removeAttribute('data-net19-role'); failed++; }
      }
      return sampled === 0 || failed / sampled < .4;
    },
  };
}
