// Tiny, dependency-free visualisation maths for the Insights page.
// Kept deliberately small: a Sankey layout, a streamgraph stack, a Gaussian
// KDE for ridgelines, a force simulation for the network graph, smooth
// curve path builders and linear scales. Nothing here touches the DOM.

export type Pt = { x: number; y: number };

// ── Scales ──────────────────────────────────────────────────────────────────
export function linear(domain: [number, number], range: [number, number]) {
  const [d0, d1] = domain, [r0, r1] = range;
  const span = d1 - d0 || 1;
  const f = (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
  f.invert = (p: number) => d0 + ((p - r0) / ((r1 - r0) || 1)) * span;
  return f;
}

export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return step * p;
}

export function ticks(max: number, n = 4): number[] {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const step = niceMax(max / n);
  if (!Number.isFinite(step) || step <= 0) return [0, max];
  const out: number[] = [];
  for (let v = 0; v <= max + 1e-9 && out.length < 50; v += step) out.push(Math.round(v * 1000) / 1000);
  return out;
}

export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// ── Curves ──────────────────────────────────────────────────────────────────
// Monotone-ish cubic through points (Catmull-Rom → Bézier). Good enough for
// lines, areas and ridgelines; never overshoots badly on sparse data.
export function smoothPath(pts: Pt[], tension = 0.5): string {
  if (!pts.length) return '';
  if (pts.length === 1) return `M${pts[0].x},${pts[0].y}`;
  let d = `M${pts[0].x},${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension * 2;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension * 2;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension * 2;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension * 2;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`;
  }
  return d;
}

// Closed band between an upper and lower polyline (used by streamgraph + areas).
export function bandPath(top: Pt[], bottom: Pt[]): string {
  if (!top.length) return '';
  const up = smoothPath(top);
  const rev = [...bottom].reverse();
  const down = smoothPath(rev).replace(/^M/, 'L');
  return `${up} ${down} Z`;
}

// ── Streamgraph stacking (silhouette / wiggle offset) ───────────────────────
export function stackStream(series: number[][], mode: 'silhouette' | 'zero' = 'silhouette') {
  const n = series.length, m = series[0]?.length ?? 0;
  const y0: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  const y1: number[][] = Array.from({ length: n }, () => new Array(m).fill(0));
  let maxAbs = 0;
  for (let j = 0; j < m; j++) {
    const total = series.reduce((s, row) => s + (row[j] ?? 0), 0);
    let acc = mode === 'silhouette' ? -total / 2 : 0;
    for (let i = 0; i < n; i++) {
      y0[i][j] = acc; acc += series[i][j] ?? 0; y1[i][j] = acc;
      maxAbs = Math.max(maxAbs, Math.abs(y0[i][j]), Math.abs(y1[i][j]));
    }
  }
  return { y0, y1, maxAbs: maxAbs || 1 };
}

// ── KDE for ridgelines ──────────────────────────────────────────────────────
export function kde(values: number[], xs: number[], bandwidth = 0.08): number[] {
  if (!values.length) return xs.map(() => 0);
  const k = (u: number) => Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
  return xs.map(x => values.reduce((s, v) => s + k((x - v) / bandwidth), 0) / (values.length * bandwidth));
}

// ── Sankey layout ───────────────────────────────────────────────────────────
export type SankeyNodeIn = { id: string; label: string };
export type SankeyLinkIn = { source: string; target: string; value: number };
export type SankeyNode = SankeyNodeIn & { x0: number; x1: number; y0: number; y1: number; value: number; depth: number };
export type SankeyLink = { source: SankeyNode; target: SankeyNode; value: number; width: number; sy: number; ty: number; path: string };

export function sankey(nodesIn: SankeyNodeIn[], linksIn: SankeyLinkIn[], width: number, height: number, opts: { nodeWidth?: number; padding?: number; order?: string[] } = {}) {
  const nodeWidth = opts.nodeWidth ?? 14, padding = opts.padding ?? 14;
  const byId = new Map<string, SankeyNode>();
  const nodes: SankeyNode[] = nodesIn.map(n => { const node = { ...n, x0: 0, x1: 0, y0: 0, y1: 0, value: 0, depth: 0 }; byId.set(n.id, node); return node; });
  const links = linksIn.filter(l => byId.has(l.source) && byId.has(l.target) && l.value > 0);

  // Depth = longest path from a source (DAG assumed).
  const incoming = new Map<string, number>();
  nodes.forEach(n => incoming.set(n.id, 0));
  links.forEach(l => incoming.set(l.target, (incoming.get(l.target) ?? 0) + 1));
  const queue = nodes.filter(n => !incoming.get(n.id));
  const remaining = new Map(incoming);
  while (queue.length) {
    const n = queue.shift()!;
    for (const l of links.filter(l => l.source === n.id)) {
      const t = byId.get(l.target)!;
      t.depth = Math.max(t.depth, n.depth + 1);
      remaining.set(t.id, (remaining.get(t.id) ?? 1) - 1);
      if (remaining.get(t.id) === 0) queue.push(t);
    }
  }
  // Terminal-only nodes (no outgoing links) sit on the far right column.
  const maxDepth = Math.max(0, ...nodes.map(n => n.depth));
  for (const n of nodes) if (!links.some(l => l.source === n.id) && links.some(l => l.target === n.id)) n.depth = maxDepth;
  // Explicit ordering column override (e.g. keep Parked/Pivoted/Dropped on the right).
  if (opts.order) opts.order.forEach(id => { const n = byId.get(id); if (n) n.depth = maxDepth; });

  for (const n of nodes) {
    const inV = links.filter(l => l.target === n.id).reduce((s, l) => s + l.value, 0);
    const outV = links.filter(l => l.source === n.id).reduce((s, l) => s + l.value, 0);
    n.value = Math.max(inV, outV);
  }
  const live = nodes.filter(n => n.value > 0);
  const columns: SankeyNode[][] = [];
  for (const n of live) (columns[n.depth] ??= []).push(n);
  const colCount = columns.filter(Boolean).length;
  const colIndex = new Map<number, number>();
  let ci = 0; columns.forEach((c, d) => { if (c) colIndex.set(d, ci++); });
  const xStep = colCount > 1 ? (width - nodeWidth) / (colCount - 1) : 0;

  const totalMax = Math.max(...columns.filter(Boolean).map(c => c.reduce((s, n) => s + n.value, 0)));
  for (const col of columns) {
    if (!col) continue;
    const sum = col.reduce((s, n) => s + n.value, 0);
    const pad = padding * (col.length - 1);
    const scale = (height - pad) / (totalMax || 1);
    const used = sum * scale + pad;
    let y = (height - used) / 2;
    col.sort((a, b) => (a.depth === b.depth ? 0 : 0));
    for (const n of col) {
      const x0 = colIndex.get(n.depth)! * xStep;
      n.x0 = x0; n.x1 = x0 + nodeWidth; n.y0 = y; n.y1 = y + n.value * scale; y = n.y1 + padding;
    }
  }
  // Link positions.
  const sOff = new Map<string, number>(), tOff = new Map<string, number>();
  const out: SankeyLink[] = [];
  const scale = (height - padding * ((columns[0]?.length ?? 1) - 1)) / (totalMax || 1);
  for (const l of links.sort((a, b) => byId.get(a.target)!.y0 - byId.get(b.target)!.y0)) {
    const s = byId.get(l.source)!, t = byId.get(l.target)!;
    const w = l.value * scale;
    const sy = s.y0 + (sOff.get(s.id) ?? 0) + w / 2; sOff.set(s.id, (sOff.get(s.id) ?? 0) + w);
    const ty = t.y0 + (tOff.get(t.id) ?? 0) + w / 2; tOff.set(t.id, (tOff.get(t.id) ?? 0) + w);
    const xm = (s.x1 + t.x0) / 2;
    out.push({ source: s, target: t, value: l.value, width: w, sy, ty, path: `M${s.x1},${sy} C${xm},${sy} ${xm},${ty} ${t.x0},${ty}` });
  }
  return { nodes: live, links: out };
}

// ── Force simulation ────────────────────────────────────────────────────────
export type FNode = { id: string; x: number; y: number; vx: number; vy: number; r: number; fixed?: boolean; [k: string]: unknown };
export type FLink = { source: FNode; target: FNode; strength?: number };

export function stepForces(nodes: FNode[], links: FLink[], width: number, height: number, alpha: number) {
  const cx = width / 2, cy = height / 2;
  // Repulsion (O(n²) is fine for < 250 nodes).
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let d2 = dx * dx + dy * dy;
      if (d2 < 1) { dx = (Math.random() - 0.5) * 2; dy = (Math.random() - 0.5) * 2; d2 = 1; }
      const d = Math.sqrt(d2);
      const min = a.r + b.r + 10;
      const f = (-1600 * Math.max(alpha, 0.05)) / d2 + (d < min ? (min - d) * 0.35 : 0) * -1;
      const fx = (dx / d) * f, fy = (dy / d) * f;
      a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
    }
  }
  // Springs.
  for (const l of links) {
    const dx = l.target.x - l.source.x, dy = l.target.y - l.source.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const ideal = 48 + l.source.r + l.target.r;
    const f = (d - ideal) * 0.03 * (l.strength ?? 1) * Math.max(alpha, 0.05) * 4;
    const fx = (dx / d) * f, fy = (dy / d) * f;
    l.source.vx += fx; l.source.vy += fy; l.target.vx -= fx; l.target.vy -= fy;
  }
  // Centre gravity + integrate.
  for (const n of nodes) {
    if (n.fixed) { n.vx = 0; n.vy = 0; continue; }
    n.vx += (cx - n.x) * 0.004 * Math.max(alpha, 0.05) * 4;
    n.vy += (cy - n.y) * 0.004 * Math.max(alpha, 0.05) * 4;
    n.vx *= 0.6; n.vy *= 0.6;
    n.x = Math.max(n.r, Math.min(width - n.r, n.x + n.vx));
    n.y = Math.max(n.r, Math.min(height - n.r, n.y + n.vy));
  }
}

export const fmt = (n: number) => new Intl.NumberFormat('en-GB').format(Math.round(n));
export const fmtShort = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${Math.round(n)}`);
export const weekLabel = (iso: string) => { const d = new Date(iso); return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
