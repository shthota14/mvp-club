import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { insightsApi } from '@/api/client';
import { INK, useInView, useReveal, useTween, KindBadge } from './shared';
import { AreaLines, Streamgraph } from './charts';
import { QuadrantScatter } from './charts-extra';
import { SlopeChart } from './charts-interactive';
import { fmt, smoothPath, linear } from '@/lib/viz';

// Live market signals embedded in the home page (HeroPage). Two pieces:
//   <HomePulseStrip/>   — four compact tiles under the hero CTA
//   <HomePulseSection/> — a section of three real charts with a link to /insights
// Both read the same cached 30-day market payload the Insights page uses.

type Series = { key: string; label: string; values: number[] };
type Payload = {
  generatedAt: string; weeks: string[];
  hackerNews: { kind: string; weekly?: Series[]; showTotal?: number; aiShare?: number; categoryWeekly?: Series[]; categoryStats?: { key: string; label: string; launches: number; attention: number; aiShare: number }[] };
  github: { kind: string; topics?: { label: string; total: number }[] };
  ycombinator: { kind: string; batches?: { label: string; companies: number; aiShare: number; ukOrEurope: number }[] };
  secFormD: { kind: string; weekly?: Series[] };
};

let cached: Payload | null = null;
function usePulse() {
  const [data, setData] = useState<Payload | null>(cached);
  useEffect(() => {
    if (cached) return;
    let cancelled = false;
    insightsApi.market(30).then(r => { cached = r.data; if (!cancelled) setData(r.data); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  return data;
}

const lastFull = (s?: Series) => (s && s.values.length >= 2 ? s.values[s.values.length - 2] : s?.values[s.values.length - 1] ?? 0);

function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 120, h = 34;
  const max = Math.max(1, ...values);
  const x = linear([0, Math.max(1, values.length - 1)], [2, w - 2]), y = linear([0, max], [h - 2, 2]);
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }));
  return <svg width={w} height={h} style={{ display: 'block' }}><path d={smoothPath(pts)} fill="none" stroke={color} strokeWidth={2} style={{ filter: `drop-shadow(0 0 5px ${color}66)` }} />{pts.length > 0 && <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r={3} fill={color} />}</svg>;
}

function Tile({ label, value, unit, sub, color, spark, delay = 0, onClick }: { label: string; value: number | string; unit?: string; sub: string; color: string; spark?: number[]; delay?: number; onClick: () => void }) {
  const [ref, inView] = useInView<HTMLButtonElement>();
  const p = useReveal(inView, 1200 + delay);
  const tw = useTween([typeof value === 'number' ? value : 0], 800)[0];
  const n = typeof value === 'number' ? Math.round(tw * p) : null;
  return (
    <button ref={ref} onClick={onClick} className="hp-pulse-tile" style={{ textAlign: 'left', background: 'rgba(255,255,255,.035)', border: `1px solid rgba(255,255,255,.09)`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', color: '#fff', fontFamily: 'inherit', display: 'grid', gap: 6, minWidth: 0, opacity: inView ? 1 : 0, transform: inView ? 'none' : 'translateY(10px)', transition: `opacity .6s ${delay}ms, transform .6s ${delay}ms, border-color .2s` }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = color + '88')} onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.09)')}>
      <span style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.6, color: 'rgba(255,255,255,.4)', textTransform: 'uppercase', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 'clamp(24px, 2.6vw, 34px)', fontWeight: 800, letterSpacing: -1.2, lineHeight: 1, color, fontVariantNumeric: 'tabular-nums' }}>{n !== null ? fmt(n) : value}{unit && <span style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginLeft: 3, fontWeight: 500 }}>{unit}</span>}</span>
        {spark && <Spark values={spark} color={color} />}
      </span>
      <span style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', lineHeight: 1.35 }}>{sub}</span>
    </button>
  );
}

export function HomePulseStrip() {
  const navigate = useNavigate();
  const d = usePulse();
  if (!d) return null;
  const hn = d.hackerNews, yc = d.ycombinator?.batches?.[0], sec = d.secFormD, gh = d.github;
  const launches = lastFull(hn.weekly?.[0]), ai = lastFull(hn.weekly?.[1]);
  const topTopic = [...(gh.topics ?? [])].sort((a, b) => b.total - a.total)[0];
  const go = () => navigate('/insights');
  return (
    <div style={{ width: '100%', maxWidth: 1040, margin: '0 auto', padding: '0 24px 56px', position: 'relative', zIndex: 2 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: INK.mono, fontSize: 11, letterSpacing: 2, color: 'rgba(255,255,255,.45)', textTransform: 'uppercase' }}><KindBadge kind="live" /> Market pulse · what the world is building right now</span>
        <button onClick={go} style={{ background: 'none', border: 'none', color: INK.lime, fontFamily: INK.mono, fontSize: 11, letterSpacing: 1.5, cursor: 'pointer', padding: 0 }}>EXPLORE LIVE INSIGHTS →</button>
      </div>
      <div className="hp-pulse-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
        {hn.kind === 'live' && <Tile label="Launched on Hacker News" value={launches} sub={`last week · ${launches ? Math.round((ai / launches) * 100) : 0}% AI products`} color={INK.lime} spark={hn.weekly?.[0]?.values} onClick={go} />}
        {yc && <Tile label={`YC ${yc.label} · AI share`} value={yc.aiShare} unit="%" sub={`${fmt(yc.companies)} companies · ${fmt(yc.ukOrEurope)} from UK & Europe`} color={INK.violetHi} delay={80} onClick={go} />}
        {topTopic && <Tile label={`New "${topTopic.label}" repos`} value={topTopic.total} sub="on GitHub in the last 30 days" color={INK.sky} delay={160} onClick={go} />}
        {sec.kind === 'live' && <Tile label="US startup financings" value={lastFull(sec.weekly?.[0])} sub="Form D filings with the SEC, last week" color={INK.amber} spark={sec.weekly?.[0]?.values} delay={240} onClick={go} />}
      </div>
      <style>{`@media (max-width: 760px) { .hp-pulse-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; } }`}</style>
    </div>
  );
}

export function HomePulseSection() {
  const navigate = useNavigate();
  const d = usePulse();
  if (!d) return null;
  const hn = d.hackerNews, batches = d.ycombinator?.batches ?? [];
  const go = () => navigate('/insights');
  const card = (title: string, note: string, children: React.ReactNode, span = 1) => (
    <div className={`hp-pulse-card hp-pulse-span-${span}`} style={{ background: 'rgba(255,255,255,.035)', border: '1px solid rgba(255,255,255,.09)', borderRadius: 20, padding: 18, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: -0.3, color: '#fff' }}>{title}</h3>
        <span style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, color: 'rgba(255,255,255,.35)', whiteSpace: 'nowrap' }}>{note}</span>
      </div>
      {children}
    </div>
  );
  return (
    <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px', background: 'radial-gradient(60% 50% at 10% 0%, rgba(124,58,237,.14), transparent 70%)' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>Market pulse</p>
        <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, fontFamily: 'var(--font-display)', color: '#fff', marginBottom: 10, textAlign: 'center' }}>Know the field<br />before you step onto it.</h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.4)', fontStyle: 'italic', fontFamily: 'var(--font-display)', marginBottom: 36, textAlign: 'center' }}>Live signals from Hacker News, GitHub, Y Combinator and the SEC — not opinions.</p>
        <div className="hp-pulse-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          {hn.categoryWeekly?.length ? card('What gets launched, week by week', 'Show HN · by category', <Streamgraph weeks={d.weeks} series={hn.categoryWeekly} />, 2) : card('Launches per week', 'Show HN', <AreaLines weeks={d.weeks} series={hn.weekly ?? []} height={220} />, 2)}
          {batches.length > 1 && card('YC, batch to batch', 'AI share · UK & EU share', <SlopeChart height={240} columns={[...batches].reverse().map(b => b.label)} unit="%" series={[{ label: 'AI', values: [...batches].reverse().map(b => b.aiShare), color: INK.lime, sizes: [...batches].reverse().map(b => b.companies) }, { label: 'UK & EU', values: [...batches].reverse().map(b => Math.round((b.ukOrEurope / Math.max(1, b.companies)) * 100)), color: INK.sky }]} />)}
          {hn.categoryStats?.length ? card('Where the attention is', 'attention per launch vs. launches', <QuadrantScatter height={280} xLabel="Launches" yLabel="Attention" sizeLabel="AI share %" quadrantLabels={['Underserved', 'Hot · crowded', 'Quiet', 'Crowded']} points={hn.categoryStats.map(c => ({ label: c.label, x: c.launches, y: c.attention, size: Math.max(1, c.aiShare) }))} />, 3) : null}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 28 }}>
          <button onClick={go} style={{ background: INK.lime, color: '#0f0c15', border: 'none', borderRadius: 999, padding: '14px 28px', fontSize: 15, fontWeight: 800, cursor: 'pointer', boxShadow: `0 0 30px ${INK.lime}44` }}>Open the full Insights page →</button>
        </div>
      </div>
      <style>{`@media (max-width: 900px) { .hp-pulse-cards { grid-template-columns: 1fr !important; } .hp-pulse-span-2, .hp-pulse-span-3 { grid-column: span 1 !important; } } .hp-pulse-span-2 { grid-column: span 2; } .hp-pulse-span-3 { grid-column: span 3; }`}</style>
    </section>
  );
}
