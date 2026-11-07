import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { insightsApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import { INK, Particles, Panel, Chapter, Eyebrow, KindBadge, EmptyNote, DataKind, pct, trend } from '@/components/insights/shared';
import { KpiTile, JourneySankey, Ridgeline, Streamgraph, AreaLines, NetworkGraph } from '@/components/insights/charts';
import MarketPulse from '@/components/insights/market';
import { fmt } from '@/lib/viz';

// MVP Club — Intelligence & Insights (/insights)
//
// A public, no-login page that turns platform activity into an animated data
// story. Every panel is badged LIVE / ESTIMATE / SAMPLE from the payload the
// backend returns (routes/insights.ts), so visitors can always tell measured
// numbers from derived or illustrative ones. The page is deliberately the
// dark "ink" inversion of the house palette rather than a new look.

type Kpi = { value: number; kind: DataKind; label: string; note?: string };
type Series = { key: string; label: string; values: number[]; kind?: DataKind };
type Payload = {
  generatedAt: string; rangeDays: number; weeks: string[];
  kpis: Record<string, Kpi>;
  journey: { nodes: { id: string; label: string }[]; links: { source: string; target: string; value: number }[]; reached: number[]; verdicts: Record<string, number> };
  learning: { stages: { stage: string; label: string; values: number[]; ideas: number; median: number; steps: number }[] };
  engagement: { series: Series[] };
  productivity: { series: Series[]; hoursSaved: Series };
  ai: { interviewsAiShare: number; interviewsAi: number; interviewsTotal: number; grafter: { drafted: number; sent: number; replied: number }; series: Series[] };
  network: { nodes: { id: string; type: 'founder' | 'idea' | 'domain' | 'tool'; label: string; size: number; stage?: string }[]; links: { source: string; target: string; kind: string }[] };
};

// Set to true to bring back the MVP Club-internal chapters (journey Sankey,
// community streamgraph, network graph…). The page is external-data-only,
// charts-only, for now at the owner's request (2026-11-06).
const SHOW_INTERNAL = false;

const RANGES = [{ days: 30, label: '30d' }, { days: 90, label: '90d' }, { days: 180, label: '6m' }, { days: 365, label: '1y' }];

// Illustrative only — MVP Club doesn't yet ask founders which build tools they
// use. Rendered with a SAMPLE badge and a note, never mixed into live numbers.
const SAMPLE_BUILD_TOOLS = [
  { label: 'Claude / ChatGPT for thinking', pct: 82 }, { label: 'Lovable / Bolt / v0', pct: 54 }, { label: 'Cursor / Claude Code', pct: 47 },
  { label: 'No-code (Bubble, Softr)', pct: 31 }, { label: 'Hand-written code only', pct: 18 },
];

const CSS = `
  .ins-root { min-height: 100vh; background: ${INK.bg}; color: ${INK.text}; font-family: ${INK.ui}; -webkit-font-smoothing: antialiased; }
  .ins-wrap { max-width: 1240px; margin: 0 auto; padding: 0 20px 96px; }
  .ins-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .ins-kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; margin: 28px 0 18px; }
  .ins-kpi { position: relative; padding: 18px 18px 16px; border-radius: 18px; background: linear-gradient(160deg, rgba(255,255,255,.06), rgba(255,255,255,.02)); border: 1px solid ${INK.border}; opacity: 0; transform: translateY(14px); transition: opacity .6s ease, transform .6s ease, border-color .2s; overflow: hidden; }
  .ins-kpi:hover { border-color: ${INK.borderHi}; }
  .ins-kpi.ins-in { opacity: 1; transform: none; }
  .ins-panel { position: relative; padding: 20px; border-radius: 20px; background: ${INK.surface}; border: 1px solid ${INK.border}; opacity: 0; transform: translateY(18px); transition: opacity .7s ease, transform .7s ease, border-color .2s; min-width: 0; }
  .ins-panel:hover { border-color: ${INK.borderHi}; }
  .ins-panel.ins-in { opacity: 1; transform: none; }
  .ins-span-1 { grid-column: span 1; } .ins-span-2 { grid-column: span 2; } .ins-span-3 { grid-column: span 3; }
  .ins-range button { font-family: ${INK.mono}; font-size: 12px; letter-spacing: 1px; padding: 7px 13px; border-radius: 999px; border: 1px solid ${INK.border}; background: transparent; color: ${INK.text3}; cursor: pointer; transition: all .2s; }
  .ins-range button.on { background: ${INK.lime}; color: ${INK.bg}; border-color: ${INK.lime}; box-shadow: 0 0 22px ${INK.lime}55; }
  .ins-range button:hover:not(.on) { color: ${INK.text}; border-color: ${INK.borderHi}; }
  @keyframes ins-pulse { 0% { box-shadow: 0 0 0 0 currentColor; } 70% { box-shadow: 0 0 0 7px transparent; } 100% { box-shadow: 0 0 0 0 transparent; } }
  .ins-pulse { animation: ins-pulse 1.8s ease-out infinite; }
  @keyframes ins-ring { 0% { r: 10; opacity: .5 } 100% { r: 28; opacity: 0 } }
  @keyframes ins-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-6px) } }
  .ins-hero-stamp { animation: ins-float 6s ease-in-out infinite; }
  @media (prefers-reduced-motion: reduce) { .ins-pulse, .ins-hero-stamp { animation: none; } .ins-kpi, .ins-panel { transition: none; opacity: 1; transform: none; } }
  @media (max-width: 1000px) { .ins-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .ins-span-3 { grid-column: span 2; } .ins-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
  @media (max-width: 640px) { .ins-grid { grid-template-columns: 1fr; } .ins-span-2, .ins-span-3 { grid-column: span 1; } .ins-kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; } .ins-wrap { padding: 0 16px 72px; } .ins-panel { padding: 16px; } .ins-kpi { padding: 14px; } }
`;

export default function InsightsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
  const [range, setRange] = useState(90);
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!SHOW_INTERNAL) { setLoading(false); return; }
    setLoading(true);
    insightsApi.get(range)
      .then(res => { if (!cancelled) { setData(res.data); setError(null); } })
      .catch(() => { if (!cancelled) setError('Insights are temporarily unavailable.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range]);

  // Refresh quietly every 5 minutes so "live" stays honest without a reload.
  useEffect(() => {
    if (!SHOW_INTERNAL) return;
    const id = setInterval(() => { insightsApi.get(range).then(res => setData(res.data)).catch(() => {}); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [range]);

  const sumRange = (s?: Series) => (s ? s.values.reduce((a, b) => a + b, 0) : 0);
  const weeks = data?.weeks ?? [];
  const productivitySeries = useMemo(() => data ? [...data.productivity.series, { ...data.productivity.hoursSaved, key: 'hours' }] : [], [data]);
  const updated = data ? new Date(data.generatedAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

  // ── Plain-English readings, computed from the data ─────────────────────
  const STAGE_NAMES = ['Idea', 'Hone', 'Validate', 'Shape', 'Launched'];
  const reading = useMemo(() => {
    if (!data) return null;
    const r = data.journey.reached;
    // Biggest drop between consecutive stages.
    let dropAt = 0, dropN = -1;
    for (let i = 0; i < 4; i++) { const d = r[i] - r[i + 1]; if (d > dropN) { dropN = d; dropAt = i; } }
    const launchedPct = pct(r[4], r[0]);
    // Stage where the typical founder gets least far (median of normalised depth).
    const stall = [...data.learning.stages].map(s => { const v = [...s.values].sort((a, b) => a - b); return { label: s.label, typical: v.length ? Math.round(v[Math.floor(v.length / 2)] * 100) : 0, ideas: s.ideas }; });
    const stallWorst = stall.filter(s => s.ideas > 0).sort((a, b) => a.typical - b.typical)[0];
    // Community: total engagement last full week vs the week before.
    const engTotal = weeks.map((_, j) => data.engagement.series.reduce((s, x) => s + (x.values[j] ?? 0), 0));
    const eng = trend(engTotal);
    const steps = trend(data.productivity.series.find(s => s.key === 'steps')?.values);
    const interviewsDone = sumRange(data.productivity.series.find(s => s.key === 'interviews'));
    const newMembers = sumRange(data.productivity.series.find(s => s.key === 'members'));
    const domainHub = data.network.nodes.filter(n => n.type === 'domain').map(n => ({ n, deg: data.network.links.filter(l => l.target === n.id).length })).sort((a, b) => b.deg - a.deg)[0];
    return { dropAt, dropN, launchedPct, stall, stallWorst, eng, steps, interviewsDone, newMembers, domainHub };
  }, [data, weeks]);
  const trendWord = (t: { dir: 'up' | 'down' | 'flat'; pctChange: number }) => t.dir === 'flat' ? 'about the same as' : `${t.dir} ${Math.abs(t.pctChange)}% on`;

  return (
    <div className="ins-root">
      <style>{CSS}</style>

      {/* Top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(14px)', background: 'rgba(15,12,21,.78)', borderBottom: `1px solid ${INK.border}` }}>
        <div className="ins-wrap" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button onClick={() => navigate(isAuthenticated ? '/community' : '/')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'baseline', gap: 6, color: INK.text, fontFamily: INK.ui }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>MVP</span>
            <span style={{ fontSize: 14, fontWeight: 300, letterSpacing: 3, textTransform: 'uppercase', color: INK.text2 }}>Club</span>
            <span style={{ marginLeft: 10, fontFamily: INK.mono, fontSize: 10, letterSpacing: 2, color: INK.lime }}>INTELLIGENCE &amp; INSIGHTS</span>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="ins-range" style={{ display: 'flex', gap: 6 }}>
              {RANGES.map(r => <button key={r.days} className={range === r.days ? 'on' : ''} onClick={() => setRange(r.days)} aria-pressed={range === r.days}>{r.label}</button>)}
            </div>
            <button onClick={() => navigate('/insights/share')} style={{ fontFamily: INK.mono, fontSize: 11, letterSpacing: 1.5, padding: '8px 12px', borderRadius: 999, border: `1px solid ${INK.border}`, background: 'transparent', color: INK.text2, cursor: 'pointer' }}>SHARE ↗</button>
            {!isAuthenticated && (
              <button onClick={() => navigate('/')} style={{ fontFamily: INK.ui, fontWeight: 700, fontSize: 13, padding: '8px 14px', borderRadius: 999, border: 'none', background: INK.violet, color: '#fff', cursor: 'pointer' }}>Join free</button>
            )}
          </div>
        </div>
      </header>

      <div className="ins-wrap">
        {/* Hero */}
        <section style={{ position: 'relative', padding: SHOW_INTERNAL ? '64px 0 24px' : '48px 0 18px', overflow: 'hidden' }}>
          <Particles count={80} />
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(60% 50% at 20% 20%, rgba(124,58,237,.28), transparent 70%), radial-gradient(40% 40% at 85% 60%, rgba(214,255,61,.10), transparent 70%)`, pointerEvents: 'none' }} />
          <div style={{ position: 'relative' }}>
            <Eyebrow style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="ins-pulse" style={{ width: 7, height: 7, borderRadius: 999, background: INK.lime, color: INK.lime }} /> {SHOW_INTERNAL ? `Community pulse · updated ${updated}` : 'Market pulse · Hacker News · GitHub · Y Combinator'}</Eyebrow>
            <h1 style={{ margin: '14px 0 0', fontSize: 'clamp(38px, 6vw, 72px)', lineHeight: 0.98, letterSpacing: -2.2, fontWeight: 800 }}>
              {SHOW_INTERNAL ? <>Ideas in motion.<br /><span style={{ color: INK.lime }}>Founders shipping.</span></> : <>What the world<br /><span style={{ color: INK.lime }}>is building.</span></>}
            </h1>
            {SHOW_INTERNAL && (
              <>
                <p style={{ margin: '12px 0 0', maxWidth: 560, fontSize: 17, lineHeight: 1.5, color: INK.text2 }}>
                  Three questions, answered with real numbers: <b style={{ color: INK.text }}>Where are our founders on the journey?</b> <b style={{ color: INK.text }}>Is the community alive this week?</b> <b style={{ color: INK.text }}>What is the rest of the world building?</b>
                </p>
                <div style={{ display: 'flex', gap: 14, marginTop: 18, flexWrap: 'wrap', alignItems: 'center', fontSize: 12, color: INK.text3 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><KindBadge kind="live" /> counted from real data</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><KindBadge kind="estimate" /> worked out with a stated formula</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><KindBadge kind="sample" /> placeholder until we track it</span>
                </div>
              </>
            )}
          </div>
        </section>

        {SHOW_INTERNAL && error && <EmptyNote>{error} Try again in a moment.</EmptyNote>}

        {/* KPIs */}
        {SHOW_INTERNAL && data && (
          <div className="ins-kpis">
            <KpiTile label="People in the club" value={data.kpis.members.value} kind={data.kpis.members.kind} note={data.kpis.members.note} delta={sumRange(data.productivity.series.find(s => s.key === 'members'))} accent={INK.violetHi} />
            <KpiTile label="Ideas that launched" value={data.kpis.projectsCompleted.value} kind={data.kpis.projectsCompleted.kind} note={data.kpis.projectsCompleted.note} accent={INK.lime} delay={80} />
            <KpiTile label="Steps founders finished" value={data.kpis.stepsLogged.value} kind={data.kpis.stepsLogged.kind} note={data.kpis.stepsLogged.note} delta={sumRange(data.productivity.series.find(s => s.key === 'steps'))} accent={INK.sky} delay={160} />
            <KpiTile label="Hours AI saved" value={data.kpis.hoursSaved.value} kind={data.kpis.hoursSaved.kind} note={data.kpis.hoursSaved.note} unit="hrs" delta={Math.round(sumRange(data.productivity.hoursSaved))} accent={INK.amber} delay={240} />
          </div>
        )}

        {/* One-breath summary */}
        {SHOW_INTERNAL && data && reading && (
          <section className="ins-panel ins-in" style={{ marginBottom: 8, background: `linear-gradient(135deg, ${INK.violet}22, transparent 60%)`, borderColor: `${INK.violet}55` }}>
            <Eyebrow style={{ marginBottom: 10 }}>In plain English · last {data.rangeDays} days</Eyebrow>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '10px 24px', fontSize: 15, lineHeight: 1.5 }}>
              <div><b style={{ color: INK.lime }}>{reading.launchedPct}%</b> of ideas that entered MVP Club have launched. The biggest drop-off is <b>{STAGE_NAMES[reading.dropAt]} → {STAGE_NAMES[reading.dropAt + 1]}</b>{reading.dropN > 0 ? ` (${fmt(reading.dropN)} ideas don't make it)` : ' (no drop-off yet)'}.</div>
              <div>Founders get least far in <b>{reading.stallWorst?.label ?? '—'}</b> — the typical founder completes about <b style={{ color: INK.lime }}>{reading.stallWorst?.typical ?? 0}%</b> of it.</div>
              <div>Community activity last week was <b>{trendWord(reading.eng)}</b> the week before ({fmt(reading.eng.now)} posts, comments, cheers and interviews).</div>
              <div><b>{fmt(reading.newMembers)}</b> people joined and <b>{fmt(reading.interviewsDone)}</b> customer interviews were completed in this period.</div>
            </div>
          </section>
        )}

        {SHOW_INTERNAL && loading && !data && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: INK.text3, fontFamily: INK.mono, fontSize: 12, letterSpacing: 2 }}>LOADING SIGNALS…</div>
        )}

        {SHOW_INTERNAL && data && reading && (
          <>
            <Chapter n="01" question="Where are our founders on the journey?" answer="Every idea on MVP Club walks the same path: Idea → Hone → Validate → Shape → Get it done. These charts show how far ideas get and where they stop." />
            <div className="ins-grid">
              <Panel span={2} title="How ideas flow from Idea to Launch" sub="Read left to right. The width of each band is the number of ideas. Thin branches peeling off are ideas that were parked, pivoted or dropped." kind="live"
                right={<span style={{ fontFamily: INK.mono, fontSize: 11, color: INK.text3 }}>{fmt(data.journey.reached[0])} ideas</span>}
                takeaway={<>{reading.launchedPct}% of ideas reach launch. {reading.dropN > 0 ? <>Most ideas that stop, stop between <b>{STAGE_NAMES[reading.dropAt]}</b> and <b>{STAGE_NAMES[reading.dropAt + 1]}</b>.</> : 'Nothing has dropped off yet.'}</>}>
                <JourneySankey nodes={data.journey.nodes} links={data.journey.links} reached={data.journey.reached} />
              </Panel>

              <Panel title="How many ideas reached each stage" sub="Simple count. 100% is every idea ever started." kind="live"
                takeaway={<>{fmt(data.journey.reached[2])} ideas have reached Validate — the stage where founders talk to real customers.</>}>
                <div style={{ display: 'grid', gap: 10, marginTop: 4 }}>
                  {STAGE_NAMES.map((label, i) => {
                    const v = data.journey.reached[i], max = data.journey.reached[0] || 1;
                    return (
                      <div key={label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span style={{ fontWeight: 600 }}>{label}</span><span style={{ fontFamily: INK.mono, color: INK.text2 }}>{fmt(v)} · {Math.round((v / max) * 100)}%</span></div>
                        <div style={{ height: 8, borderRadius: 999, background: INK.surfaceHi, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${(v / max) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, ${INK.violet}, ${i === 4 ? INK.lime : INK.violetHi})`, transition: 'width 1.2s cubic-bezier(.2,.8,.2,1)' }} />
                        </div>
                      </div>
                    );
                  })}
                  <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[['Build', data.journey.verdicts.build, INK.lime], ['Pivot', data.journey.verdicts.pivot, INK.amber], ['Drop', data.journey.verdicts.drop, INK.rose]].map(([l, v, c]) => (
                      <div key={String(l)} style={{ padding: '10px 12px', borderRadius: 12, background: INK.surfaceHi, border: `1px solid ${INK.border}` }}>
                        <div style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: INK.text3 }}>{String(l).toUpperCase()}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: String(c), marginTop: 2 }}>{fmt(Number(v))}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: INK.text3 }}>After interviewing customers, founders decide to Build, Pivot or Drop the idea.</div>
                </div>
              </Panel>

              <Panel span={2} title="Where do founders get stuck?" sub="For each stage, how far the typical founder gets. A bump on the left means most people barely start that stage; a bump on the right means most finish it." kind="live"
                takeaway={<>Founders stall most in <b>{reading.stallWorst?.label}</b> (typical completion {reading.stallWorst?.typical}%). That's the stage to make easier.</>}>
                <Ridgeline stages={data.learning.stages} />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginTop: 10 }}>
                  {reading.stall.map(s => (
                    <div key={s.label} style={{ padding: '8px 10px', borderRadius: 10, background: INK.surfaceHi, border: `1px solid ${INK.border}` }}>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>{s.label}</div>
                      <div style={{ fontSize: 12, color: INK.text3 }}>typical founder: <b style={{ color: s.typical < 40 ? INK.rose : s.typical < 70 ? INK.amber : INK.lime }}>{s.typical}%</b> done</div>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="What tools do founders build with?" sub="Which tools members reach for when they build their MVP." kind="sample" note="MVP Club does not yet ask this — illustrative until the build-tools question ships in Get it done"
                takeaway="Placeholder numbers. Becomes real once we ask founders this question in the Get it done stage.">
                <div style={{ display: 'grid', gap: 12, marginTop: 6 }}>
                  {SAMPLE_BUILD_TOOLS.map((t, i) => (
                    <div key={t.label}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}><span>{t.label}</span><span style={{ fontFamily: INK.mono, color: INK.text3 }}>{t.pct}%</span></div>
                      <div style={{ height: 6, borderRadius: 999, background: INK.surfaceHi, overflow: 'hidden' }}><div style={{ height: '100%', width: `${t.pct}%`, background: INK.rose, opacity: 0.8 - i * 0.1, borderRadius: 999 }} /></div>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>

            <Chapter n="02" question="Is the community alive this week?" answer="A founder community only works if people show up. This is the week-by-week heartbeat: who is posting, cheering, commenting, interviewing and joining." />
            <div className="ins-grid">
              <Panel span={3} title="Weekly activity" sub="Thicker = busier week. Each colour is one kind of activity. Click a name in the key to look at just that one." kind="live"
                takeaway={<>Last full week had <b>{fmt(reading.eng.now)}</b> community actions — {trendWord(reading.eng)} the week before.</>}>
                <Streamgraph weeks={weeks} series={data.engagement.series} />
              </Panel>

              <Panel span={2} title="How much work is getting done" sub="Per week: guided steps finished, new ideas, completed interviews and new members. Hover for exact numbers." kind="live" note="Hours saved is an estimate: see the KPI tooltip for the formula"
                takeaway={<>Founders finished <b>{fmt(reading.steps.now)}</b> steps last full week, {trendWord(reading.steps)} the week before.</>}>
                <AreaLines weeks={weeks} series={productivitySeries} highlightKey="steps" />
              </Panel>

              <Panel title="Is AI actually helping?" sub="Two places AI does real work inside MVP Club: analysing customer interviews, and Grafter writing sales outreach." kind="live"
                takeaway={<>AI has analysed <b>{data.ai.interviewsAiShare}%</b> of interviews and Grafter has drafted <b>{fmt(data.ai.grafter.drafted)}</b> emails ({fmt(data.ai.grafter.replied)} replies).</>}>
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ padding: 16, borderRadius: 14, background: `linear-gradient(135deg, ${INK.violet}33, transparent)`, border: `1px solid ${INK.violet}55` }}>
                    <Eyebrow>Interviews analysed by AI</Eyebrow>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 6 }}><span style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.5, color: INK.text }}>{data.ai.interviewsAiShare}%</span><span style={{ fontFamily: INK.mono, fontSize: 12, color: INK.text3 }}>{fmt(data.ai.interviewsAi)} of {fmt(data.ai.interviewsTotal)}</span></div>
                  </div>
                  <div style={{ padding: 16, borderRadius: 14, background: INK.surfaceHi, border: `1px solid ${INK.border}` }}>
                    <Eyebrow>Grafter sales emails</Eyebrow>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                      {[['Drafted', data.ai.grafter.drafted, INK.violetHi], ['Sent', data.ai.grafter.sent, INK.sky], ['Replied', data.ai.grafter.replied, INK.lime]].map(([l, v, c]) => (
                        <div key={String(l)}><div style={{ fontSize: 22, fontWeight: 800, color: String(c) }}>{fmt(Number(v))}</div><div style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.2, color: INK.text3 }}>{String(l).toUpperCase()}</div></div>
                      ))}
                    </div>
                  </div>
                  <AreaLines weeks={weeks} series={data.ai.series} cumulative height={180} />
                </div>
              </Panel>

              <Panel span={3} title="Who is connected to whom?" sub="Purple rings are founders (names hidden), green dots are their ideas, blue are the industry they're in, red are AI tools. A line means owns, follows, or commented on. Drag things around; click one to see only its connections." kind="live" note="Founder names are replaced with ordinals server-side; only idea names, domains and tools are shown"
                takeaway={<>{fmt(data.network.nodes.filter(n => n.type === 'founder').length)} active founders and {fmt(data.network.nodes.filter(n => n.type === 'idea').length)} ideas are shown{reading.domainHub ? <>; the busiest industry hub is <b>{reading.domainHub.n.label}</b> ({reading.domainHub.deg} ideas)</> : null}.</>}>
                <NetworkGraph nodes={data.network.nodes} links={data.network.links} />
              </Panel>
            </div>
          </>
        )}

        {/* External market signals (Hacker News, GitHub; gated sources listed) */}
        <MarketPulse range={range} />

        {/* Footer CTA */}
        {SHOW_INTERNAL && <section style={{ marginTop: 40, padding: '36px 28px', borderRadius: 22, background: `linear-gradient(135deg, ${INK.violet}, #4c1d95)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: INK.mono, fontSize: 11, letterSpacing: 2, color: '#e9d5ff' }}>ONE CLEAR NEXT STEP</div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: -0.6, marginTop: 6 }}>Add your idea to the river.</div>
            <div style={{ color: '#e9d5ff', marginTop: 4, fontSize: 14 }}>Idea → Hone → Validate → Shape → Get it done. Free, guided, with people at your stage.</div>
          </div>
          <button onClick={() => navigate(isAuthenticated ? '/work' : '/')} style={{ fontFamily: INK.ui, fontWeight: 800, fontSize: 15, padding: '14px 22px', borderRadius: 999, border: 'none', background: INK.lime, color: INK.bg, cursor: 'pointer', boxShadow: `0 0 30px ${INK.lime}55` }}>
            {isAuthenticated ? 'Continue my journey →' : 'Start for free →'}
          </button>
        </section>}
      </div>
    </div>
  );
}
