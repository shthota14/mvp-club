import { useEffect, useMemo, useState } from 'react';
import { insightsApi } from '@/api/client';
import { INK, SERIES_COLORS, Panel, EmptyNote, DataKind } from './shared';
import { AreaLines, Streamgraph } from './charts';
import { Treemap, PackedBubbles, QuadrantScatter } from './charts-extra';
import { BrushTimeline, RadialBars, Radar, Lollipop, Beeswarm, TagCloud, HeatStrip, Donut, Waffle, SlopeChart, StackedBars, usePlayer, PlayBar } from './charts-interactive';
import { fmt, weekLabel } from '@/lib/viz';

// "Market pulse" — external signals only, charts only. Each panel has its
// own chart form and at least one interaction. The Hacker News panels share
// a brushed time window (drag on the first chart) and a selected category
// (click a bubble or a band), so the whole section answers one question at
// a time.

type Series = { key: string; label: string; values: number[]; kind?: DataKind };
type Bucket = { label: string; count: number };
type MarketPayload = {
  generatedAt: string; rangeDays: number; weeks: string[]; refreshEveryMs?: number; nextRefreshAt?: string;
  hackerNews: { kind: 'live' | 'error'; source: string; sourceUrl?: string; api?: string; error?: string; showTotal?: number; aiShare?: number; weekly?: Series[]; categories?: { key: string; label: string; count: number }[]; top?: { id: string; title: string; url: string; hnUrl: string; points: number; comments: number; ai: boolean; category: string }[]; founderQuestions?: { id: string; title: string; hnUrl: string; points: number; comments: number }[]; byWeekday?: Bucket[]; pointsHist?: Bucket[]; categoryWeekly?: Series[]; categoryStats?: { key: string; label: string; launches: number; avgPoints: number; avgComments: number; attention: number; aiShare: number }[]; weekdayWeekly?: Series[]; pointsHistWeekly?: Series[] };
  github: { kind: 'live' | 'error'; source: string; sourceUrl?: string; api?: string; note?: string; error?: string; topics?: { key: string; label: string; total: number }[]; weekly?: Series[]; top?: { name: string; url: string; stars: number; forks: number; language: string | null; topic: string }[]; languages?: Bucket[]; starsHist?: Bucket[]; sampled?: number };
  ycombinator: { kind: 'live' | 'error'; source: string; sourceUrl?: string; api?: string; note?: string; error?: string; totalCompanies?: number; batches?: { label: string; companies: number; aiShare: number; industries: Bucket[]; topTags: Bucket[]; ukOrEurope: number; teamSizes: Bucket[]; tree: { label: string; count: number; children: Bucket[] }[]; regions: Bucket[]; regionGroups: Bucket[]; industryBubbles: { label: string; count: number; aiShare: number; avgTeam: number }[] }[] };
  problems?: { kind: string; note?: string; askScanned: number; ycScanned: number; ycUnmatched: number; ycBatches: string[]; hnScanned: number;
    faced: { key: string; label: string; posts: number; replies: number; points: number; example: { title: string; url: string; comments: number } | null }[];
    solved: { key: string; label: string; yc: number; hn: number; ycShare: number; hnShare: number; examples: string[] }[] };
  secFormD: { kind: 'live' | 'error'; source: string; sourceUrl?: string; api?: string; note?: string; error?: string; weekly?: Series[]; states?: Bucket[]; sampled?: number };
};

function SourceChip({ name, url }: { name: string; url?: string }) {
  const inner = <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.4, color: INK.sky, border: `1px solid ${INK.sky}55`, borderRadius: 999, padding: '3px 9px', whiteSpace: 'nowrap' }}>↗ {name.toUpperCase()}</span>;
  return url ? <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>{inner}</a> : inner;
}

const sumWindow = (s: Series, [a, b]: [number, number]) => s.values.slice(a, b + 1).reduce((x, y) => x + y, 0);
const short = (t: string, n = 46) => (t.length > n ? t.slice(0, n - 1) + '…' : t);

export default function MarketPulse({ range }: { range: number }) {
  const [data, setData] = useState<MarketPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [batchIdx, setBatchIdx] = useState(0);
  const [curve, setCurve] = useState<{ kind: string; dates: string[]; series: Series[]; note?: string; api?: string; error?: string } | null>(null);
  const [brush, setBrush] = useState<[number, number]>([0, 0]);
  const [cat, setCat] = useState<string | null>(null);
  const player = usePlayer(7000);
  const race = usePlayer(9000);

  useEffect(() => {
    let cancelled = false;
    insightsApi.marketGithubCurve().then(r => { if (!cancelled) setCurve(r.data); }).catch(() => { if (!cancelled) setCurve({ kind: 'error', dates: [], series: [], error: 'still loading' }); });
    return () => { cancelled = true; };
  }, []);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    insightsApi.market(range).then(r => { if (!cancelled) { setData(r.data); setError(null); setBrush([0, Math.max(0, (r.data.weeks?.length ?? 1) - 1)]); setCat(null); } }).catch(() => { if (!cancelled) setError('Market signals are temporarily unavailable.'); });
    return () => { cancelled = true; };
  }, [range, tick]);
  // Re-fetch a minute after the server's scheduled refresh is due, so an open
  // tab morphs to the new snapshot without a reload.
  useEffect(() => {
    if (!data?.nextRefreshAt) return;
    const delay = Math.max(60_000, new Date(data.nextRefreshAt).getTime() - Date.now() + 60_000);
    const id = setTimeout(() => setTick(t => t + 1), Math.min(delay, 2_147_000_000));
    return () => clearTimeout(id);
  }, [data?.nextRefreshAt]);

  const hn = data?.hackerNews, gh = data?.github, yc = data?.ycombinator, sec = data?.secFormD;
  const weeks = data?.weeks ?? [];
  const batches = yc?.batches ?? [];
  const batch = batches[batchIdx] ?? batches[0];
  const hnKind: DataKind = hn?.kind === 'live' ? 'live' : 'sample';
  const ghKind: DataKind = gh?.kind === 'live' ? 'live' : 'sample';
  const ycKind: DataKind = yc?.kind === 'live' ? 'live' : 'sample';
  const secKind: DataKind = sec?.kind === 'live' ? 'live' : 'sample';

  // ── Brushed re-aggregations for the HN panels ─────────────────────────────
  const win = useMemo(() => {
    if (!hn?.weekly) return null;
    const launches = sumWindow(hn.weekly[0], brush), ai = hn.weekly[1] ? sumWindow(hn.weekly[1], brush) : 0;
    const categories = (hn.categoryWeekly ?? []).map(s => ({ key: s.key, label: s.label, count: sumWindow(s, brush) })).sort((a, b) => b.count - a.count);
    const weekday = (hn.weekdayWeekly ?? []).map(s => ({ label: s.label, value: sumWindow(s, brush) }));
    const points = (hn.pointsHistWeekly ?? []).map(s => ({ label: s.label, value: sumWindow(s, brush) }));
    const aiWeekly = weeks.slice(brush[0], brush[1] + 1).map((w, i) => { const j = brush[0] + i; const t = hn.weekly![0].values[j]; return { label: weekLabel(w), value: t ? Math.round(((hn.weekly![1]?.values[j] ?? 0) / t) * 100) : 0 }; });
    return { launches, ai, aiShare: launches ? Math.round((ai / launches) * 100) : 0, categories, weekday, points, aiWeekly, label: `${weekLabel(weeks[brush[0]])} – ${weekLabel(weeks[brush[1]])}` };
  }, [hn, brush, weeks]);
  const catColor = useMemo(() => new Map((hn?.categoryWeekly ?? []).map((s, i) => [s.key, SERIES_COLORS[i % SERIES_COLORS.length]])), [hn]);
  const catLabel = (k: string | null) => hn?.categoryWeekly?.find(s => s.key === k)?.label ?? null;

  if (error) return <EmptyNote>{error}</EmptyNote>;
  if (!data) return <div style={{ padding: '60px 0', textAlign: 'center', color: INK.text3, fontFamily: INK.mono, fontSize: 12, letterSpacing: 2 }}>FETCHING MARKET SIGNALS…</div>;

  const hnChip = <SourceChip name="Hacker News" url={hn?.sourceUrl} />;
  const ghChip = <SourceChip name="GitHub" url={gh?.sourceUrl} />;
  const ycChip = <SourceChip name="YC" url={yc?.sourceUrl} />;
  const filterChip = cat ? <button onClick={() => setCat(null)} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, padding: '3px 9px', borderRadius: 999, border: `1px solid ${catColor.get(cat)}`, background: `${catColor.get(cat)}22`, color: INK.text, cursor: 'pointer' }}>{catLabel(cat)?.toUpperCase()} ✕</button> : null;
  const winChip = win ? <span style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, color: INK.lime }}>{win.label.toUpperCase()}</span> : null;

  const fmtTime = (iso?: string) => (iso ? new Date(iso).toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

  // ── Ledes: tweet-length narratives written from the live numbers ──────
  const lastFull = (v?: number[]) => (v && v.length >= 2 ? v[v.length - 2] : v?.[v.length - 1] ?? 0);
  const prevFull = (v?: number[]) => (v && v.length >= 3 ? v[v.length - 3] : 0);
  const pctDelta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : 0);
  const trendWord = (a: number, b: number) => { const d = pctDelta(a, b); return d > 3 ? `up ${d}%` : d < -3 ? `down ${Math.abs(d)}%` : 'flat'; };
  const lc = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);
  const dayName: Record<string, string> = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' };
  const S = {
    timeline: hn?.weekly ? `${fmt(hn.showTotal ?? 0)} products launched on Hacker News in ${data.rangeDays} days — ${hn.aiShare}% of them AI. Last full week: ${fmt(lastFull(hn.weekly[0].values))}, ${trendWord(lastFull(hn.weekly[0].values), prevFull(hn.weekly[0].values))} on the week before.` : undefined,
    aiShare: win ? (() => { const peak = [...win.aiWeekly].sort((a, b) => b.value - a.value)[0]; return `AI is ${win.aiShare}% of launches in this window${peak ? `, peaking at ${peak.value}% in the week of ${peak.label}` : ''}. One in ${win.aiShare ? Math.max(1, Math.round(100 / win.aiShare)) : '—'} launches mentions AI.`; })() : undefined,
    categories: win?.categories.length ? `${win.categories[0].label} leads with ${fmt(win.categories[0].count)} launches${win.categories[1] ? `; ${win.categories[1].label} follows at ${fmt(win.categories[1].count)}` : ''}. Click a bubble to follow one category across the page.` : undefined,
    weekday: win?.weekday.length ? (() => { const sorted = [...win.weekday].sort((a, b) => b.value - a.value); return `${dayName[sorted[0].label]} is launch day — ${fmt(sorted[0].value)} posts, vs ${fmt(sorted[sorted.length - 1].value)} on ${dayName[sorted[sorted.length - 1].label]}. Weekends have the least competition.`; })() : undefined,
    stream: hn?.categoryWeekly?.length ? (() => { const tot = hn.categoryWeekly.map(sr => ({ l: sr.label, n: sr.values.reduce((a, b) => a + b, 0), g: pctDelta(lastFull(sr.values), prevFull(sr.values)) })); const top = [...tot].sort((a, b) => b.n - a.n)[0]; const rising = [...tot].filter(t => t.n > 20).sort((a, b) => b.g - a.g)[0]; return `${top.l} is the widest band all window (${fmt(top.n)} launches)${rising && rising.l !== top.l && rising.g > 3 ? `; ${rising.l} is the fastest riser, up ${rising.g}% week on week` : ''}.`; })() : undefined,
    race: hn?.categoryWeekly?.length ? (() => { const tot = hn.categoryWeekly.map(sr => ({ l: sr.label, n: sr.values.reduce((a, b) => a + b, 0) })).sort((a, b) => b.n - a.n); return `Press play: ${tot[0].l} leads from the first week${tot[1] ? `, ${tot[1].l} chases at ${fmt(tot[1].n)}` : ''}. Watch who overtakes whom.`; })() : undefined,
    quadrant: hn?.categoryStats?.length ? (() => { const byAtt = [...hn.categoryStats].sort((a, b) => b.attention - a.attention)[0]; const byVol = [...hn.categoryStats].sort((a, b) => b.launches - a.launches)[0]; const avgL = hn.categoryStats.reduce((a, c) => a + c.launches, 0) / hn.categoryStats.length, avgA = hn.categoryStats.reduce((a, c) => a + c.attention, 0) / hn.categoryStats.length; const under = hn.categoryStats.filter(c => c.launches < avgL && c.attention > avgA).map(c => c.label); return `${byAtt.label} earns the most attention per launch (${byAtt.attention}); ${byVol.label} is the most crowded (${fmt(byVol.launches)}).${under.length ? ` Underserved corner: ${under.slice(0, 2).join(' and ')}.` : ''}`; })() : undefined,
    upvotes: win?.points.length ? (() => { const tot = win.points.reduce((a, b) => a + b.value, 0) || 1; const low = win.points[0]?.value ?? 0; const high = win.points.slice(3).reduce((a, b) => a + b.value, 0); return `${Math.round((low / tot) * 100)}% of launches get fewer than 5 upvotes; only ${Math.round((high / tot) * 100)}% clear 50. Launching is where distribution starts, not where it ends.`; })() : undefined,
    topLaunches: hn?.top?.[0] ? `The window's biggest launch, "${short(hn.top[0].title, 60)}", drew ${fmt(hn.top[0].points)} upvotes and ${fmt(hn.top[0].comments)} comments. ${hn.top.filter(t => t.ai).length} of the top ${hn.top.length} are AI products.` : undefined,
    questions: hn?.founderQuestions?.[0] ? `The most-answered founder question right now: "${short(hn.founderQuestions[0].title, 70)}" — ${fmt(hn.founderQuestions[0].comments)} replies.` : undefined,
    faced: data.problems?.faced?.length ? (() => { const f = data.problems.faced; const vi = f.findIndex(x => x.key === 'validation'); return `#1 worry: ${lc(f[0].label)} — ${fmt(f[0].posts)} threads, ${fmt(f[0].replies)} replies.${f[1] ? ` ${f[1].label} is #2.` : ''}${vi >= 0 ? ` Validation sits at #${vi + 1}.` : ''}`; })() : undefined,
    solved: data.problems?.solved?.length ? (() => { const sv = data.problems.solved; const ycTop = [...sv].sort((a, b) => b.ycShare - a.ycShare)[0], hnTop = [...sv].sort((a, b) => b.hnShare - a.hnShare)[0]; const gap = [...sv].sort((a, b) => Math.abs(b.ycShare - b.hnShare) - Math.abs(a.ycShare - a.hnShare))[0]; return `YC backs ${lc(ycTop.label.split(':')[0])} (${ycTop.ycShare}% of the batch); indie launches chase ${lc(hnTop.label.split(':')[0])} (${hnTop.hnShare}%). Widest gap: ${lc(gap.label.split(':')[0])}, ${gap.ycShare}% vs ${gap.hnShare}%.`; })() : undefined,
    funding: sec?.weekly?.[0] ? `${fmt(lastFull(sec.weekly[0].values))} US private financings filed with the SEC last full week — ${trendWord(lastFull(sec.weekly[0].values), prevFull(sec.weekly[0].values))} on the week before.${sec.states?.[0] ? ` ${sec.states[0].label} files the most.` : ''}` : undefined,
    stars: gh?.starsHist?.length ? (() => { const tot = gh.starsHist.reduce((a, b) => a + b.count, 0) || 1; const big = gh.starsHist[gh.starsHist.length - 1]?.count ?? 0; return `Even among breakout repos, ${Math.round(((gh.starsHist[0]?.count ?? 0) / tot) * 100)}% stay under 100 stars; ${fmt(big)} passed 10k. Attention compounds to a few.`; })() : undefined,
    topics: gh?.topics?.length ? (() => { const t = [...gh.topics].sort((a, b) => b.total - a.total); return `${fmt(t[0].total)} new "${t[0].label}" repos in 30 days${t[1] ? ` — ${Math.round(t[0].total / Math.max(1, t[1].total))}× "${t[1].label}"` : ''}. The tooling is free; the moat isn't the code.`; })() : undefined,
    languages: gh?.languages?.length ? (() => { const tot = gh.languages.reduce((a, b) => a + b.count, 0) || 1; return `${gh.languages[0].label} powers ${Math.round((gh.languages[0].count / tot) * 100)}% of breakout repos${gh.languages[1] ? `, ${gh.languages[1].label} ${Math.round((gh.languages[1].count / tot) * 100)}%` : ''}. Pick the stack your users' integrations speak.`; })() : undefined,
    breakout: gh?.top?.[0] ? `${gh.top[0].name} tops the window with ${fmt(gh.top[0].stars)} stars${gh.top[0].language ? ` (${gh.top[0].language})` : ''}. Click any dot to open the repo.` : undefined,
    curve: curve?.kind === 'live' && curve.series.length ? (() => { const g = curve.series.map(sr => ({ l: sr.label, a: sr.values[0], b: sr.values[sr.values.length - 1] })).sort((x, y) => pctDelta(y.b, y.a) - pctDelta(x.b, x.a))[0]; return `${g.l} grew ${pctDelta(g.b, g.a)}% in six months — ${fmt(g.a)} → ${fmt(g.b)} repositories. Press play to watch the curves bend.`; })() : undefined,
    ycSlope: batches.length > 1 ? (() => { const r = [...batches].reverse(); const a = r[0], b = r[r.length - 1]; return `AI share went ${a.aiShare}% → ${b.aiShare}% from ${a.label} to ${b.label}; UK & Europe ${Math.round((a.ukOrEurope / Math.max(1, a.companies)) * 100)}% → ${Math.round((b.ukOrEurope / Math.max(1, b.companies)) * 100)}%. Batch sizes: ${r.map(x => fmt(x.companies)).join(', ')}.`; })() : undefined,
    regions: batch?.regionGroups?.length ? (() => { const tot = batch.regionGroups.reduce((a, b) => a + b.count, 0) || 1; const na = batch.regionGroups.find(g => g.label === 'North America'), eu = batch.regionGroups.find(g => g.label === 'UK & Europe'); return `${batch.label}: ${Math.round(((na?.count ?? 0) / tot) * 100)}% North America, ${Math.round(((eu?.count ?? 0) / tot) * 100)}% UK & Europe. Being in the US is still the default.`; })() : undefined,
    industries: batch?.industries?.length ? `${batch.label} is ${Math.round((batch.industries[0].count / Math.max(1, batch.companies)) * 100)}% ${batch.industries[0].label}${batch.industries[1] ? `, then ${batch.industries[1].label} (${batch.industries[1].count})` : ''}. Hover a wedge for the count.` : undefined,
    tags: batch?.topTags?.length ? `"${batch.topTags[0].label}" is on ${fmt(batch.topTags[0].count)} of ${fmt(batch.companies)} ${batch.label} companies${batch.topTags[1] ? `; "${batch.topTags[1].label}" next at ${fmt(batch.topTags[1].count)}` : ''}.` : undefined,
    team: batch?.teamSizes?.length ? (() => { const tot = batch.teamSizes.reduce((a, b) => a + b.count, 0) || 1; const top = [...batch.teamSizes].sort((a, b) => b.count - a.count)[0]; const solo = batch.teamSizes.find(t => t.label === '1'); return `${Math.round((top.count / tot) * 100)}% of ${batch.label} companies have ${top.label} founder${top.label === '1' ? '' : 's'}; solo founders are ${Math.round(((solo?.count ?? 0) / tot) * 100)}%. YC still prefers pairs.`; })() : undefined,
    treemap: batch?.tree?.length ? `${batch.tree[0].label} is the biggest slice (${fmt(batch.tree[0].count)} companies)${batch.tree[0].children?.[0] ? `; its busiest niche is ${batch.tree[0].children[0].label}` : ''}. Hover any tile for the count.` : undefined,
    regionBubbles: batch?.regions?.length ? `${batch.regions[0].label} dominates with ${fmt(batch.regions[0].count)}${batch.regions[1] ? `; ${batch.regions[1].label} is next at ${fmt(batch.regions[1].count)}` : ''}.` : undefined,
    bubbles: batch?.industryBubbles?.length ? (() => { const ai = [...batch.industryBubbles].sort((a, b) => b.aiShare - a.aiShare)[0]; const avg = batch.industryBubbles.reduce((a, b) => a + b.avgTeam * b.count, 0) / Math.max(1, batch.industryBubbles.reduce((a, b) => a + b.count, 0)); return `${ai.label} is the most AI-heavy industry (${ai.aiShare}%). Teams average ${avg.toFixed(1)} founders; bigger bubbles are bigger industries.`; })() : undefined,
  };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 14, flexWrap: 'wrap', margin: '-6px 0 12px', fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: INK.text3 }}>
        <span><span style={{ color: INK.lime }}>●</span> DATA REFRESHED {fmtTime(data.generatedAt).toUpperCase()}</span>
        <span>AUTO-REFRESH EVERY {Math.round((data.refreshEveryMs ?? 4 * 3600_000) / 3600_000)}H · NEXT {fmtTime(data.nextRefreshAt).toUpperCase()}</span>
      </div>
    <div className="ins-grid">
      {/* ── Hacker News ─────────────────────────────────────────────── */}
      <Panel span={3} title="Show HN launches per week — drag to choose a window" story={S.timeline} kind={hnKind} note={hn?.api ?? hn?.error} right={hnChip}>
        {hn?.weekly ? <BrushTimeline weeks={weeks} series={hn.weekly} brush={brush} onBrush={setBrush} /> : <EmptyNote>Unavailable</EmptyNote>}
      </Panel>

      <Panel title="AI share, week by week" story={S.aiShare} kind={hnKind} note="Title keywords · hover a bar" right={winChip}>
        <RadialBars items={win?.aiWeekly ?? []} unit="%" color={INK.lime} center={<><div style={{ fontSize: 28, fontWeight: 800 }}>{win?.aiShare ?? 0}%</div><div style={{ fontFamily: INK.mono, fontSize: 9, letterSpacing: 1, color: INK.text3 }}>AI · {fmt(win?.launches ?? 0)} LAUNCHES</div></>} />
      </Panel>

      <Panel title="What's being launched — click a bubble to focus" story={S.categories} kind={hnKind} note="Keyword classification of titles" right={<>{filterChip}{winChip}</>}>
        <div onClick={e => { const t = (e.target as HTMLElement).closest('g[data-key]') as HTMLElement | null; if (t) setCat(c => (c === t.dataset.key ? null : t.dataset.key!)); }}>
          <CategoryBubbles items={win?.categories ?? []} colors={catColor} selected={cat} />
        </div>
      </Panel>

      <Panel title="Which day do people launch?" story={S.weekday} kind={hnKind} note="Show HN posts by weekday (UTC) · dotted = whole range" right={winChip}>
        <Radar items={win?.weekday ?? []} color={INK.sky} compare={(hn?.byWeekday ?? []).map(b => ({ label: b.label, value: b.count * ((brush[1] - brush[0] + 1) / Math.max(1, weeks.length)) }))} />
      </Panel>

      <Panel span={3} title={`Launch categories over time${cat ? ` — ${catLabel(cat)}` : ''} — click a band`} story={S.stream} kind={hnKind} note="Weekly Show HN volume per category" right={<>{filterChip}{hnChip}</>}>
        {hn?.categoryWeekly?.length ? <Streamgraph weeks={weeks} series={hn.categoryWeekly} highlightKey={cat} onSelect={setCat} /> : <EmptyNote>Unavailable</EmptyNote>}
      </Panel>

      <Panel span={3} title="Category race — press play" story={S.race} kind={hnKind} note="Cumulative Show HN launches per category, week by week" right={hnChip}>
        <PlayBar player={race} label={`${weekLabel(weeks[0] ?? '')} → ${weekLabel(weeks[weeks.length - 1] ?? '')}`} />
        <BarRace weeks={weeks} series={hn?.categoryWeekly ?? []} progress={race.progress} colors={catColor} />
      </Panel>

      <Panel span={2} title="Opportunity quadrant — attention vs. competition" story={S.quadrant} kind={hnKind} note="x = launches in the category (competition); y = average upvotes + comments per launch (attention); bubble = AI share" right={<>{filterChip}{hnChip}</>}>
        <QuadrantScatter xLabel="Launches" yLabel="Attention per launch" sizeLabel="AI share %" quadrantLabels={['Underserved · high attention', 'Hot · crowded', 'Quiet', 'Crowded · low attention']}
          points={(hn?.categoryStats ?? []).map(c => ({ label: c.label, x: c.launches, y: c.attention, size: Math.max(1, c.aiShare), color: cat && cat !== c.key ? '#4a4357' : catColor.get(c.key) }))} />
      </Panel>

      <Panel title="How many upvotes do launches get?" story={S.upvotes} kind={hnKind} note="Distribution · toggle linear / log" right={winChip}>
        <Lollipop items={win?.points ?? []} color={INK.amber} />
      </Panel>

      <Panel span={2} title="Most-upvoted launches — hover, click to open" story={S.topLaunches} kind={hnKind} note="Upvotes vs. comments, log scales" right={hnChip}>
        <Beeswarm xLabel="Upvotes" yLabel="Comments" points={(hn?.top ?? []).map(t => ({ label: t.title, x: t.points, y: t.comments, href: t.hnUrl, tag: t.ai ? 'AI' : 'Not AI' }))} colorKey={t => (t === 'AI' ? INK.lime : INK.violetHi)} />
      </Panel>

      <Panel title="What founders are asking" story={S.questions} kind={hnKind} note="Ask HN threads sized by replies · click to read" right={<SourceChip name="Ask HN" url="https://news.ycombinator.com/ask" />}>
        <TagCloud items={(hn?.founderQuestions ?? []).map(q => ({ label: short(q.title, 40), value: q.comments, href: q.hnUrl, meta: `▲ ${q.points} · ${q.comments} replies` }))} color={INK.rose} minSize={11} maxSize={18} />
      </Panel>

      {/* ── Problems: faced vs. solved ──────────────────────────────── */}
      <Panel span={3} title="Top 10 problems early-stage founders are facing" story={S.faced} kind={data.problems?.kind === 'live' ? 'live' : 'sample'} note={`${fmt(data.problems?.askScanned ?? 0)} Ask HN threads scanned in this range · bar = threads, number = replies · click a row to open the busiest thread`} right={<SourceChip name="Ask HN" url="https://news.ycombinator.com/ask" />}>
        <ProblemsFaced items={data.problems?.faced ?? []} />
      </Panel>

      <Panel span={3} title="Top 10 problems their startups are solving" story={S.solved} kind={data.problems?.kind === 'live' ? 'live' : 'sample'} note={`YC ${(data.problems?.ycBatches ?? []).join(' + ')} one-liners (${fmt(data.problems?.ycScanned ?? 0)} companies) and ${fmt(data.problems?.hnScanned ?? 0)} Show HN launches · hover a row for examples`} right={<><SourceChip name="YC" url={yc?.sourceUrl} /><SourceChip name="Show HN" url={hn?.sourceUrl} /></>}>
        <ProblemsSolved items={data.problems?.solved ?? []} />
      </Panel>

      {/* ── Funding pulse ───────────────────────────────────────────── */}
      <Panel span={2} title="Funding pulse — US private offerings filed each week" story={S.funding} kind={secKind} note={sec?.note ?? sec?.error} right={<SourceChip name="SEC EDGAR" url={sec?.sourceUrl} />}>
        <HeatStrip cells={weeks.map((w, i) => ({ label: weekLabel(w), value: sec?.weekly?.[0]?.values[i] ?? 0 }))} color={INK.amber} labelEvery={weeks.length > 16 ? 4 : 2} title="Form D filings per week · hover a cell" />
        <div style={{ height: 14 }} />
        <HeatStrip cells={(sec?.states ?? []).map(s => ({ label: s.label, value: s.count }))} color={INK.sky} labelEvery={1} title={`Where the latest ${sec?.sampled ?? 100} filings come from (US state)`} />
      </Panel>

      <Panel title="Where new repos get their stars" story={S.stars} kind={ghKind} note="Stars collected by new repos · toggle linear / log" right={ghChip}>
        <Lollipop items={(gh?.starsHist ?? []).map(b => ({ label: b.label, value: b.count }))} color={INK.violetHi} />
      </Panel>

      {/* ── GitHub ──────────────────────────────────────────────────── */}
      <Panel title="New repos by topic" story={S.topics} kind={ghKind} note={gh?.note ?? gh?.error} right={ghChip}>
        <PackedBubbles items={(gh?.topics ?? []).map(t => ({ label: t.label, count: t.total }))} height={260} color={INK.sky} />
      </Panel>

      <Panel title="Languages of breakout repos — hover" story={S.languages} kind={ghKind} note={`Across the ${fmt(gh?.sampled ?? 0)} most-starred new repos`} right={ghChip}>
        <Donut items={(gh?.languages ?? []).map(l => ({ label: l.label, value: l.count }))} center={<><div style={{ fontSize: 22, fontWeight: 800 }}>{fmt(gh?.sampled ?? 0)}</div><div style={{ fontFamily: INK.mono, fontSize: 9, letterSpacing: 1, color: INK.text3 }}>REPOS</div></>} />
      </Panel>

      <Panel title="Breakout repositories — click to open" story={S.breakout} kind={ghKind} note="Stars vs. forks, log scales, colour = topic" right={ghChip}>
        <Beeswarm xLabel="Stars" yLabel="Forks" height={260} points={(gh?.top ?? []).map(r => ({ label: r.name, x: r.stars, y: r.forks, href: r.url, tag: r.topic, meta: r.language ?? undefined }))} />
      </Panel>

      <Panel span={3} title="Technology adoption curves — press play" story={S.curve} kind={curve?.kind === 'live' ? 'live' : 'sample'} note={curve?.note ?? curve?.api ?? 'GitHub search is rate-limited, first load can take ~2 minutes'} right={ghChip}>
        {curve?.kind === 'live' && curve.series.length ? (
          <>
            <PlayBar player={player} label={`${curve.dates[0]} → ${curve.dates[curve.dates.length - 1]}`} />
            <AreaLines weeks={curve.dates} series={curve.series} height={260} progress={player.progress || 0.001} />
          </>
        ) : <div style={{ padding: '40px 0', textAlign: 'center', color: INK.text3, fontFamily: INK.mono, fontSize: 11, letterSpacing: 2 }}>{curve?.kind === 'error' ? 'LOADING ADOPTION CURVES… REFRESH IN A MINUTE' : 'LOADING…'}</div>}
      </Panel>

      {/* ── Y Combinator ────────────────────────────────────────────── */}
      <Panel span={2} title="Latest YC batches — AI share and size, batch to batch" story={S.ycSlope} kind={ycKind} note={yc?.note ?? yc?.error} right={ycChip}>
        <SlopeChart columns={[...batches].reverse().map(b => b.label)} unit="%" series={[
          { label: 'AI share', values: [...batches].reverse().map(b => b.aiShare), color: INK.lime, sizes: [...batches].reverse().map(b => b.companies) },
          { label: 'UK & Europe share', values: [...batches].reverse().map(b => Math.round((b.ukOrEurope / Math.max(1, b.companies)) * 100)), color: INK.sky },
        ]} />
      </Panel>

      <Panel title="Where each batch is from" story={S.regions} kind={ycKind} note="Share of companies by region group · hover" right={ycChip}>
        <StackedBars keys={batches[0]?.regionGroups?.map(g => g.label) ?? []} rows={[...batches].reverse().map(b => ({ label: b.label, values: b.regionGroups?.map(g => g.count) ?? [] }))} />
      </Panel>

      <Panel title="Industries in the batch" story={S.industries} kind={ycKind} note="Hover a wedge" right={ycChip}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {batches.map((b, i) => <button key={b.label} onClick={() => setBatchIdx(i)} aria-pressed={i === batchIdx} style={{ fontFamily: INK.mono, fontSize: 10, letterSpacing: 1, padding: '4px 10px', borderRadius: 999, border: `1px solid ${i === batchIdx ? INK.lime : INK.border}`, background: i === batchIdx ? INK.lime : 'transparent', color: i === batchIdx ? INK.bg : INK.text3, cursor: 'pointer' }}>{b.label.toUpperCase()}</button>)}
        </div>
        <RadialBars items={(batch?.industries ?? []).slice(0, 8).map(i => ({ label: i.label.length > 11 ? i.label.slice(0, 10) + '…' : i.label, value: i.count }))} color={INK.amber} center={<><div style={{ fontSize: 24, fontWeight: 800 }}>{fmt(batch?.companies ?? 0)}</div><div style={{ fontFamily: INK.mono, fontSize: 9, letterSpacing: 1, color: INK.text3 }}>{batch?.label.toUpperCase()}</div></>} />
      </Panel>

      <Panel title="Most common tags" story={S.tags} kind={ycKind} note={`${batch?.label ?? ''} · sized by count`} right={ycChip}>
        <TagCloud items={(batch?.topTags ?? []).map(t => ({ label: t.label, value: t.count }))} color={INK.violetHi} minSize={12} maxSize={28} />
      </Panel>

      <Panel title="Founding team size" story={S.team} kind={ycKind} note={`${batch?.label ?? ''} · each square is 1% of companies`} right={ycChip}>
        <Waffle items={(batch?.teamSizes ?? []).map(t => ({ label: `${t.label} founder${t.label === '1' ? '' : 's'}`, value: t.count }))} />
      </Panel>

      <Panel span={2} title={`Startup ecosystem treemap — ${batch?.label ?? ''}`} story={S.treemap} kind={ycKind} note="Industry → sub-industry, sized by company count · hover" right={ycChip}>
        <Treemap data={batch?.tree ?? []} />
      </Panel>

      <Panel title={`Where the batch is based — ${batch?.label ?? ''}`} story={S.regionBubbles} kind={ycKind} note="First listed region per company" right={ycChip}>
        <PackedBubbles items={batch?.regions ?? []} height={360} />
      </Panel>

      <Panel span={3} title={`Industry bubble chart — ${batch?.label ?? ''}`} story={S.bubbles} kind={ycKind} note="x = average founding-team size; y = share of companies that are AI-related; bubble = number of companies · hover" right={ycChip}>
        <QuadrantScatter xLabel="Avg team size" yLabel="AI share %" sizeLabel="companies" height={320}
          points={(batch?.industryBubbles ?? []).map(b => ({ label: b.label, x: b.avgTeam, y: b.aiShare, size: b.count }))} />
      </Panel>
    </div>
    </>
  );
}

// Category bubbles: packed circles coloured per category, selectable.
function CategoryBubbles({ items, colors, selected }: { items: { key: string; label: string; count: number }[]; colors: Map<string, string>; selected: string | null }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...items.map(i => i.count));
  if (!items.length) return <EmptyNote>No launches in this window.</EmptyNote>;
  return (
    <svg width="100%" viewBox="0 0 400 300" style={{ display: 'block' }} onMouseLeave={() => setHover(null)}>
      {items.map((it, i) => {
        const cols = 3, col = i % cols, row = Math.floor(i / cols);
        const cx = 70 + col * 130, cy = 60 + row * 95;
        const r = 14 + 38 * Math.sqrt(it.count / max);
        const c = colors.get(it.key) ?? INK.violetHi;
        const on = (!selected || selected === it.key) && (!hover || hover === it.key);
        return (
          <g key={it.key} data-key={it.key} transform={`translate(${cx},${cy})`} style={{ cursor: 'pointer', opacity: on ? 1 : 0.3, transition: 'opacity .2s' }} onMouseEnter={() => setHover(it.key)}>
            <circle r={r} fill={c} fillOpacity={selected === it.key ? 0.6 : 0.28} stroke={c} strokeWidth={selected === it.key ? 2.5 : 1.2} style={{ filter: `drop-shadow(0 0 ${selected === it.key ? 14 : 6}px ${c}66)`, transition: 'all .25s' }} />
            <text textAnchor="middle" dy="-0.15em" fontFamily={INK.ui} fontSize={10} fontWeight={700} fill={INK.text} style={{ pointerEvents: 'none' }}>{it.label.length > 14 ? it.label.split(' ')[0] : it.label}</text>
            <text textAnchor="middle" dy="1.1em" fontFamily={INK.mono} fontSize={10} fill={INK.text2} style={{ pointerEvents: 'none' }}>{fmt(it.count)}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ── 13. Bar chart race ──────────────────────────────────────────────────────
// `series` are weekly counts per entity; progress 0→1 sweeps through the
// weeks, accumulating. Bars re-sort and slide with CSS transitions.
function BarRace({ weeks, series, progress, colors, topN = 8 }: { weeks: string[]; series: { key: string; label: string; values: number[] }[]; progress: number; colors?: Map<string, string>; topN?: number }) {
  const m = weeks.length;
  // `done` = weeks fully counted; the week in progress is interpolated.
  const done = Math.max(0, Math.min(m, progress * m));
  const i0 = Math.floor(done), frac = done - i0;
  const totals = series.map(s => { let acc = 0; for (let j = 0; j < i0; j++) acc += s.values[j] ?? 0; if (i0 < m) acc += (s.values[i0] ?? 0) * frac; return { key: s.key, label: s.label, value: acc }; });
  const pos = Math.max(0, Math.min(m - 1, Math.ceil(done) - 1));
  const sorted = [...totals].sort((a, b) => b.value - a.value).slice(0, topN);
  const rank = new Map(sorted.map((s, i) => [s.key, i]));
  const max = Math.max(1, ...sorted.map(s => s.value));
  const rowH = 34;
  return (
    <div style={{ position: 'relative', height: rowH * topN + 8 }}>
      {totals.filter(t => rank.has(t.key)).map((t, idx) => {
        const r = rank.get(t.key)!, c = colors?.get(t.key) ?? SERIES_COLORS[idx % SERIES_COLORS.length];
        return (
          <div key={t.key} style={{ position: 'absolute', left: 0, right: 0, top: r * rowH, height: rowH - 6, display: 'grid', gridTemplateColumns: '150px 1fr 60px', alignItems: 'center', gap: 10, transition: 'top .45s cubic-bezier(.2,.8,.2,1)' }}>
            <span style={{ fontFamily: INK.ui, fontSize: 12, fontWeight: 600, color: INK.text2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textAlign: 'right' }}>{t.label}</span>
            <div style={{ height: '100%', borderRadius: 8, background: INK.surfaceHi, overflow: 'hidden' }}><div style={{ height: '100%', width: `${(t.value / max) * 100}%`, background: `linear-gradient(90deg, ${c}, ${c}99)`, borderRadius: 8, transition: 'width .12s linear', boxShadow: `0 0 12px ${c}44` }} /></div>
            <span style={{ fontFamily: INK.mono, fontSize: 12, color: INK.text, fontVariantNumeric: 'tabular-nums' }}>{fmt(Math.round(t.value))}</span>
          </div>
        );
      })}
      <div style={{ position: 'absolute', right: 0, bottom: -6, fontFamily: INK.mono, fontSize: 11, letterSpacing: 1.5, color: INK.lime }}>{m ? weekLabel(weeks[pos]).toUpperCase() : ''} · CUMULATIVE</div>
    </div>
  );
}

// ── Problems founders are facing: ranked rows, bar = threads, pill = replies ──
function ProblemsFaced({ items }: { items: { key: string; label: string; posts: number; replies: number; example: { title: string; url: string; comments: number } | null }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(1, ...items.map(i => i.posts));
  if (!items.length) return <EmptyNote>No founder threads matched in this range.</EmptyNote>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {items.map((it, i) => (
        <a key={it.key} href={it.example?.url} target="_blank" rel="noopener noreferrer" onMouseEnter={() => setHover(it.key)} onMouseLeave={() => setHover(null)}
          style={{ display: 'grid', gridTemplateColumns: '28px minmax(180px, 1fr) 2fr 130px', alignItems: 'center', gap: 12, textDecoration: 'none', color: INK.text, padding: '6px 10px', borderRadius: 12, background: hover === it.key ? INK.surfaceHi : 'transparent', transition: 'background .2s' }}>
          <span style={{ fontFamily: INK.mono, fontSize: 12, color: i < 3 ? INK.lime : INK.text3 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{it.label}{hover === it.key && it.example && <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: INK.text3, marginTop: 2 }}>e.g. "{it.example.title}" · {it.example.comments} replies ↗</span>}</span>
          <span style={{ height: 10, borderRadius: 999, background: INK.surfaceHi, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(it.posts / max) * 100}%`, borderRadius: 999, background: `linear-gradient(90deg, ${INK.rose}, ${INK.amber})`, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }} /></span>
          <span style={{ fontFamily: INK.mono, fontSize: 11, color: INK.text2, textAlign: 'right', whiteSpace: 'nowrap' }}>{fmt(it.posts)} <span style={{ color: INK.text3 }}>threads</span> · {fmt(it.replies)} <span style={{ color: INK.text3 }}>replies</span></span>
        </a>
      ))}
    </div>
  );
}

// ── Problems startups are solving: two scales per row (share of YC batch, share of HN launches) ──
function ProblemsSolved({ items }: { items: { key: string; label: string; yc: number; hn: number; ycShare: number; hnShare: number; examples: string[] }[] }) {
  const [hover, setHover] = useState<string | null>(null);
  const maxYc = Math.max(1, ...items.map(i => i.ycShare)), maxHn = Math.max(1, ...items.map(i => i.hnShare));
  if (!items.length) return <EmptyNote>Nothing classified yet.</EmptyNote>;
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '28px minmax(180px, 1fr) 1.2fr 1.2fr', gap: 12, padding: '0 10px', fontFamily: INK.mono, fontSize: 10, letterSpacing: 1.5, color: INK.text3 }}>
        <span /><span /><span style={{ color: INK.lime }}>● YC · % OF BATCH</span><span style={{ color: INK.violetHi }}>● SHOW HN · % OF LAUNCHES</span>
      </div>
      {items.map((it, i) => (
        <div key={it.key} onMouseEnter={() => setHover(it.key)} onMouseLeave={() => setHover(null)} style={{ display: 'grid', gridTemplateColumns: '28px minmax(180px, 1fr) 1.2fr 1.2fr', alignItems: 'center', gap: 12, padding: '6px 10px', borderRadius: 12, background: hover === it.key ? INK.surfaceHi : 'transparent', transition: 'background .2s' }}>
          <span style={{ fontFamily: INK.mono, fontSize: 12, color: i < 3 ? INK.lime : INK.text3 }}>{String(i + 1).padStart(2, '0')}</span>
          <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.25 }}>{it.label}{hover === it.key && it.examples.length > 0 && <span style={{ display: 'block', fontSize: 11, fontWeight: 400, color: INK.text3, marginTop: 2 }}>{it.examples.slice(0, 2).join(' · ')}</span>}</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1, height: 10, borderRadius: 999, background: INK.surfaceHi, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(it.ycShare / maxYc) * 100}%`, borderRadius: 999, background: INK.lime, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }} /></span><span style={{ fontFamily: INK.mono, fontSize: 11, color: INK.text2, width: 44, textAlign: 'right' }}>{it.ycShare}%</span></span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ flex: 1, height: 10, borderRadius: 999, background: INK.surfaceHi, overflow: 'hidden' }}><span style={{ display: 'block', height: '100%', width: `${(it.hnShare / maxHn) * 100}%`, borderRadius: 999, background: INK.violetHi, transition: 'width 1s cubic-bezier(.2,.8,.2,1)' }} /></span><span style={{ fontFamily: INK.mono, fontSize: 11, color: INK.text2, width: 44, textAlign: 'right' }}>{it.hnShare}%</span></span>
        </div>
      ))}
    </div>
  );
}
