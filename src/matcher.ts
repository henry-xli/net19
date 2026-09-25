import { type Descriptor, type Snapshot } from './snapshot';

export type Match = { archived: number; live: number; score: number };
function intersection(a: string[], b: string[]): number { return a.filter(value => b.includes(value)).length; }
export function similarity(a: Descriptor, b: Descriptor): number {
  if (a.kind !== b.kind) return 0;
  let score = a.tag === b.tag ? 2 : 0;
  if (a.kind === 'text' && a.tag === b.tag && /^h[1-6]$/.test(a.tag)) score += 20;
  if (a.name && a.name === b.name) score += 35;
  if (a.id && a.id === b.id) score += 28;
  score += Math.min(24, intersection(a.classes, b.classes) * 12);
  score += Math.min(14, intersection(a.ancestry ?? [], b.ancestry ?? []) * 14);
  if (a.label && b.label) {
    if (a.label === b.label) score += a.kind === 'image' ? 35 : 24;
    else if (/[a-z]{3}/.test(a.label) && a.label.replace(/\d+(?:[.,]\d+)*/g,'#') === b.label.replace(/\d+(?:[.,]\d+)*/g,'#')) score += 16;
    else if (Math.min(a.label.length, b.label.length) > 12 && (a.label.startsWith(b.label) || b.label.startsWith(a.label))) score += 10;
  }
  if (['link','form'].includes(a.kind) && a.href && a.href === b.href) score += 24;
  if (a.children.length && b.children.length) score += 25 * intersection(a.children, b.children) / Math.max(a.children.length, b.children.length);
  if (a.kind === 'field' && a.type && b.type && a.type !== b.type && !['text','search',''].includes(a.type)) return 0;
  return score;
}

function importance(node: Snapshot['nodes'][number]): number {
  const kind = node.descriptor.kind;
  return kind === 'field' || kind === 'button' ? 3 : kind === 'image' && node.descriptor.label ? 2 : kind === 'link' ? 1 : kind === 'text' ? .5 : 0;
}

export function matchSnapshots(archived: Snapshot, live: Snapshot): { matches: Match[]; coverage: number; liveCoverage: number } {
  const candidates: Match[] = [];
  const hrefCounts = new Map<string,number>();
  for (const node of archived.nodes) if (node.descriptor.kind === 'link' && node.descriptor.href)
    hrefCounts.set(node.descriptor.href, (hrefCounts.get(node.descriptor.href) ?? 0) + 1);
  for (let a = 0; a < archived.nodes.length; a++) for (let b = 0; b < live.nodes.length; b++) {
    const source = archived.nodes[a].descriptor, target = live.nodes[b].descriptor;
    let score = similarity(source, target);
    // Repeated routes such as /item?id=... identify neither a headline nor its
    // comment link. Require component context instead of letting the path dominate.
    if (source.kind === 'link' && source.href === target.href && (hrefCounts.get(source.href) ?? 0) > 2) score -= 18;
    const minimum = archived.nodes[a].descriptor.kind === 'box' ? 18 : 16;
    if (score >= minimum) candidates.push({ archived: a, live: b, score: score - Math.min(2,
      Math.abs(archived.nodes[a].box.y / archived.height - live.nodes[b].box.y / live.height)) });
  }
  candidates.sort((a, b) => b.score - a.score);
  const source = new Set<number>(), target = new Set<number>();
  const matches: Match[] = [];
  for (const match of candidates) if (!source.has(match.archived) && !target.has(match.live)) {
    source.add(match.archived); target.add(match.live); matches.push(match);
  }
  // Text changes between captures. Once a component's parent has a strong identity
  // match, pair its corresponding children by role/tag instead of requiring old text.
  // This also prevents identical repeated cards from being paired across containers.
  for (let pass = 0; pass < 3; pass++) {
    const parents = new Map(matches.map(match=>[match.archived,match.live]));
    const contextual: Match[] = [];
    for (const [a, node] of archived.nodes.entries()) {
      if (source.has(a) || !parents.has(node.parent)) continue;
      for (const [b, candidate] of live.nodes.entries()) {
        if (target.has(b) || candidate.parent !== parents.get(node.parent) || node.descriptor.kind !== candidate.descriptor.kind || node.descriptor.tag !== candidate.descriptor.tag) continue;
        contextual.push({archived:a,live:b,score:similarity(node.descriptor,candidate.descriptor)+20-Math.min(2,Math.abs(a-b)/100)});
      }
    }
    if (!contextual.length) break;
    contextual.sort((a,b)=>b.score-a.score);
    for (const match of contextual) if (!source.has(match.archived) && !target.has(match.live)) {
      source.add(match.archived); target.add(match.live); matches.push(match);
    }
  }
  const total = archived.nodes.reduce((sum, node) => sum + importance(node), 0);
  const liveTotal = live.nodes.reduce((sum, node) => sum + importance(node), 0);
  return { matches, coverage: total ? matches.reduce((sum, m) => sum + importance(archived.nodes[m.archived]), 0) / total : 0,
    liveCoverage: liveTotal ? matches.reduce((sum, m) => sum + importance(live.nodes[m.live]), 0) / liveTotal : 0 };
}
