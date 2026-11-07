import { useEffect, useMemo, useRef, useState } from 'react';
import { INK, SERIES_COLORS, useSize, useInView, useReveal, useTween, Tooltip, Legend, EmptyNote, KindBadge, DataKind, prefersReducedMotion } from './shared';
import { linear, niceMax, ticks, smoothPath, bandPath, stackStream, kde, sankey, stepForces, fmt, fmtShort, weekLabel, FNode, FLink } from '@/lib/viz';

// ── 1. Animated KPI counter ─────────────────────────────────────────────────
export function KpiTile({ label, value, kind, note, unit, delta, accent = INK.violetHi, delay = 0 }: { label: string; value: number; kind: DataKind; note?: string; unit?: string; delta?: number; accent?: string; delay?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1400 + delay);
  const shown = useTween([value], 900)[0];
  const display = Math.round(shown * (inView ? p : 0));
  return (
    <div ref={ref} className={`ins-kpi ${inView ? 'ins-in' : ''}`} style={{ transitionDelay: `${delay}ms` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: INK.mono, fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: INK.text3 }}>{label}</span>
        <KindBadge kind={kind} note={note} />
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10 }}>
        <span style={{ fontFamily: INK.ui, fontSize: 'clamp(34px, 4.2vw, 52px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1, color: INK.text, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 28px ${accent}33` }}>{fmt(display)}</span>
        {unit && <span style={{ fontFamily: INK.mono, fontSize: 13, color: INK.text3 }}>{unit}</span>}
      </div>
      <div style={{ marginTop: 10, height: 3, borderRadius: 3, background: INK.surfaceHi, overflow: 'hidden' }}>
        <div style={{ width: `${Math.round(p * 100)}%`, height: '100%', background: `linear-gradient(90deg, ${accent}, ${INK.lime})`, transition: 'width .3s' }} />
      </div>
      {typeof delta === 'number' && (
        <div style={{ marginTop: 8, fontSize: 12, color: delta >= 0 ? INK.lime : INK.rose, fontFamily: INK.mono }}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} this period</div>
      )}
    </div>
  );
}

// ── 2. Sankey (member journey) ──────────────────────────────────────────────
const SANKEY_COLORS: Record<string, string> = { idea: INK.violetHi, hone: '#8b5cf6', validate: INK.sky, shape: INK.mint, done: INK.lime, parked: '#6b6480', pivot: INK.amber, drop: INK.rose };

export function JourneySankey({ nodes, links, reached }: { nodes: { id: string; label: string }[]; links: { source: string; target: string; value: number }[]; reached: number[] }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1600);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const width = Math.max(320, size.width), height = size.width < 560 ? 300 : 360;
  const pad = { l: 8, r: 96, t: 30, b: 12 };
  const layout = useMemo(() => sankey(nodes, links, width - pad.l - pad.r, height - pad.t - pad.b, { nodeWidth: 12, padding: 18, order: ['parked', 'pivot', 'drop'] }), [nodes, links, width, height]);
  const total = reached[0] || 1;
  if (!links.length) return <div ref={box}><EmptyNote>No ideas have moved between stages yet — the river fills as founders progress.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block', overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
          <defs>
            {layout.links.map((l, i) => (
              <linearGradient key={i} id={`sk-g-${i}`} x1="0" x2="1">
                <stop offset="0%" stopColor={SANKEY_COLORS[l.source.id] ?? INK.violetHi} />
                <stop offset="100%" stopColor={SANKEY_COLORS[l.target.id] ?? INK.lime} />
              </linearGradient>
            ))}
          </defs>
          <g transform={`translate(${pad.l},${pad.t})`}>
            {layout.links.map((l, i) => (
              <path key={i} d={l.path} fill="none" stroke={`url(#sk-g-${i})`} strokeWidth={Math.max(1.5, l.width)} strokeOpacity={hover && !hover.text.includes(l.target.label) && !hover.text.includes(l.source.label) ? 0.15 : 0.42}
                className="ins-flow" style={{ strokeDasharray: 2000, strokeDashoffset: 2000 * (1 - p), transition: 'stroke-opacity .2s' }}
                onMouseMove={e => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${l.source.label} → ${l.target.label}: ${fmt(l.value)} ideas (${Math.round((l.value / total) * 100)}%)` }); }} />
            ))}
            {layout.nodes.map(n => {
              const isExit = ['parked', 'pivot', 'drop'].includes(n.id);
              const tx = isExit ? n.x1 + 8 : n.x0;
              const ty = isExit ? (n.y0 + n.y1) / 2 : n.y0 - 10;
              return (
                <g key={n.id} style={{ opacity: p }}>
                  <rect x={n.x0} y={n.y0} width={n.x1 - n.x0} height={Math.max(2, n.y1 - n.y0)} rx={4} fill={SANKEY_COLORS[n.id] ?? INK.violetHi} style={{ filter: `drop-shadow(0 0 8px ${SANKEY_COLORS[n.id] ?? INK.violetHi}88)` }} />
                  <text x={tx} y={isExit ? ty - 6 : ty} dy="0.35em" textAnchor="start" fontFamily={INK.ui} fontSize={12} fontWeight={700} fill={INK.text} style={{ paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 4 }}>{n.label}</text>
                  <text x={tx} y={isExit ? ty + 8 : ty} dx={isExit ? 0 : n.label.length * 7.2 + 6} dy="0.35em" fontFamily={INK.mono} fontSize={10} fill={isExit ? INK.text3 : INK.lime} style={{ paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 4 }}>{fmt(isExit ? n.value : (reached[['idea', 'hone', 'validate', 'shape', 'done'].indexOf(n.id)] ?? n.value))}</text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {hover && <Tooltip x={hover.x} y={hover.y} bounds={{ width, height }}>{hover.text}</Tooltip>}
    </div>
  );
}

// ── 3. Ridgeline (learning depth per stage) ─────────────────────────────────
export function Ridgeline({ stages }: { stages: { stage: string; label: string; values: number[]; ideas: number; median: number; steps: number }[] }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1400);
  const [hover, setHover] = useState<number | null>(null);
  const width = Math.max(320, size.width);
  const rowH = 58, overlap = 1.9, labelW = size.width < 520 ? 70 : 110;
  const height = rowH * stages.length + 40;
  const xs = useMemo(() => Array.from({ length: 64 }, (_, i) => i / 63), []);
  const curves = useMemo(() => stages.map(s => kde(s.values, xs, 0.07)), [stages, xs]);
  const maxY = Math.max(1e-6, ...curves.flat());
  const x = linear([0, 1], [labelW, width - 16]);
  const any = stages.some(s => s.values.length);
  if (!any) return <div ref={box}><EmptyNote>No stage work logged yet.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
          <defs>
            {stages.map((s, i) => (
              <linearGradient key={s.stage} id={`rg-${i}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.85} />
                <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.08} />
              </linearGradient>
            ))}
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map(t => (
            <g key={t}>
              <line x1={x(t)} x2={x(t)} y1={10} y2={height - 24} stroke={INK.border} strokeDasharray="2 4" />
              <text x={x(t)} y={height - 8} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{Math.round(t * 100)}%</text>
            </g>
          ))}
          {stages.map((s, i) => {
            const base = 24 + rowH * (i + 1) - 6;
            const amp = rowH * overlap * p;
            const pts = xs.map((v, j) => ({ x: x(v), y: base - (curves[i][j] / maxY) * amp }));
            const bottom = xs.map(v => ({ x: x(v), y: base }));
            const dim = hover !== null && hover !== i;
            return (
              <g key={s.stage} style={{ opacity: dim ? 0.3 : 1, transition: 'opacity .25s' }} onMouseEnter={() => setHover(i)}>
                <path d={bandPath(pts, bottom)} fill={`url(#rg-${i})`} />
                <path d={smoothPath(pts)} fill="none" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={1.6} />
                <text x={labelW - 10} y={base - 4} textAnchor="end" fontFamily={INK.ui} fontSize={13} fontWeight={700} fill={INK.text}>{s.label}</text>
                <text x={labelW - 10} y={base + 10} textAnchor="end" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{s.ideas} ideas</text>
              </g>
            );
          })}
        </svg>
      </div>
      {hover !== null && (
        <div style={{ position: 'absolute', right: 8, top: 4, fontSize: 12, color: INK.text2, background: 'rgba(22,18,29,.9)', border: `1px solid ${INK.borderHi}`, borderRadius: 8, padding: '6px 10px' }}>
          <b style={{ color: INK.text }}>{stages[hover].label}</b> · {stages[hover].ideas} ideas · median {stages[hover].median} fields saved · {stages[hover].steps} steps in stage
        </div>
      )}
    </div>
  );
}

// ── 4. Streamgraph (community engagement) ───────────────────────────────────
export function Streamgraph({ weeks, series, highlightKey, onSelect }: { weeks: string[]; series: { key: string; label: string; values: number[] }[]; highlightKey?: string | null; onSelect?: (key: string | null) => void }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1500);
  const [active, setActive] = useState<Set<string>>(() => new Set(series.map(s => s.key)));
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const width = Math.max(320, size.width), height = 300;
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const flat = useMemo(() => series.flatMap(s => s.values.map(v => (active.has(s.key) ? v : 0))), [series, active]);
  const tw = useTween(flat, 800);
  const stacked = useMemo(() => {
    const m = weeks.length;
    const rows = series.map((_, i) => tw.slice(i * m, (i + 1) * m));
    return { rows, ...stackStream(rows, 'silhouette') };
  }, [tw, series, weeks.length]);
  const x = linear([0, Math.max(1, weeks.length - 1)], [pad.l, width - pad.r]);
  const y = linear([-stacked.maxAbs, stacked.maxAbs], [height - pad.b, pad.t]);
  const totalAll = series.reduce((s, r) => s + r.values.reduce((a, b) => a + b, 0), 0);
  if (!totalAll) return <div ref={box}><EmptyNote>No community activity in this period.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block' }}
          onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const px = e.clientX - r.left; const i = Math.round(x.invert(px)); setHover({ i: Math.max(0, Math.min(weeks.length - 1, i)), x: px, y: e.clientY - r.top }); }}
          onMouseLeave={() => setHover(null)}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`sg-${s.key}`} x1="0" x2="1">
                <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.55} />
                <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.9} />
              </linearGradient>
            ))}
            <clipPath id="sg-clip"><rect x={0} y={0} width={pad.l + (width - pad.l - pad.r) * p} height={height} /></clipPath>
          </defs>
          <g clipPath="url(#sg-clip)">
            {series.map((s, i) => {
              const top = weeks.map((_, j) => ({ x: x(j), y: y(stacked.y1[i][j]) }));
              const bot = weeks.map((_, j) => ({ x: x(j), y: y(stacked.y0[i][j]) }));
              const dim = highlightKey && highlightKey !== s.key;
              return <path key={s.key} d={bandPath(top, bot)} fill={`url(#sg-${s.key})`} stroke={INK.bg} strokeWidth={0.8} style={{ opacity: active.has(s.key) ? (dim ? 0.18 : 1) : 0, transition: 'opacity .3s', cursor: onSelect ? 'pointer' : 'default' }} onClick={() => onSelect?.(highlightKey === s.key ? null : s.key)} />;
            })}
          </g>
          {weeks.map((w, j) => (j % Math.ceil(weeks.length / (width < 560 ? 4 : 8)) === 0 || j === weeks.length - 1) && (
            <text key={w} x={x(j)} y={height - 8} textAnchor={j === 0 ? 'start' : j === weeks.length - 1 ? 'end' : 'middle'} fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{weekLabel(w)}</text>
          ))}
          {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={pad.t} y2={height - pad.b} stroke={INK.text2} strokeOpacity={0.5} strokeDasharray="3 3" />}
        </svg>
      </div>
      <Legend items={series.map((s, i) => ({ key: s.key, label: s.label, color: SERIES_COLORS[i % SERIES_COLORS.length] }))} active={active}
        onToggle={k => setActive(a => { const n = new Set(a); if (n.has(k)) { if (n.size > 1) n.delete(k); } else n.add(k); return n; })} />
      {hover && (
        <Tooltip x={hover.x} y={hover.y} bounds={{ width, height }}>
          <div style={{ fontFamily: INK.mono, fontSize: 10, color: INK.text3, marginBottom: 4 }}>WEEK OF {weekLabel(weeks[hover.i]).toUpperCase()}</div>
          {series.filter(s => active.has(s.key)).map(s => (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}><span style={{ color: SERIES_COLORS[series.indexOf(s) % SERIES_COLORS.length] }}>{s.label}</span><b>{fmt(s.values[hover.i])}</b></div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

// ── 5. Line / area chart (productivity, AI adoption) ────────────────────────
export function AreaLines({ weeks, series, cumulative = false, height = 260, highlightKey, progress }: { weeks: string[]; series: { key: string; label: string; values: number[]; kind?: DataKind }[]; cumulative?: boolean; height?: number; highlightKey?: string; progress?: number }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const pr = useReveal(inView, 1500);
  const p = progress ?? pr;
  const [active, setActive] = useState<Set<string>>(() => new Set(series.map(s => s.key)));
  const [hover, setHover] = useState<{ i: number; x: number; y: number } | null>(null);
  const width = Math.max(320, size.width);
  const pad = { l: 40, r: 10, t: 14, b: 26 };
  const prepared = useMemo(() => series.map(s => {
    if (!cumulative) return s.values;
    let acc = 0; return s.values.map(v => (acc += v));
  }), [series, cumulative]);
  const flat = useMemo(() => prepared.flatMap(v => v), [prepared]);
  const tw = useTween(flat, 800);
  const m = weeks.length;
  const rows = series.map((_, i) => tw.slice(i * m, (i + 1) * m));
  const maxV = niceMax(Math.max(1, ...series.map((s, i) => (active.has(s.key) ? Math.max(...rows[i]) : 0))));
  const x = linear([0, Math.max(1, m - 1)], [pad.l, width - pad.r]);
  const y = linear([0, maxV], [height - pad.b, pad.t]);
  const totalAll = flat.reduce((a, b) => a + b, 0);
  if (!totalAll) return <div ref={box}><EmptyNote>Nothing recorded in this period.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block' }}
          onMouseMove={e => { const r = e.currentTarget.getBoundingClientRect(); const px = e.clientX - r.left; const i = Math.round(x.invert(px)); setHover({ i: Math.max(0, Math.min(m - 1, i)), x: px, y: e.clientY - r.top }); }}
          onMouseLeave={() => setHover(null)}>
          <defs>
            {series.map((s, i) => (
              <linearGradient key={s.key} id={`al-${s.key}`} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={SERIES_COLORS[i % SERIES_COLORS.length]} stopOpacity={0} />
              </linearGradient>
            ))}
            <clipPath id={`al-clip-${cumulative ? 'c' : 'w'}-${height}`}><rect x={0} y={0} width={pad.l + (width - pad.l - pad.r) * p} height={height} /></clipPath>
          </defs>
          {ticks(maxV, 4).map(t => (
            <g key={t}>
              <line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={INK.border} />
              <text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text>
            </g>
          ))}
          <g clipPath={`url(#al-clip-${cumulative ? 'c' : 'w'}-${height})`}>
            {series.map((s, i) => {
              if (!active.has(s.key)) return null;
              const pts = weeks.map((_, j) => ({ x: x(j), y: y(rows[i][j]) }));
              const base = weeks.map((_, j) => ({ x: x(j), y: y(0) }));
              const hi = !highlightKey || highlightKey === s.key;
              return (
                <g key={s.key} style={{ opacity: hi ? 1 : 0.35 }}>
                  <path d={bandPath(pts, base)} fill={`url(#al-${s.key})`} />
                  <path d={smoothPath(pts)} fill="none" stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={hi ? 2.4 : 1.6} strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${SERIES_COLORS[i % SERIES_COLORS.length]}66)` }} />
                  {hover && <circle cx={x(hover.i)} cy={y(rows[i][hover.i])} r={4} fill={INK.bg} stroke={SERIES_COLORS[i % SERIES_COLORS.length]} strokeWidth={2} />}
                </g>
              );
            })}
          </g>
          {weeks.map((w, j) => (j % Math.ceil(m / (width < 560 ? 4 : 8)) === 0 || j === m - 1) && (
            <text key={w} x={x(j)} y={height - 8} textAnchor={j === 0 ? 'start' : j === m - 1 ? 'end' : 'middle'} fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{weekLabel(w)}</text>
          ))}
          {hover && <line x1={x(hover.i)} x2={x(hover.i)} y1={pad.t} y2={height - pad.b} stroke={INK.text2} strokeOpacity={0.5} strokeDasharray="3 3" />}
        </svg>
      </div>
      <Legend items={series.map((s, i) => ({ key: s.key, label: s.label, color: SERIES_COLORS[i % SERIES_COLORS.length] }))} active={active}
        onToggle={k => setActive(a => { const n = new Set(a); if (n.has(k)) { if (n.size > 1) n.delete(k); } else n.add(k); return n; })} />
      {hover && (
        <Tooltip x={hover.x} y={hover.y} bounds={{ width, height }}>
          <div style={{ fontFamily: INK.mono, fontSize: 10, color: INK.text3, marginBottom: 4 }}>WEEK OF {weekLabel(weeks[hover.i]).toUpperCase()}{cumulative ? ' · CUMULATIVE' : ''}</div>
          {series.map((s, i) => active.has(s.key) && (
            <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}><span style={{ color: SERIES_COLORS[i % SERIES_COLORS.length] }}>{s.label}</span><b>{Math.round(prepared[i][hover.i] * 10) / 10}</b></div>
          ))}
        </Tooltip>
      )}
    </div>
  );
}

// ── 6. Force-directed network ───────────────────────────────────────────────
type NetNode = { id: string; type: 'founder' | 'idea' | 'domain' | 'tool'; label: string; size: number; stage?: string };
type NetLink = { source: string; target: string; kind: string };
const NODE_COLORS: Record<NetNode['type'], string> = { founder: INK.violetHi, idea: INK.lime, domain: INK.sky, tool: INK.rose };

export function NetworkGraph({ nodes, links }: { nodes: NetNode[]; links: NetLink[] }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const width = Math.max(320, size.width), height = size.width < 560 ? 380 : 480;
  const [filter, setFilter] = useState<Set<NetNode['type']>>(() => new Set(['founder', 'idea', 'domain', 'tool']));
  const [selected, setSelected] = useState<string | null>(null);
  const [, force] = useState(0);
  const sim = useRef<{ nodes: FNode[]; links: FLink[]; alpha: number } | null>(null);
  const drag = useRef<{ node: FNode; dx: number; dy: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // (Re)build the simulation when data / filter / size changes.
  useEffect(() => {
    const keep = new Set(nodes.filter(n => filter.has(n.type)).map(n => n.id));
    const fn: FNode[] = nodes.filter(n => keep.has(n.id)).map((n, i) => {
      const prev = sim.current?.nodes.find(p => p.id === n.id);
      const a = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const r = n.type === 'founder' ? 5 + n.size * 1.1 : n.type === 'idea' ? 3 + n.size * 1.1 : 7 + n.size * 1.4;
      return { id: n.id, x: prev?.x ?? width / 2 + Math.cos(a) * width * 0.4, y: prev?.y ?? height / 2 + Math.sin(a) * height * 0.4, vx: 0, vy: 0, r, type: n.type, label: n.label, stage: n.stage };
    });
    const byId = new Map(fn.map(n => [n.id, n]));
    const fl: FLink[] = links.filter(l => byId.has(l.source) && byId.has(l.target)).map(l => ({ source: byId.get(l.source)!, target: byId.get(l.target)!, strength: l.kind === 'owns' ? 1.2 : l.kind === 'comments' ? 0.5 : 0.8 }));
    sim.current = { nodes: fn, links: fl, alpha: 1 };
  }, [nodes, links, filter, width, height]);

  // Animation loop; keeps a gentle idle drift so the graph feels alive.
  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const reduced = prefersReducedMotion();
    const tick = () => {
      const s = sim.current;
      if (s) {
        s.alpha = Math.max(reduced ? 0 : 0.02, s.alpha * 0.985);
        if (!reduced || s.alpha > 0.02) stepForces(s.nodes, s.links, width, height, s.alpha);
        force(v => v + 1);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, width, height]);

  const s = sim.current;
  const neighbours = useMemo(() => {
    if (!selected || !s) return null;
    const set = new Set<string>([selected]);
    for (const l of s.links) { if (l.source.id === selected) set.add(l.target.id); if (l.target.id === selected) set.add(l.source.id); }
    return set;
  }, [selected, s]);
  const counts = useMemo(() => ({ founder: nodes.filter(n => n.type === 'founder').length, idea: nodes.filter(n => n.type === 'idea').length, domain: nodes.filter(n => n.type === 'domain').length, tool: nodes.filter(n => n.type === 'tool').length }), [nodes]);

  const toLocal = (e: React.PointerEvent) => { const r = svgRef.current!.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };

  if (!nodes.length) return <div ref={box}><EmptyNote>The network appears once members start ideas, follow and comment.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg ref={svgRef} width={width} height={height} style={{ display: 'block', borderRadius: 14, background: 'radial-gradient(ellipse at 50% 40%, rgba(124,58,237,.10), transparent 60%)', touchAction: 'none', cursor: drag.current ? 'grabbing' : 'default' }}
          onPointerMove={e => { const d = drag.current; if (!d) return; const p = toLocal(e); d.node.x = p.x - d.dx; d.node.y = p.y - d.dy; if (sim.current) sim.current.alpha = Math.max(sim.current.alpha, 0.15); }}
          onPointerUp={() => { if (drag.current) { drag.current.node.fixed = false; drag.current = null; } }}
          onPointerLeave={() => { if (drag.current) { drag.current.node.fixed = false; drag.current = null; } }}
          onClick={e => { if (e.target === e.currentTarget) setSelected(null); }}>
          {s?.links.map((l, i) => {
            const dim = neighbours && !(neighbours.has(l.source.id) && neighbours.has(l.target.id) && (l.source.id === selected || l.target.id === selected));
            return <line key={i} x1={l.source.x} y1={l.source.y} x2={l.target.x} y2={l.target.y} stroke={INK.text2} strokeOpacity={dim ? 0.05 : 0.22} strokeWidth={dim ? 0.6 : 1} />;
          })}
          {s?.nodes.map(n => {
            const t = n.type as NetNode['type'];
            const dim = neighbours && !neighbours.has(n.id);
            const isSel = selected === n.id;
            return (
              <g key={n.id} transform={`translate(${n.x},${n.y})`} style={{ opacity: dim ? 0.18 : 1, transition: 'opacity .25s', cursor: 'grab' }}
                onPointerDown={e => { e.stopPropagation(); const p = toLocal(e); n.fixed = true; drag.current = { node: n, dx: p.x - n.x, dy: p.y - n.y }; (e.currentTarget as SVGGElement).setPointerCapture?.(e.pointerId); }}
                onClick={e => { e.stopPropagation(); setSelected(sel => (sel === n.id ? null : n.id)); }}>
                {(isSel || t === 'tool') && <circle r={n.r + 6} fill={NODE_COLORS[t]} fillOpacity={0.12} className="ins-pulse-ring" />}
                <circle r={n.r} fill={t === 'founder' ? INK.bg2 : NODE_COLORS[t]} stroke={NODE_COLORS[t]} strokeWidth={t === 'founder' ? 2 : 1} style={{ filter: `drop-shadow(0 0 ${isSel ? 14 : 6}px ${NODE_COLORS[t]}88)` }} />
                {(t === 'domain' || t === 'tool' || isSel || (neighbours?.has(n.id) ?? false) || (t === 'idea' && n.r > 9)) && (
                  <text y={n.r + 11} textAnchor="middle" fontFamily={INK.ui} fontSize={t === 'idea' ? 10 : 11} fontWeight={t === 'idea' ? 500 : 700} fill={t === 'idea' ? INK.text2 : INK.text} style={{ pointerEvents: 'none', paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 3 }}>{String(n.label).length > 22 ? String(n.label).slice(0, 21) + '…' : String(n.label)}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, alignItems: 'center' }}>
        {(['founder', 'idea', 'domain', 'tool'] as NetNode['type'][]).map(t => {
          const on = filter.has(t);
          return (
            <button key={t} onClick={() => setFilter(f => { const n = new Set(f); if (n.has(t)) { if (n.size > 1) n.delete(t); } else n.add(t); return n; })}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, border: `1px solid ${on ? NODE_COLORS[t] + '88' : INK.border}`, background: on ? NODE_COLORS[t] + '18' : 'transparent', color: on ? INK.text : INK.text3, fontFamily: INK.mono, fontSize: 11, letterSpacing: 1, textTransform: 'uppercase', cursor: 'pointer' }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: NODE_COLORS[t] }} />{t === 'tool' ? 'AI tools' : t === 'founder' ? 'Founders' : t === 'idea' ? 'Ideas' : 'Domains'} · {counts[t]}
            </button>
          );
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: INK.text3 }}>Drag nodes · click to focus · founders are anonymised</span>
      </div>
    </div>
  );
}
