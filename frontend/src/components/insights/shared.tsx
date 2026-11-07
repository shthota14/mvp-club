import { useEffect, useRef, useState, ReactNode, CSSProperties } from 'react';
import { easeInOut, easeOutCubic } from '@/lib/viz';

// ── Dark "ink" variant of the house design system ───────────────────────────
// Same ink / violet / lime as the Oct-2026 redesign, inverted: ink becomes the
// page, cream becomes the text. Series colours are picked to stay legible on
// ink and to be distinguishable without relying on hue alone (the charts also
// label every series directly).
export const INK = {
  bg: '#0f0c15',
  bg2: '#16121d',
  surface: 'rgba(255,255,255,0.035)',
  surfaceHi: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.09)',
  borderHi: 'rgba(255,255,255,0.18)',
  text: '#f5f2ff',
  text2: '#c9c0da',
  text3: '#8f86a3',
  violet: '#7c3aed',
  violetHi: '#a78bfa',
  lime: '#d6ff3d',
  sky: '#38bdf8',
  rose: '#fb7185',
  amber: '#fbbf24',
  mint: '#34d399',
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
  ui: "'Bricolage Grotesque', system-ui, -apple-system, 'Helvetica Neue', Arial, sans-serif",
};
export const SERIES_COLORS = [INK.violetHi, INK.lime, INK.sky, INK.rose, INK.amber, INK.mint, '#f0abfc'];

export type DataKind = 'live' | 'estimate' | 'sample';

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(entries => {
      const r = entries[0].contentRect;
      setSize(s => (Math.abs(s.width - r.width) > 1 || Math.abs(s.height - r.height) > 1 ? { width: r.width, height: r.height } : s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function useInView<T extends HTMLElement>(rootMargin = '-10% 0px') {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    if (!('IntersectionObserver' in window)) { setInView(true); return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return [ref, inView] as const;
}

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Tween a flat array of numbers towards `target` whenever it changes. Charts
// consume the tweened array, so a date-range change morphs every shape
// instead of snapping. Length changes snap (no sensible interpolation).
export function useTween(target: number[], duration = 700, enabled = true): number[] {
  const [value, setValue] = useState(target);
  const fromRef = useRef(target), startRef = useRef(0), raf = useRef(0);
  useEffect(() => {
    if (!enabled || prefersReducedMotion() || fromRef.current.length !== target.length) { fromRef.current = target; setValue(target); return; }
    const from = fromRef.current;
    startRef.current = performance.now();
    cancelAnimationFrame(raf.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / duration);
      const e = easeInOut(t);
      const next = target.map((v, i) => from[i] + (v - from[i]) * e);
      setValue(next);
      if (t < 1) raf.current = requestAnimationFrame(tick); else fromRef.current = target;
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.join(','), enabled]);
  return value;
}

// 0 → 1 progress that starts when `go` flips true. Drives reveal animations.
export function useReveal(go: boolean, duration = 1100): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (prefersReducedMotion()) { setP(1); return; }
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const t = Math.min(1, (now - start) / duration); setP(easeOutCubic(t)); if (t < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [go, duration]);
  return p;
}

// ── Small UI atoms ──────────────────────────────────────────────────────────
export function KindBadge({ kind, note }: { kind: DataKind; note?: string }) {
  const meta = {
    live:     { label: 'LIVE',      color: INK.lime,  dot: true },
    estimate: { label: 'ESTIMATE',  color: INK.amber, dot: false },
    sample:   { label: 'SAMPLE',    color: INK.rose,  dot: false },
  }[kind];
  return (
    <span title={note} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.4, color: meta.color, border: `1px solid ${meta.color}55`, borderRadius: 999, padding: '3px 9px', cursor: note ? 'help' : 'default', whiteSpace: 'nowrap' }}>
      {meta.dot && <span className="ins-pulse" style={{ width: 6, height: 6, borderRadius: 999, background: meta.color, boxShadow: `0 0 0 0 ${meta.color}` }} />}
      {meta.label}
    </span>
  );
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: INK.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: INK.text3, ...style }}>{children}</div>;
}

// `takeaway` is the one plain-English sentence a reader should leave with —
// computed from the data by the caller, shown in lime at the bottom so every
// chart answers "so what?" without the reader having to decode it.
export function Panel({ title, sub, kind, note, children, right, span = 1, minHeight, takeaway }: { title: string; sub?: string; kind: DataKind; note?: string; children: ReactNode; right?: ReactNode; span?: 1 | 2 | 3; minHeight?: number; takeaway?: ReactNode }) {
  const [ref, inView] = useInView<HTMLElement>();
  return (
    <section ref={ref} className={`ins-panel ins-span-${span} ${inView ? 'ins-in' : ''}`} style={{ minHeight, display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{ margin: 0, fontFamily: INK.ui, fontSize: 19, fontWeight: 700, letterSpacing: -0.3, color: INK.text }}>{title}</h2>
          {sub && <p style={{ margin: '4px 0 0', fontSize: 13, color: INK.text3, lineHeight: 1.45 }}>{sub}</p>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>{right}<KindBadge kind={kind} note={note} /></div>
      </header>
      <div style={{ flex: 1 }}>{children}</div>
      {takeaway && (
        <div style={{ marginTop: 16, padding: '10px 12px', borderRadius: 12, background: `${INK.lime}12`, border: `1px solid ${INK.lime}33`, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: INK.lime, paddingTop: 3, whiteSpace: 'nowrap' }}>SO WHAT</span>
          <span style={{ fontSize: 13.5, color: INK.text, lineHeight: 1.45 }}>{takeaway}</span>
        </div>
      )}
    </section>
  );
}

export function Chapter({ n, question, answer }: { n: string; question: string; answer?: string }) {
  return (
    <div style={{ margin: '44px 0 16px', display: 'flex', gap: 16, alignItems: 'baseline', flexWrap: 'wrap' }}>
      <span style={{ fontFamily: INK.mono, fontSize: 12, letterSpacing: 2, color: INK.lime }}>{n}</span>
      <div>
        <h2 style={{ margin: 0, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 800, letterSpacing: -0.9, lineHeight: 1.1 }}>{question}</h2>
        {answer && <p style={{ margin: '6px 0 0', fontSize: 14.5, color: INK.text2, maxWidth: 720, lineHeight: 1.5 }}>{answer}</p>}
      </div>
    </div>
  );
}

export const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
export const trend = (series: number[] | undefined): { now: number; prev: number; dir: 'up' | 'down' | 'flat'; pctChange: number } => {
  const v = series ?? [];
  // Compare the last complete week with the one before it (the final bucket is the current, partial week).
  const now = v.length >= 2 ? v[v.length - 2] : v[v.length - 1] ?? 0;
  const prev = v.length >= 3 ? v[v.length - 3] : 0;
  const pctChange = prev ? Math.round(((now - prev) / prev) * 100) : now ? 100 : 0;
  return { now, prev, dir: now > prev ? 'up' : now < prev ? 'down' : 'flat', pctChange };
};

export function Legend({ items, active, onToggle }: { items: { key: string; label: string; color: string }[]; active?: Set<string>; onToggle?: (k: string) => void }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', marginTop: 10 }}>
      {items.map(it => {
        const on = !active || active.has(it.key);
        return (
          <button key={it.key} onClick={() => onToggle?.(it.key)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'none', border: 'none', padding: 0, cursor: onToggle ? 'pointer' : 'default', color: on ? INK.text2 : INK.text3, fontFamily: INK.ui, fontSize: 12, opacity: on ? 1 : 0.45, transition: 'opacity .2s' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: it.color, boxShadow: on ? `0 0 10px ${it.color}66` : 'none' }} />{it.label}
          </button>
        );
      })}
    </div>
  );
}

export function Tooltip({ x, y, children, bounds }: { x: number; y: number; children: ReactNode; bounds: { width: number; height: number } }) {
  const flipX = x > bounds.width * 0.6, flipY = y > bounds.height * 0.6;
  return (
    <div style={{ position: 'absolute', left: x, top: y, transform: `translate(${flipX ? 'calc(-100% - 12px)' : '12px'}, ${flipY ? 'calc(-100% - 12px)' : '12px'})`, pointerEvents: 'none', background: 'rgba(22,18,29,0.96)', border: `1px solid ${INK.borderHi}`, borderRadius: 10, padding: '8px 11px', fontSize: 12, color: INK.text, boxShadow: '0 10px 30px rgba(0,0,0,.45)', backdropFilter: 'blur(8px)', zIndex: 5, minWidth: 120, lineHeight: 1.5 }}>
      {children}
    </div>
  );
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ padding: '28px 12px', textAlign: 'center', color: INK.text3, fontSize: 13, border: `1px dashed ${INK.border}`, borderRadius: 12 }}>{children}</div>;
}

// ── Ambient particle field (canvas, cheap, respects reduced motion) ─────────
export function Particles({ count = 70 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c || prefersReducedMotion()) return;
    const ctx = c.getContext('2d'); if (!ctx) return;
    let w = 0, h = 0, raf = 0;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const ps = Array.from({ length: count }, () => ({ x: Math.random(), y: Math.random(), r: 0.6 + Math.random() * 1.6, vx: (Math.random() - 0.5) * 0.00018, vy: -0.00004 - Math.random() * 0.00012, hue: Math.random() < 0.25 ? INK.lime : Math.random() < 0.5 ? INK.violetHi : '#ffffff', a: 0.15 + Math.random() * 0.4, ph: Math.random() * Math.PI * 2 }));
    const resize = () => { w = c.clientWidth; h = c.clientHeight; c.width = w * dpr; c.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    resize();
    const ro = new ResizeObserver(resize); ro.observe(c);
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - last); last = now;
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.ph += dt * 0.0015;
        if (p.y < -0.02) { p.y = 1.02; p.x = Math.random(); }
        if (p.x < -0.02) p.x = 1.02; if (p.x > 1.02) p.x = -0.02;
        const a = p.a * (0.6 + 0.4 * Math.sin(p.ph));
        ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.hue; ctx.globalAlpha = a; ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [count]);
  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} />;
}
