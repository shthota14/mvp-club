import { useMemo, useState } from 'react';
import { INK, SERIES_COLORS, useSize, useInView, useReveal, Tooltip, EmptyNote } from './shared';
import { linear, niceMax, ticks, fmt, fmtShort } from '@/lib/viz';

// Extra chart types for the market-pulse page: squarified treemap, packed
// bubbles and a quadrant scatter. Dependency-free like everything else here.

// ── Squarified treemap ──────────────────────────────────────────────────────
type TreeNode = { label: string; count: number; children?: { label: string; count: number }[] };
type Rect = { x: number; y: number; w: number; h: number };

function squarify(items: { value: number; i: number }[], rect: Rect): (Rect & { i: number })[] {
  // Classic squarified layout (Bruls et al.), rows laid along the shorter side.
  const total = items.reduce((s, it) => s + it.value, 0) || 1;
  const scaled = items.map(it => ({ ...it, area: (it.value / total) * rect.w * rect.h }));
  const out: (Rect & { i: number })[] = [];
  let x = rect.x, y = rect.y, w = rect.w, h = rect.h;
  let row: typeof scaled = [];
  const worst = (r: typeof scaled, side: number) => { const s = r.reduce((a, b) => a + b.area, 0); const mx = Math.max(...r.map(b => b.area)), mn = Math.min(...r.map(b => b.area)); return Math.max((side * side * mx) / (s * s), (s * s) / (side * side * mn)); };
  const layoutRow = (r: typeof scaled) => {
    const s = r.reduce((a, b) => a + b.area, 0);
    if (w >= h) { const rw = s / h; let yy = y; for (const b of r) { const bh = b.area / rw; out.push({ x, y: yy, w: rw, h: bh, i: b.i }); yy += bh; } x += rw; w -= rw; }
    else { const rh = s / w; let xx = x; for (const b of r) { const bw = b.area / rh; out.push({ x: xx, y, w: bw, h: rh, i: b.i }); xx += bw; } y += rh; h -= rh; }
  };
  for (const it of scaled) {
    const side = Math.min(w, h);
    if (!row.length || worst([...row, it], side) <= worst(row, side)) row.push(it);
    else { layoutRow(row); row = [it]; }
  }
  if (row.length) layoutRow(row);
  return out;
}

export function Treemap({ data, height = 360 }: { data: TreeNode[]; height?: number }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1200);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const width = Math.max(320, size.width);
  const layout = useMemo(() => {
    const sorted = [...data].filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    const top = squarify(sorted.map((d, i) => ({ value: d.count, i })), { x: 0, y: 0, w: width, h: height });
    return top.map(r => {
      const node = sorted[r.i];
      const kids = (node.children ?? []).filter(c => c.count > 0).sort((a, b) => b.count - a.count);
      const inner = squarify(kids.map((c, i) => ({ value: c.count, i })), { x: r.x + 3, y: r.y + 22, w: Math.max(0, r.w - 6), h: Math.max(0, r.h - 25) });
      return { rect: r, node, color: SERIES_COLORS[r.i % SERIES_COLORS.length], kids: inner.map(k => ({ rect: k, node: kids[k.i] })) };
    });
  }, [data, width, height]);
  if (!data.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block', borderRadius: 12 }} onMouseLeave={() => setHover(null)}>
          {layout.map(({ rect, node, color, kids }) => (
            <g key={node.label} style={{ opacity: p }}>
              <rect x={rect.x + 1} y={rect.y + 1} width={Math.max(0, rect.w - 2)} height={Math.max(0, rect.h - 2)} rx={6} fill={color} fillOpacity={0.14} stroke={color} strokeOpacity={0.5} />
              {rect.w > 60 && rect.h > 24 && <text x={rect.x + 8} y={rect.y + 15} fontFamily={INK.ui} fontSize={11} fontWeight={700} fill={INK.text}>{node.label} <tspan fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmt(node.count)}</tspan></text>}
              {kids.map(({ rect: k, node: kn }) => (
                <g key={kn.label} onMouseMove={e => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ x: e.clientX - r.left, y: e.clientY - r.top, text: `${node.label} › ${kn.label}: ${fmt(kn.count)}` }); }}>
                  <rect x={k.x + 1} y={k.y + 1} width={Math.max(0, k.w - 2) * p} height={Math.max(0, k.h - 2)} rx={4} fill={color} fillOpacity={0.55} />
                  {k.w > 54 && k.h > 18 && <text x={k.x + 6} y={k.y + k.h / 2} dy="0.35em" fontFamily={INK.ui} fontSize={10} fill={INK.bg} style={{ pointerEvents: 'none' }}>{kn.label.length > Math.floor(k.w / 6) ? kn.label.slice(0, Math.floor(k.w / 6) - 1) + '…' : kn.label}</text>}
                </g>
              ))}
            </g>
          ))}
        </svg>
      </div>
      {hover && <Tooltip x={hover.x} y={hover.y} bounds={{ width, height }}>{hover.text}</Tooltip>}
    </div>
  );
}

// ── Packed bubbles ──────────────────────────────────────────────────────────
export function PackedBubbles({ items, height = 320, color = INK.sky }: { items: { label: string; count: number }[]; height?: number; color?: string }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1300);
  const width = Math.max(320, size.width);
  const circles = useMemo(() => {
    const sorted = [...items].filter(i => i.count > 0).sort((a, b) => b.count - a.count);
    const total = sorted.reduce((s, i) => s + i.count, 0) || 1;
    // Scale so the area is ~45% filled, but never let the largest bubble
    // exceed 42% of the shorter side (two giants must still fit side by side).
    const maxCount = sorted[0]?.count ?? 1;
    const areaScale = Math.min((width * height * 0.45) / total, (Math.PI * Math.pow(Math.min(width, height) * 0.42, 2)) / maxCount);
    const placed: { x: number; y: number; r: number; label: string; count: number }[] = [];
    const cx = width / 2, cy = height / 2;
    for (const it of sorted) {
      const r = Math.max(10, Math.sqrt((it.count * areaScale) / Math.PI));
      let best: { x: number; y: number } | null = null;
      if (!placed.length) best = { x: cx, y: cy };
      else {
        // Spiral search for the first collision-free spot nearest the centre;
        // if none exists, take the in-bounds spot with the least overlap.
        let fallback: { x: number; y: number; score: number } | null = null;
        for (let a = 0, d = 0; d < Math.max(width, height) && !best; a += 0.35, d += 1.4) {
          const x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d;
          if (x - r < 0 || x + r > width || y - r < 0 || y + r > height) continue;
          const gap = Math.min(...placed.map(c => Math.hypot(c.x - x, c.y - y) - (c.r + r)));
          if (gap >= 3) best = { x, y };
          else if (!fallback || gap > fallback.score) fallback = { x, y, score: gap };
        }
        if (!best) best = fallback ? { x: fallback.x, y: fallback.y } : { x: cx, y: cy };
      }
      placed.push({ ...best, r, label: it.label, count: it.count });
    }
    return placed;
  }, [items, width, height]);
  if (!items.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block' }}>
          {circles.map((c, i) => (
            <g key={c.label} transform={`translate(${c.x},${c.y})`}>
              <circle r={c.r * p} fill={color} fillOpacity={0.18 + 0.5 * (1 - i / Math.max(1, circles.length))} stroke={color} strokeOpacity={0.7} style={{ filter: `drop-shadow(0 0 10px ${color}55)` }} />
              {c.r > 22 && <text textAnchor="middle" dy="-0.2em" fontFamily={INK.ui} fontSize={Math.min(13, c.r / 2.6)} fontWeight={700} fill={INK.text} style={{ pointerEvents: 'none' }}>{c.label.length > c.r / 3.2 ? c.label.slice(0, Math.max(3, Math.floor(c.r / 3.2))) + '…' : c.label}</text>}
              {c.r > 16 && <text textAnchor="middle" dy={c.r > 22 ? '1.1em' : '0.35em'} fontFamily={INK.mono} fontSize={10} fill={INK.text2} style={{ pointerEvents: 'none' }}>{fmt(c.count)}</text>}
              <title>{c.label}: {fmt(c.count)}</title>
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

// ── Quadrant scatter ────────────────────────────────────────────────────────
export function QuadrantScatter({ points, xLabel, yLabel, height = 340, sizeLabel, quadrantLabels }: { points: { label: string; x: number; y: number; size: number; color?: string }[]; xLabel: string; yLabel: string; height?: number; sizeLabel?: string; quadrantLabels?: [string, string, string, string] }) {
  const [box, size] = useSize<HTMLDivElement>();
  const [ref, inView] = useInView<HTMLDivElement>();
  const p = useReveal(inView, 1300);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);
  const width = Math.max(320, size.width);
  const pad = { l: 46, r: 18, t: 18, b: 40 };
  const maxX = niceMax(Math.max(1, ...points.map(pt => pt.x))), maxY = niceMax(Math.max(1, ...points.map(pt => pt.y)));
  const x = linear([0, maxX], [pad.l, width - pad.r]), y = linear([0, maxY], [height - pad.b, pad.t]);
  const maxS = Math.max(1, ...points.map(pt => pt.size));
  const midX = points.length ? points.reduce((s, pt) => s + pt.x, 0) / points.length : maxX / 2;
  const midY = points.length ? points.reduce((s, pt) => s + pt.y, 0) / points.length : maxY / 2;
  if (!points.length) return <div ref={box}><EmptyNote>No data.</EmptyNote></div>;
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <div ref={ref}>
        <svg width={width} height={height} style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
          {ticks(maxX, 4).map(t => <g key={`x${t}`}><line x1={x(t)} x2={x(t)} y1={pad.t} y2={height - pad.b} stroke={INK.border} /><text x={x(t)} y={height - pad.b + 14} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text></g>)}
          {ticks(maxY, 4).map(t => <g key={`y${t}`}><line x1={pad.l} x2={width - pad.r} y1={y(t)} y2={y(t)} stroke={INK.border} /><text x={pad.l - 8} y={y(t)} dy="0.35em" textAnchor="end" fontFamily={INK.mono} fontSize={10} fill={INK.text3}>{fmtShort(t)}</text></g>)}
          <line x1={x(midX)} x2={x(midX)} y1={pad.t} y2={height - pad.b} stroke={INK.violetHi} strokeOpacity={0.5} strokeDasharray="4 4" />
          <line x1={pad.l} x2={width - pad.r} y1={y(midY)} y2={y(midY)} stroke={INK.violetHi} strokeOpacity={0.5} strokeDasharray="4 4" />
          {quadrantLabels && [[pad.l + 6, pad.t + 12, quadrantLabels[0]], [width - pad.r - 6, pad.t + 12, quadrantLabels[1]], [pad.l + 6, height - pad.b - 8, quadrantLabels[2]], [width - pad.r - 6, height - pad.b - 8, quadrantLabels[3]]].map(([qx, qy, t], i) => (
            <text key={i} x={Number(qx)} y={Number(qy)} textAnchor={i % 2 ? 'end' : 'start'} fontFamily={INK.mono} fontSize={9} letterSpacing={1.2} fill={INK.text3}>{String(t).toUpperCase()}</text>
          ))}
          <text x={(pad.l + width - pad.r) / 2} y={height - 6} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text2}>{xLabel} →</text>
          <text transform={`translate(12,${(pad.t + height - pad.b) / 2}) rotate(-90)`} textAnchor="middle" fontFamily={INK.mono} fontSize={10} fill={INK.text2}>{yLabel} →</text>
          {points.map((pt, i) => {
            const r = (6 + 22 * Math.sqrt(pt.size / maxS)) * p;
            const c = pt.color ?? SERIES_COLORS[i % SERIES_COLORS.length];
            return (
              <g key={pt.label} onMouseMove={e => { const rr = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHover({ x: e.clientX - rr.left, y: e.clientY - rr.top, text: `${pt.label} · ${xLabel}: ${fmt(pt.x)} · ${yLabel}: ${pt.y} · ${sizeLabel ?? 'size'}: ${fmt(pt.size)}` }); }}>
                <circle cx={x(pt.x)} cy={y(pt.y)} r={r} fill={c} fillOpacity={0.35} stroke={c} strokeWidth={1.5} style={{ filter: `drop-shadow(0 0 8px ${c}66)` }} />
                <text x={x(pt.x)} y={y(pt.y) - r - 4} textAnchor="middle" fontFamily={INK.ui} fontSize={10} fill={INK.text2} style={{ paintOrder: 'stroke', stroke: INK.bg, strokeWidth: 3, pointerEvents: 'none' }}>{pt.label}</text>
              </g>
            );
          })}
        </svg>
      </div>
      {hover && <Tooltip x={hover.x} y={hover.y} bounds={{ width, height }}>{hover.text}</Tooltip>}
    </div>
  );
}
