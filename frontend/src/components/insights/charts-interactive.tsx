import { useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { INK, SERIES_COLORS, useSize, useInView, useReveal, useTween, Tooltip, EmptyNote, prefersReducedMotion } from './shared';
import { linear, niceMax, ticks, smoothPath, bandPath, fmt, fmtShort, weekLabel } from '@/lib/viz';

// Interactive chart kit for the market-pulse page. Each chart has one
// distinctive form and at least one real interaction (brush, hover, click,
// toggle, play). Everything is inline SVG; no dependencies.

const SEASON = (c: string, a: number) => `${c}${Math.round(a * 255).toString(16).padStart(2, '0')}`;

// ── 1. Brushable timeline ───────────────────────────────────────────────────
// Area chart with a draggable window. onBrush receives [startIdx, endIdx]
// (inclusive); other charts re-aggregate against it.
export function BrushTimeline({ weeks, series, brush, onBrush, height = 240 }: { weeks: string[]; series: { key: string; label: string; values: number[] }[]; brush: [number, number]; onBrush: (b: [number, number]) => void; height?: number }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1400);
  const [hover, setHover] = useState<number | null>(null);
  const drag = useRef<{ mode: 'move' | 'l' | 'r'; startX: number; b0: [number, number] } | null>(null);
  const width = Math.max(320, size.width);
  const pad = { l: 40, r: 10, t: 12, b: 26 };
  const m = weeks.length;
  const tw = useTween(series.flatMap(s => s.values), 700);
  const rows = series.map((_, i) => tw.slice(i * m, (i + 1) * m));
  const maxV = niceMax(Math.max(1, ...rows.flat()));
  const x = linear([0, Math.max(1, m - 1)], [pad.l, width - pad.r]);
  const y = linear([0, maxV], [height - pad.b, pad.t]);
  const idxAt = (px: number) => Math.max(0, Math.min(m - 1, Math.round(x.invert(px))));
  const onDown = (e: React.PointerEvent<SVGRectElement>, mode: 'move' | 'l' | 'r') => { e.stopPropagation(); (e.currentTarget as Element).setPointerCapture?.(e.pointerId); const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); drag.current = { mode, startX: e.clientX - r.left, b0: brush }; };
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect(); const px = e.clientX - r.left;
    setHover(idxAt(px));
    const d = drag.current; if (!d) return;
    const delta = idxAt(px) - idxAt(d.startX);
    let [a, b] = d.b0;
    if (d.mode === 'move') { const span = b - a; a = Math.max(0, Math.min(m - 1 - span, a + delta)); b = a + span; }
    else if (d.mode === 'l') a = Math.max(0, Math.min(b, a + delta));
    else b = Math.min(m - 1, Math.max(a, b + delta));
    if (a !== brush[0] || b !== brush[1]) onBrush([a, b]);
  };
  const end = () => { drag.current = null; };
  if (!m) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block', touchAction: 'none' }} onPointerMove={onMove} onPointerUp={end} onPointerLeave={() => { end(); setHover(null); }}
          onClick={e => { if (drag.current) return; const r = e.currentTarget.getBoundingClientRect(); const i = idxAt(e.clientX - r.left); onBrush([Math.max(0, i - 2), Math.min(m - 1, i + 2)]); }}>
          <defs>
            {series.map((s, i) => <linearGradient key={s.key} id={`bt-${s.key}`} x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor={SERIES_COLORS[i]} stopOpacity={0.4} /><stop offset="100%" stopColor={SERIES_COLORS[i]} stopOpacity={0} /></linearGradient>)}
            <clipPath id="bt-clip"><rect x={0} y={0} width={pad.l + (width - pad.l - pad.r) * p} height={height} /></clipPath>
          </defs>
          {ticks(maxV, 4).map(t => <g key={t}><line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={INK.border} /><text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text></g>)}
          <g clipPath="url(#bt-clip)">
            {series.map((s, i) => { const pts = weeks.map((_, j) => ({ x: x(j), y: y(rows[i][j]) })); const base = weeks.map((_, j) => ({ x: x(j), y: y(0) })); return <g key={s.key}><path d={bandPath(pts, base)} fill={`url(#bt-${s.key})`} /><path d={smoothPath(pts)} fill="none" stroke={SERIES_COLORS[i]} strokeWidth={2.2} style={{ filter: `drop-shadow(0 0 6px ${SERIES_COLORS[i]}66)` }} /></g>; })}
          </g>
          {/* Dim outside the brush */}
          <rect x={pad.l} y={pad.t} width={Math.max(0, x(brush[0]) - pad.l)} height={height - pad.t - pad.b} fill={INK.bg} fillOpacity={0.55} />
          <rect x={x(brush[1])} y={pad.t} width={Math.max(0, width - pad.r - x(brush[1]))} height={height - pad.t - pad.b} fill={INK.bg} fillOpacity={0.55} />
          <rect x={x(brush[0])} y={pad.t} width={Math.max(2, x(brush[1]) - x(brush[0]))} height={height - pad.t - pad.b} fill={INK.lime} fillOpacity={0.06} stroke={INK.lime} strokeOpacity={0.6} strokeDasharray="4 3" style={{ cursor: 'grab' }} onPointerDown={e => onDown(e, 'move')} />
          {[['l', brush[0]], ['r', brush[1]]].map(([mode, i]) => (
            <g key={String(mode)}>
              <rect x={x(Number(i)) - 6} y={pad.t} width={12} height={height - pad.t - pad.b} fill="transparent" style={{ cursor: 'ew-resize' }} onPointerDown={e => onDown(e, mode as 'l' | 'r')} />
              <rect x={x(Number(i)) - 2} y={(height - pad.b + pad.t) / 2 - 14} width={4} height={28} rx={2} fill={INK.lime} />
            </g>
          ))}
          {weeks.map((w, j) => (j % Math.ceil(m / (width < 560 ? 4 : 8)) === 0 || j === m - 1) && <text key={w} x={x(j)} y={height - 8} textAnchor={j === 0 ? 'start' : j === m - 1 ? 'end' : 'middle'} fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{weekLabel(w)}</text>)}
          {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke={INK.text2} strokeOpacity={0.5} strokeDasharray="3 3" style={{ pointerEvents: 'none' }} />}
        </svg>
      </div>
      {hover !== null && <Tooltip x={x(hover)} y={pad.t + 10} bounds={{ width, height }}><div style={{ fontFamily: INK.mono, fontSize: 10, color: INK.text3 }}>WEEK OF {weekLabel(weeks[hover]).toUpperCase()}</div>{series.map((s, i) => <div key={s.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}><span style={{ color: SERIES_COLORS[i] }}>{s.label}</span><b>{fmt(s.values[hover])}</b></div>)}</Tooltip>}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontFamily: INK.mono, fontSize: 10, color: INK.text3, letterSpacing: 1 }}>
        <span>DRAG THE WINDOW OR ITS HANDLES · CLICK TO JUMP</span>
        <span style={{ color: INK.lime }}>{weekLabel(weeks[brush[0]]).toUpperCase()} → {weekLabel(weeks[brush[1]]).toUpperCase()} · {brush[1] - brush[0] + 1} WK</span>
      </div>
    </div>
  );
}

// ── 2. Radial bars (polar) ──────────────────────────────────────────────────
export function RadialBars({ items, unit, color = INK.lime, center }: { items: { label: string; value: number }[]; unit?: string; color?: string; center?: ReactNode }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1400);
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(240, Math.min(size.width || 320, 360)), h = w;
  const cx = w / 2, cy = h / 2, r0 = w * 0.2, r1 = w * 0.4;
  const max = Math.max(1, ...items.map(i => i.value));
  const n = items.length || 1, step = (Math.PI * 2) / n, gap = step * 0.14;
  const arc = (a0: number, a1: number, ri: number, ro: number) => { const sx = (a: number, r: number) => [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; const [x0, y0] = sx(a0, ro), [x1, y1] = sx(a1, ro), [x2, y2] = sx(a1, ri), [x3, y3] = sx(a0, ri); const large = a1 - a0 > Math.PI ? 1 : 0; return `M${x0},${y0} A${ro},${ro} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${ri},${ri} 0 ${large} 0 ${x3},${y3} Z`; };
  if (!items.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
      <div ref={ref} style={{ position: 'relative' }}>
        <svg width={w} height={h} style={{ overflow: 'visible' }} onMouseLeave={() => setHover(null)}>
          {[0.25, 0.5, 0.75, 1].map(t => <circle key={t} cx={cx} cy={cy} r={r0 + (r1 - r0) * t} fill="none" stroke={INK.border} strokeDasharray="2 4" />)}
          {items.map((it, i) => { const a0 = -Math.PI / 2 + i * step + gap / 2, a1 = a0 + step - gap; const ro = r0 + (r1 - r0) * (it.value / max) * p; const on = hover === null || hover === i; return (
            <g key={it.label} onMouseEnter={() => setHover(i)}>
              <path d={arc(a0, a1, r0, Math.max(r0 + 1, ro))} fill={color} fillOpacity={on ? 0.75 : 0.25} stroke={color} strokeOpacity={on ? 1 : 0.3} style={{ transition: 'fill-opacity .2s', filter: on ? `drop-shadow(0 0 8px ${color}66)` : 'none' }} />
              <text x={cx + Math.cos((a0 + a1) / 2) * (r1 + 12)} y={cy + Math.sin((a0 + a1) / 2) * (r1 + 12)} dy="0.35em" textAnchor="middle" fontFamily={INK.mono} fontSize={9} fill={INK.text3}>{it.label}</text>
            </g>); })}
          <foreignObject x={cx - r0 + 4} y={cy - r0 + 4} width={r0 * 2 - 8} height={r0 * 2 - 8}><div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: INK.ui, color: INK.text }}>
            {hover !== null ? <><div style={{ fontSize: 24, fontWeight: 800 }}>{unit === '%' ? `${items[hover].value}%` : fmt(items[hover].value)}</div><div style={{ fontFamily: INK.mono, fontSize: 9, color: INK.text3, letterSpacing: 1 }}>{items[hover].label.toUpperCase()}</div></> : center}
          </div></foreignObject>
        </svg>
      </div>
    </div>
  );
}

// ── 3. Radar / polar area ───────────────────────────────────────────────────
export function Radar({ items, color = INK.sky, compare }: { items: { label: string; value: number }[]; color?: string; compare?: { label: string; value: number }[] }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1300);
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(240, Math.min(size.width || 320, 340)), h = w;
  const cx = w / 2, cy = h / 2, R = w * 0.38;
  const max = Math.max(1, ...items.map(i => i.value), ...(compare ?? []).map(i => i.value));
  const n = items.length || 1;
  const pt = (i: number, v: number) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; const r = R * (v / max) * p; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r] as [number, number]; };
  const poly = (vals: number[]) => vals.map((v, i) => pt(i, v)).map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ') + ' Z';
  if (!items.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ display: 'flex', justifyContent: 'center' }}>
      <div ref={ref}>
        <svg width={w} height={h} onMouseLeave={() => setHover(null)}>
          {[0.25, 0.5, 0.75, 1].map(t => <polygon key={t} points={items.map((_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return `${cx + Math.cos(a) * R * t},${cy + Math.sin(a) * R * t}`; }).join(' ')} fill="none" stroke={INK.border} />)}
          {items.map((it, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2; return <g key={it.label} onMouseEnter={() => setHover(i)}><line x1={cx} y1={cy} x2={cx + Math.cos(a) * R} y2={cy + Math.sin(a) * R} stroke={INK.border} /><text x={cx + Math.cos(a) * (R + 16)} y={cy + Math.sin(a) * (R + 16)} dy="0.35em" textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={hover === i ? INK.text : INK.text3} fontWeight={hover === i ? 700 : 500}>{it.label}</text></g>; })}
          {compare && <path d={poly(compare.map(c => c.value))} fill={INK.violetHi} fillOpacity={0.12} stroke={INK.violetHi} strokeDasharray="3 3" />}
          <path d={poly(items.map(i => i.value))} fill={color} fillOpacity={0.25} stroke={color} strokeWidth={2} style={{ filter: `drop-shadow(0 0 10px ${color}55)` }} />
          {items.map((it, i) => { const [x, y] = pt(i, it.value); return <g key={it.label}><circle cx={x} cy={y} r={hover === i ? 6 : 3.5} fill={INK.bg} stroke={color} strokeWidth={2} onMouseEnter={() => setHover(i)} />{hover === i && <text x={x} y={y - 12} textAnchor="middle" fontFamily={INK.mono} fontSize={11} fill={INK.text} style={{ paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 3 }}>{fmt(it.value)}</text>}</g>; })}
        </svg>
      </div>
    </div>
  );
}

// ── 4. Lollipop with linear/log toggle ──────────────────────────────────────
export function Lollipop({ items, color = INK.amber, height = 200 }: { items: { label: string; value: number }[]; color?: string; height?: number }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1200);
  const [log, setLog] = useState(true);
  const [hover, setHover] = useState<number | null>(null);
  const width = Math.max(300, size.width);
  const pad = { l: 44, r: 12, t: 16, b: 28 };
  const vals = items.map(i => i.value);
  const max = Math.max(1, ...vals);
  const yv = (v: number) => (log ? Math.log10(v + 1) / Math.log10(max + 1) : v / max);
  const y = (v: number) => height - pad.b - (height - pad.t - pad.b) * yv(v) * p;
  const n = items.length || 1, x = (i: number) => pad.l + ((width - pad.l - pad.r) * (i + 0.5)) / n;
  if (!items.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, marginBottom: 4 }}>
        {(['linear', 'log'] as const).map(mode => <button key={mode} onClick={() => setLog(mode === 'log')} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, padding: '3px 9px', borderRadius: 999, border: `1px solid ${(mode === 'log') === log ? INK.lime : INK.border}`, background: (mode === 'log') === log ? INK.lime : 'transparent', color: (mode === 'log') === log ? INK.bg : INK.text3, cursor: 'pointer' }}>{mode.toUpperCase()}</button>)}
      </div>
      <div ref={ref}>
        <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
          {(log ? [1, 10, 100, 1000, 10000].filter(t => t <= max * 1.2) : ticks(niceMax(max), 4)).map(t => <g key={t}><line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={INK.border} /><text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text></g>)}
          {items.map((it, i) => <g key={it.label} onMouseEnter={() => setHover(i)}>
            <line x1={x(i)} x2={x(i)} y1={height - pad.b} y2={y(it.value)} stroke={color} strokeWidth={hover === i ? 3 : 2} strokeOpacity={0.7} style={{ transition: 'all .3s' }} />
            <circle cx={x(i)} cy={y(it.value)} r={hover === i ? 9 : 6} fill={color} style={{ filter: `drop-shadow(0 0 8px ${color}88)`, transition: 'all .2s' }} />
            <text x={x(i)} y={y(it.value) - 14} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text} style={{ opacity: hover === i || hover === null ? 1 : 0.3 }}>{fmt(it.value)}</text>
            <text x={x(i)} y={height - 8} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{it.label}</text>
          </g>)}
        </svg>
      </div>
    </div>
  );
}

// ── 5. Beeswarm / log scatter with click-through ────────────────────────────
export function Beeswarm({ points, xLabel, yLabel, height = 300, colorKey, labelTop = 0 }: { points: { label: string; x: number; y: number; href?: string; tag?: string; meta?: string }[]; xLabel: string; yLabel: string; height?: number; colorKey?: (tag?: string) => string; labelTop?: number }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1300);
  const [hover, setHover] = useState<number | null>(null);
  const width = Math.max(320, size.width);
  const pad = { l: 46, r: 16, t: 14, b: 36 };
  const lx = (v: number) => Math.log10(v + 1), ly = (v: number) => Math.log10(v + 1);
  // Axes fit the data (log), with a little headroom, so a tight cluster of
  // leaders fills the box instead of hugging one corner.
  const xs = points.map(pt => lx(pt.x)), ys = points.map(pt => ly(pt.y));
  const maxX = Math.max(1, ...xs), maxY = Math.max(1, ...ys);
  const minX = points.length ? Math.max(0, Math.min(...xs) - (maxX - Math.min(...xs)) * 0.08) : 0;
  const minY = points.length ? Math.max(0, Math.min(...ys) - (maxY - Math.min(...ys)) * 0.1) : 0;
  const x = linear([minX, maxX + (maxX - minX) * 0.08], [pad.l, width - pad.r]), y = linear([minY, maxY + (maxY - minY) * 0.12], [height - pad.b, pad.t]);
  const logTicks = (lo: number, hi: number) => { const out: number[] = []; for (const base of [1, 10, 100, 1000, 10000, 100000, 1000000]) for (const m of [1, 2, 5]) { const v = base * m; const l = lx(v); if (l >= lo && l <= hi) out.push(v); } return out.length >= 3 ? out.filter((_, i, a) => a.length <= 6 || i % Math.ceil(a.length / 6) === 0) : out; };
  const xTicks = logTicks(minX, maxX + (maxX - minX) * 0.08), yTicks = logTicks(minY, maxY + (maxY - minY) * 0.12);
  const tagColors = useMemo(() => { const tags = [...new Set(points.map(pt => pt.tag ?? ''))]; return new Map(tags.map((t, i) => [t, SERIES_COLORS[i % SERIES_COLORS.length]])); }, [points]);
  const labelled = useMemo(() => new Set([...points].sort((a, b) => b.x - a.x).slice(0, labelTop).map(pt => pt.label)), [points, labelTop]);
  if (!points.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
          {xTicks.map(t => <g key={`x${t}`}><line x1={x(lx(t))} x2={x(lx(t))} y1={pad.t} y2={height - pad.b} stroke={INK.border} /><text x={x(lx(t))} y={height - pad.b + 14} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text></g>)}
          {yTicks.map(t => <g key={`y${t}`}><line x1={pad.l} x2={width - pad.r} y1={y(ly(t))} y2={y(ly(t))} stroke={INK.border} /><text x={pad.l - 8} y={y(ly(t))} dy="0.35em" textAnchor="end" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text></g>)}
          <text x={(pad.l + width - pad.r) / 2} y={height - 4} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text2}>{xLabel} (log) →</text>
          <text transform={`translate(12,${(pad.t + height - pad.b) / 2}) rotate(-90)`} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text2}>{yLabel} (log) →</text>
          {points.map((pt, i) => { const c = colorKey ? colorKey(pt.tag) : tagColors.get(pt.tag ?? '') ?? INK.lime; const on = hover === null || hover === i; return (
            <g key={`${pt.label}-${i}`} style={{ cursor: pt.href ? 'pointer' : 'default', opacity: on ? 1 : 0.25, transition: 'opacity .2s' }} onMouseEnter={() => setHover(i)} onClick={() => { if (pt.href) window.open(pt.href, '_blank', 'noopener'); }}>
              <circle cx={x(lx(pt.x))} cy={y(ly(pt.y))} r={(hover === i ? 12 : 8) * p} fill={c} fillOpacity={0.45} stroke={c} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 8px ${c}77)`, transition: 'r .2s' }} />
              {labelled.has(pt.label) && <text x={x(lx(pt.x))} y={y(ly(pt.y)) + (i % 2 ? 22 : -13)} textAnchor="middle" fontFamily={INK.ui} fontSize={10.5} fontWeight={600} fill={INK.text2} style={{ paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 3, pointerEvents: 'none' }}>{pt.label.length > 28 ? pt.label.slice(0, 27) + '…' : pt.label}</text>}
            </g>); })}
        </svg>
      </div>
      {hover !== null && <Tooltip x={x(lx(points[hover].x))} y={y(ly(points[hover].y))} bounds={{ width, height }}>
        <div style={{ fontWeight: 700, marginBottom: 2 }}>{points[hover].label}</div>
        <div style={{ fontFamily: INK.mono, fontSize: 10, color: INK.text3 }}>{xLabel} {fmt(points[hover].x)} · {yLabel} {fmt(points[hover].y)}{points[hover].meta ? ` · ${points[hover].meta}` : ''}</div>
        {points[hover].href && <div style={{ fontFamily: INK.mono, fontSize: 10, color: INK.lime, marginTop: 2 }}>CLICK TO OPEN ↗</div>}
      </Tooltip>}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px', marginTop: 8 }}>{[...tagColors.entries()].filter(([t]) => t).map(([t, c]) => <span key={t} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: INK.mono, fontSize: 10, color: INK.text3 }}><span style={{ width: 8, height: 8, borderRadius: 999, background: c }} />{t}</span>)}</div>
    </div>
  );
}

// ── 6. Tag cloud (sized chips, linkable) ────────────────────────────────────
export function TagCloud({ items, color = INK.rose, minSize = 11, maxSize = 24 }: { items: { label: string; value: number; href?: string; meta?: string }[]; color?: string; minSize?: number; maxSize?: number }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1200);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...items.map(i => i.value)), min = Math.min(...items.map(i => i.value));
  if (!items.length) return <EmptyNote>No data.</EmptyNote>;
  return (
    <div ref={ref} style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 10px', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
      {items.map((it, i) => { const t = max === min ? 1 : (it.value - min) / (max - min); const fs = minSize + (maxSize - minSize) * Math.sqrt(t); const el = (
        <span onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={it.meta} style={{ display: 'inline-block', fontFamily: INK.ui, fontWeight: 600 + Math.round(t * 200), fontSize: fs, lineHeight: 1.1, color: hover === i ? INK.text : SEASON(color, 0.55 + 0.45 * t), padding: '4px 10px', borderRadius: 999, border: `1px solid ${SEASON(color, 0.15 + 0.4 * t)}`, background: hover === i ? SEASON(color, 0.2) : 'transparent', transform: `scale(${0.6 + 0.4 * p})`, opacity: p, transition: 'all .25s', cursor: it.href ? 'pointer' : 'default' }}>
          {it.label} <span style={{ fontFamily: INK.mono, fontSize: Math.max(9, fs * 0.55), color: INK.text3 }}>{fmt(it.value)}</span>
        </span>);
        return it.href ? <a key={`${it.label}-${i}`} href={it.href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{el}</a> : <span key={`${it.label}-${i}`}>{el}</span>; })}
    </div>
  );
}

// ── 7. Calendar-style heat strip ────────────────────────────────────────────
export function HeatStrip({ cells, color = INK.amber, labelEvery = 2, title }: { cells: { label: string; value: number }[]; color?: string; labelEvery?: number; title?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1200);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...cells.map(c => c.value)), min = Math.min(...cells.map(c => c.value));
  if (!cells.length) return <EmptyNote>No data.</EmptyNote>;
  return (
    <div ref={ref}>
      {title && <div style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: INK.text3, marginBottom: 6 }}>{title.toUpperCase()}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cells.length}, 1fr)`, gap: 4 }}>
        {cells.map((c, i) => { const t = max === min ? 0.6 : (c.value - min) / (max - min); return (
          <div key={`${c.label}-${i}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ position: 'relative' }}>
            <div style={{ height: 34, borderRadius: 6, background: SEASON(color, (0.12 + 0.78 * t) * p), border: `1px solid ${hover === i ? INK.text : 'transparent'}`, transition: 'background .4s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: INK.mono, fontSize: 9, color: t > 0.5 ? INK.bg : INK.text2 }}>{hover === i || cells.length <= 8 ? fmtShort(c.value) : ''}</div>
            {(i % labelEvery === 0 || i === cells.length - 1) && <div style={{ fontFamily: INK.mono, fontSize: 9, color: INK.text3, marginTop: 4, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</div>}
          </div>); })}
      </div>
    </div>
  );
}

// ── 8. Donut with hover ─────────────────────────────────────────────────────
export function Donut({ items, center }: { items: { label: string; value: number }[]; center?: ReactNode }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1300);
  const [hover, setHover] = useState<number | null>(null);
  const w = Math.max(220, Math.min(size.width || 300, 300)), cx = w / 2, cy = w / 2, R = w * 0.42, r = w * 0.27;
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  let acc = -Math.PI / 2;
  const segs = items.map((it, i) => { const a0 = acc, a1 = acc + (it.value / total) * Math.PI * 2 * p; acc = a1; return { ...it, a0, a1, color: SERIES_COLORS[i % SERIES_COLORS.length] }; });
  const arc = (a0: number, a1: number, ri: number, ro: number) => { const s = (a: number, rr: number) => [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]; const [x0, y0] = s(a0, ro), [x1, y1] = s(a1, ro), [x2, y2] = s(a1, ri), [x3, y3] = s(a0, ri); const large = a1 - a0 > Math.PI ? 1 : 0; return `M${x0},${y0} A${ro},${ro} 0 ${large} 1 ${x1},${y1} L${x2},${y2} A${ri},${ri} 0 ${large} 0 ${x3},${y3} Z`; };
  if (!items.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
      <div ref={ref}>
        <svg width={w} height={w} onMouseLeave={() => setHover(null)}>
          {segs.map((sg, i) => <path key={sg.label} d={arc(sg.a0, sg.a1, r, hover === i ? R + 6 : R)} fill={sg.color} fillOpacity={hover === null || hover === i ? 0.85 : 0.3} stroke={INK.bg} strokeWidth={2} onMouseEnter={() => setHover(i)} style={{ transition: 'all .2s', filter: hover === i ? `drop-shadow(0 0 10px ${sg.color}88)` : 'none' }} />)}
          <foreignObject x={cx - r + 6} y={cy - r + 6} width={r * 2 - 12} height={r * 2 - 12}><div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: INK.text, fontFamily: INK.ui }}>
            {hover !== null ? <><div style={{ fontSize: 24, fontWeight: 800 }}>{Math.round((segs[hover].value / total) * 100)}%</div><div style={{ fontFamily: INK.mono, fontSize: 9, letterSpacing: 1, color: INK.text3 }}>{segs[hover].label.toUpperCase()}</div></> : center}
          </div></foreignObject>
        </svg>
      </div>
      <div style={{ display: 'grid', gap: 6, minWidth: 120 }}>{segs.map((sg, i) => <button key={sg.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', padding: 0, cursor: 'default', fontFamily: INK.ui, fontSize: 12, color: hover === null || hover === i ? INK.text2 : INK.text3 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: sg.color }} />{sg.label}<span style={{ fontFamily: INK.mono, color: INK.text3, marginLeft: 'auto' }}>{fmt(sg.value)}</span></button>)}</div>
    </div>
  );
}

// ── 9. Waffle (100 squares) ─────────────────────────────────────────────────
export function Waffle({ items, colors = SERIES_COLORS }: { items: { label: string; value: number }[]; colors?: string[] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1500);
  const [hover, setHover] = useState<number | null>(null);
  const total = items.reduce((s, i) => s + i.value, 0) || 1;
  const cells: number[] = [];
  items.forEach((it, i) => { const n = Math.round((it.value / total) * 100); for (let k = 0; k < n && cells.length < 100; k++) cells.push(i); });
  while (cells.length < 100) cells.push(items.length - 1);
  if (!items.length) return <EmptyNote>No data.</EmptyNote>;
  return (
    <div ref={ref} style={{ display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4, width: 190 }}>
        {cells.map((ci, k) => <div key={k} onMouseEnter={() => setHover(ci)} onMouseLeave={() => setHover(null)} style={{ aspectRatio: '1', borderRadius: 4, background: colors[ci % colors.length], opacity: (k < 100 * p ? 1 : 0.08) * (hover === null || hover === ci ? 1 : 0.2), transition: 'opacity .25s' }} />)}
      </div>
      <div style={{ display: 'grid', gap: 6 }}>{items.map((it, i) => <div key={it.label} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: hover === null || hover === i ? INK.text2 : INK.text3, cursor: 'default' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: colors[i % colors.length] }} />{it.label}<span style={{ fontFamily: INK.mono, color: INK.text3, marginLeft: 'auto', paddingLeft: 10 }}>{Math.round((it.value / total) * 100)}%</span></div>)}</div>
    </div>
  );
}

// ── 10. Slope chart across batches ──────────────────────────────────────────
export function SlopeChart({ columns, series, unit, height = 260 }: { columns: string[]; series: { label: string; values: number[]; color?: string; sizes?: number[] }[]; unit?: string; height?: number }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1400);
  const [hover, setHover] = useState<number | null>(null);
  const width = Math.max(320, size.width);
  const pad = { l: 60, r: 60, t: 20, b: 30 };
  const max = niceMax(Math.max(1, ...series.flatMap(s => s.values)));
  const x = (i: number) => pad.l + ((width - pad.l - pad.r) * i) / Math.max(1, columns.length - 1);
  const y = linear([0, max], [height - pad.b, pad.t]);
  if (!columns.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box}>
      <div ref={ref}>
        <svg width={width} height={height} onMouseLeave={() => setHover(null)}>
          {columns.map((c, i) => <g key={c}><line x1={x(i)} x2={x(i)} y1={pad.t} y2={height - pad.b} stroke={INK.border} /><text x={x(i)} y={height - 10} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{c}</text></g>)}
          {series.map((s, si) => { const c = s.color ?? SERIES_COLORS[si % SERIES_COLORS.length]; const on = hover === null || hover === si; const pts = s.values.map((v, i) => ({ x: x(i), y: y(v) })); const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt.x},${pt.y}`).join(' '); return (
            <g key={s.label} onMouseEnter={() => setHover(si)} style={{ opacity: on ? 1 : 0.25, transition: 'opacity .2s' }}>
              <path d={d} fill="none" stroke={c} strokeWidth={hover === si ? 3.5 : 2.2} strokeDasharray={2000} strokeDashoffset={2000 * (1 - p)} style={{ filter: `drop-shadow(0 0 6px ${c}66)` }} />
              {pts.map((pt, i) => <g key={i}><circle cx={pt.x} cy={pt.y} r={s.sizes ? 4 + 10 * Math.sqrt(s.sizes[i] / Math.max(1, ...(s.sizes ?? [1]))) : 5} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={1.5} /><text x={pt.x + (i === 0 ? -10 : i === columns.length - 1 ? 10 : 0)} y={pt.y - 12} textAnchor={i === 0 ? 'end' : i === columns.length - 1 ? 'start' : 'middle'} fontFamily={INK.mono} fontSize={10} fill={INK.text} style={{ paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 3 }}>{unit === '%' ? `${s.values[i]}%` : fmt(s.values[i])}</text></g>)}
              <text x={x(columns.length - 1) + 14} y={pts[pts.length - 1].y + 4} fontFamily={INK.ui} fontSize={11} fontWeight={700} fill={c}>{s.label}</text>
            </g>); })}
        </svg>
      </div>
    </div>
  );
}

// ── 11. Stacked 100% bars with hover ────────────────────────────────────────
export function StackedBars({ rows, keys }: { rows: { label: string; values: number[] }[]; keys: string[] }) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1200);
  const [hover, setHover] = useState<number | null>(null);
  if (!rows.length) return <EmptyNote>No data.</EmptyNote>;
  return (
    <div ref={ref} style={{ display: 'grid', gap: 12 }}>
      {rows.map(r => { const total = r.values.reduce((a, b) => a + b, 0) || 1; return (
        <div key={r.label}>
          <div style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, color: INK.text3, marginBottom: 5 }}>{r.label.toUpperCase()} · {fmt(total)}</div>
          <div style={{ display: 'flex', height: 22, borderRadius: 8, overflow: 'hidden', background: INK.surfaceHi }}>
            {r.values.map((v, i) => <div key={keys[i]} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} title={`${keys[i]}: ${v}`} style={{ width: `${(v / total) * 100 * p}%`, background: SERIES_COLORS[i % SERIES_COLORS.length], opacity: hover === null || hover === i ? 0.9 : 0.3, transition: 'width .6s, opacity .2s', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: INK.mono, fontSize: 9, color: INK.bg, overflow: 'hidden' }}>{v / total > 0.12 ? `${Math.round((v / total) * 100)}%` : ''}</div>)}
          </div>
        </div>); })}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 12px' }}>{keys.map((k, i) => <span key={k} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: INK.mono, fontSize: 10, color: hover === null || hover === i ? INK.text2 : INK.text3, cursor: 'default' }}><span style={{ width: 8, height: 8, borderRadius: 999, background: SERIES_COLORS[i % SERIES_COLORS.length] }} />{k}</span>)}</div>
    </div>
  );
}

// ── 12. Play controls (progress 0→1 with play / pause / reset / scrub) ──────
export function usePlayer(duration = 6000) {
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(false);
  const raf = useRef(0), last = useRef(0);
  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) { setProgress(1); setPlaying(false); return; }
    last.current = performance.now();
    const tick = (now: number) => { const dt = now - last.current; last.current = now; setProgress(pr => { const n = Math.min(1, pr + dt / duration); if (n >= 1) setPlaying(false); return n; }); raf.current = requestAnimationFrame(tick); };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [playing, duration]);
  return { progress, playing, play: () => { if (progress >= 1) setProgress(0); setPlaying(true); }, pause: () => setPlaying(false), reset: () => { setPlaying(false); setProgress(0); }, scrub: (v: number) => { setPlaying(false); setProgress(Math.max(0, Math.min(1, v))); } };
}

export function PlayBar({ player, label }: { player: ReturnType<typeof usePlayer>; label?: string }) {
  const btn = (text: string, onClick: () => void, on = false) => <button onClick={onClick} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, padding: '5px 11px', borderRadius: 999, border: `1px solid ${on ? INK.lime : INK.border}`, background: on ? INK.lime : 'transparent', color: on ? INK.bg : INK.text2, cursor: 'pointer' }}>{text}</button>;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
      {btn(player.playing ? '❚❚ PAUSE' : '▶ PLAY', player.playing ? player.pause : player.play, player.playing)}
      {btn('↺ RESET', player.reset)}
      <input type="range" min={0} max={1000} value={Math.round(player.progress * 1000)} onChange={e => player.scrub(Number(e.target.value) / 1000)} style={{ flex: 1, minWidth: 120, accentColor: INK.lime }} aria-label="Scrub timeline" />
      {label && <span style={{ fontFamily: INK.mono, fontSize: 10, color: INK.text3, letterSpacing: 1 }}>{label}</span>}
    </div>
  );
}
