import { ReactNode } from 'react';
import { computeValidationConfidence } from '@/utils/validationConfidence';

// ── Interview result charts ──────────────────────────────────────────────────
// Rendered right after an interview's AI analysis completes — automatically
// once logging finishes (see InterviewsPage's classifyInterview), or after a
// manual "🤖 Analyze with AI" / re-analyze from AIAlignmentPanel. Shown in two
// places with identical content: a one-time "Analysis complete" modal, and
// permanently inside AIAlignmentPanel so the founder can come back to it.
//
// Two kinds of chart here: the first three are about THIS interview alone
// (verdict, evidence texture, agreement with the founder's own call); the
// last four zoom out to what this interview does to the whole validation
// picture (trend, distribution, sample progress, confidence dimensions) —
// reusing the same computeValidationConfidence pipeline that drives the
// Validate stage's Analyse/Decision steps, so the numbers never disagree.
//
// Plain module-scope functions, not components nested inside a parent's
// render — see the 2026-07-24 WorkPage.tsx nested-component note in project
// memory for why that distinction matters once anything here grows local
// state (none of these have any yet, but the convention is cheap to keep).

const BORDER = '#e5e5ea';
const T1 = '#1d1d1f';
const T2 = '#6e6e73';
const T3 = '#9a9aa2';
const TRACK = '#f0f0f2';

// Reserved status colors — same green/amber/red/gray used everywhere else in
// this app for Confirmed/Partial/Not confirmed/Unscored (ALIGN_BADGE in
// InterviewsPage.tsx, the Confidence Score card in WorkPage.tsx). Charts here
// deliberately reuse these rather than a new palette, so a founder never has
// to re-learn what a color means between one screen and the next.
const CONFIRMED = '#059669';
const PARTIAL = '#d97706';
const NOT_CONFIRMED = '#dc2626';
const UNSCORED = '#c7c7cc';
const NEUTRAL = '#8e8e93';

type Evidence = { quote: string; signal: 'positive' | 'negative' | 'neutral' };
type Interview = {
  id: string;
  interviewee_name?: string;
  alignment_score?: number | null;
  ai_alignment_score?: 1 | 2 | 3 | null;
  ai_evidence?: Evidence[];
  score_overridden?: boolean;
};

const verdictMeta = (score: number | null | undefined) =>
  score === 3 ? { label: 'Confirmed', color: CONFIRMED }
  : score === 2 ? { label: 'Partial signal', color: PARTIAL }
  : score === 1 ? { label: 'Not confirmed', color: NOT_CONFIRMED }
  : { label: 'Not yet analyzed', color: UNSCORED };

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div style={{ border: `1.5px solid ${BORDER}`, borderRadius: 12, padding: '14px 16px', background: '#fff', display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 260px', minWidth: 240 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: T1 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 10.5, color: T3, marginTop: 1 }}>{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

// 1 — Verdict gauge: where THIS interview's AI read landed, at a glance.
function VerdictGauge({ score }: { score: 1 | 2 | 3 | null | undefined }) {
  const meta = verdictMeta(score);
  const pct = score ? score / 3 : 0;
  const HALF_C = Math.PI * 54;
  return (
    <ChartCard title="Verdict" subtitle="This interview's AI read">
      <div style={{ textAlign: 'center' as const }}>
        <svg width="130" height="70" viewBox="0 0 130 74">
          <path d="M10,64 A55,55 0 0,1 120,64" fill="none" stroke={TRACK} strokeWidth="11" strokeLinecap="round" />
          <path d="M10,64 A55,55 0 0,1 120,64" fill="none" stroke={meta.color} strokeWidth="11" strokeLinecap="round"
            strokeDasharray={`${pct * HALF_C} ${HALF_C}`} style={{ transition: 'stroke-dasharray .4s' }} />
        </svg>
        <div style={{ fontSize: 16, fontWeight: 900, color: meta.color, marginTop: -10 }}>{meta.label}</div>
      </div>
    </ChartCard>
  );
}

// 2 — Evidence signal breakdown: the texture behind the verdict — how many
// quotes the AI pulled from THIS interview were positive/negative/neutral.
function EvidenceBreakdown({ evidence }: { evidence: Evidence[] }) {
  const pos = evidence.filter(e => e.signal === 'positive').length;
  const neg = evidence.filter(e => e.signal === 'negative').length;
  const neu = evidence.filter(e => e.signal === 'neutral').length;
  const total = pos + neg + neu;
  const segs = [
    { n: pos, color: CONFIRMED, label: 'Positive' },
    { n: neg, color: NOT_CONFIRMED, label: 'Negative' },
    { n: neu, color: NEUTRAL, label: 'Neutral' },
  ];
  return (
    <ChartCard title="Evidence signal" subtitle={total ? `${total} quote${total !== 1 ? 's' : ''} extracted` : 'No quotes extracted'}>
      {total > 0 ? (
        <>
          <div style={{ display: 'flex', height: 14, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
            {segs.filter(s => s.n > 0).map(s => (
              <div key={s.label} style={{ width: `${(s.n / total) * 100}%`, background: s.color, minWidth: 4 }} title={`${s.label}: ${s.n}`} />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
            {segs.map(s => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: T2 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
                {s.label} <strong style={{ color: T1 }}>{s.n}</strong>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ fontSize: 12, color: T3 }}>The AI didn't extract any standout quotes from this transcript.</div>
      )}
    </ChartCard>
  );
}

// 3 — AI vs. founder agreement: a 1–3 strip with both raters' marks. They sit
// on the same dot when the founder's call still matches the AI's (the normal
// case right after auto-classification); they separate only once the founder
// has actively overridden the AI's read for this interview.
function AgreementStrip({ aiScore, humanScore, overridden }: { aiScore: 1 | 2 | 3 | null | undefined; humanScore: number | null | undefined; overridden?: boolean }) {
  const posFor = (s: number) => `${((s - 1) / 2) * 100}%`;
  const aiMeta = verdictMeta(aiScore);
  const humanMeta = verdictMeta(humanScore);
  const showBoth = overridden && humanScore != null && aiScore != null && humanScore !== aiScore;
  return (
    <ChartCard title="AI vs. your call" subtitle={showBoth ? 'You overrode the AI’s read' : 'Your call matches the AI’s read'}>
      <div style={{ position: 'relative' as const, height: 34, margin: '6px 4px 0' }}>
        <div style={{ position: 'absolute' as const, top: 15, left: 0, right: 0, height: 4, borderRadius: 2, background: TRACK }} />
        {[1, 2, 3].map(s => (
          <div key={s} style={{ position: 'absolute' as const, top: 8, left: posFor(s), width: 2, height: 18, background: '#e5e5ea', transform: 'translateX(-1px)' }} />
        ))}
        {aiScore != null && (
          <div title={`AI: ${aiMeta.label}`} style={{ position: 'absolute' as const, top: showBoth ? 2 : 8, left: posFor(aiScore), width: 16, height: 16, borderRadius: '50%', background: aiMeta.color, border: '2px solid #fff', boxShadow: '0 0 0 1px ' + aiMeta.color + '50', transform: 'translateX(-8px)' }} />
        )}
        {showBoth && (
          <div title={`You: ${humanMeta.label}`} style={{ position: 'absolute' as const, top: 20, left: posFor(humanScore as number), width: 16, height: 16, borderRadius: '50%', background: '#fff', border: `2.5px solid ${humanMeta.color}`, transform: 'translateX(-8px)' }} />
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T3 }}>
        <span>Not confirmed</span><span>Partial</span><span>Confirmed</span>
      </div>
      {showBoth && (
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: T2 }}>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: aiMeta.color, marginRight: 5 }} />AI: {aiMeta.label}</span>
          <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', border: `2px solid ${humanMeta.color}`, marginRight: 5 }} />You: {humanMeta.label}</span>
        </div>
      )}
    </ChartCard>
  );
}

// 4 — Running confidence trend: the overall validation confidence score
// recomputed at each interview (in log order) so the founder can see whether
// this new conversation moved the needle, not just how it scored alone.
function ConfidenceTrend({ allInterviews, get }: { allInterviews: any[]; get: (k: string) => string }) {
  const points = allInterviews.map((_, i) => computeValidationConfidence(allInterviews.slice(0, i + 1), get).score);
  if (points.length < 2) {
    return (
      <ChartCard title="Confidence trend" subtitle="By interview, in log order">
        <div style={{ fontSize: 12, color: T3 }}>Needs at least 2 interviews to show a trend — currently {points.length}.</div>
      </ChartCard>
    );
  }
  const W = 220, H = 56, PAD = 6;
  const max = 100, min = 0;
  const xAt = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const yAt = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
  const d = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i)},${yAt(v)}`).join(' ');
  const last = points[points.length - 1];
  const prev = points[points.length - 2];
  const delta = last - prev;
  const lineColor = last >= 65 ? CONFIRMED : last >= 40 ? PARTIAL : NOT_CONFIRMED;
  return (
    <ChartCard title="Confidence trend" subtitle="By interview, in log order">
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <path d={`M${PAD},${yAt(0)} L${W - PAD},${yAt(0)}`} stroke="#f1f5f9" strokeWidth={1} />
        <path d={d} fill="none" stroke={lineColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={xAt(points.length - 1)} cy={yAt(last)} r={4} fill={lineColor} stroke="#fff" strokeWidth={2} />
      </svg>
      <div style={{ fontSize: 12, color: T2 }}>
        Now <strong style={{ color: lineColor }}>{last}</strong>
        {delta !== 0 && (
          <span style={{ color: delta > 0 ? CONFIRMED : NOT_CONFIRMED, marginLeft: 6 }}>
            {delta > 0 ? '▲' : '▼'} {Math.abs(delta)} from the previous interview
          </span>
        )}
      </div>
    </ChartCard>
  );
}

// 5 — Cumulative verdict distribution across every interview so far, with
// this one's own category called out underneath.
function VerdictDistribution({ allInterviews, currentId }: { allInterviews: Interview[]; currentId: string }) {
  const counts = { confirmed: 0, partial: 0, not: 0, unscored: 0 };
  allInterviews.forEach(iv => {
    const s = iv.ai_alignment_score ?? iv.alignment_score;
    if (s === 3) counts.confirmed++;
    else if (s === 2) counts.partial++;
    else if (s === 1) counts.not++;
    else counts.unscored++;
  });
  const total = allInterviews.length || 1;
  const segs = [
    { key: 'confirmed', n: counts.confirmed, color: CONFIRMED, label: 'Confirmed' },
    { key: 'partial', n: counts.partial, color: PARTIAL, label: 'Partial' },
    { key: 'not', n: counts.not, color: NOT_CONFIRMED, label: 'Not confirmed' },
    { key: 'unscored', n: counts.unscored, color: UNSCORED, label: 'Unscored' },
  ];
  const current = allInterviews.find(iv => iv.id === currentId);
  const currentLabel = verdictMeta(current?.ai_alignment_score ?? current?.alignment_score).label;
  return (
    <ChartCard title="Verdict distribution" subtitle={`Across all ${allInterviews.length} interview${allInterviews.length !== 1 ? 's' : ''}`}>
      <div style={{ display: 'flex', height: 16, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
        {segs.filter(s => s.n > 0).map(s => (
          <div key={s.key} style={{ width: `${(s.n / total) * 100}%`, background: s.color, minWidth: 4 }} title={`${s.label}: ${s.n}`} />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
        {segs.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: T2 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, display: 'inline-block', flexShrink: 0 }} />
            {s.label} <strong style={{ color: T1 }}>{s.n}</strong>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: T3 }}>This interview: <strong style={{ color: T1 }}>{currentLabel}</strong></div>
    </ChartCard>
  );
}

// 6 — Sample progress: how close the founder is to their own conversation
// target from Validate's Goal Builder (valGoalConvos) — cheap context for
// "do I need more interviews, or is it decision time?"
function SampleProgress({ count, get }: { count: number; get: (k: string) => string }) {
  const raw = get('valGoalConvos') || '';
  const target = raw === '15+' ? 15 : (parseInt(raw) || 15);
  const pct = Math.min(100, Math.round((count / target) * 100));
  const color = pct >= 100 ? CONFIRMED : pct >= 50 ? PARTIAL : NOT_CONFIRMED;
  return (
    <ChartCard title="Sample progress" subtitle="Interviews vs. your own target">
      <div style={{ height: 16, borderRadius: 4, background: `${color}18`, position: 'relative' as const }}>
        <div style={{ height: 16, borderRadius: 4, width: `${pct}%`, background: color, transition: 'width .4s' }} />
      </div>
      <div style={{ fontSize: 12, color: T2 }}>
        <strong style={{ color: T1 }}>{count}</strong> of {target} planned conversations {pct >= 100 ? '— target reached' : `(${pct}%)`}
      </div>
    </ChartCard>
  );
}

// 7 — Confidence dimension breakdown: the same 4-dimension weighting shown in
// the Validate stage's Confidence Score card, refreshed right here so the
// founder doesn't have to navigate away to see how this interview shifted it.
function ConfidenceDimensions({ allInterviews, get }: { allInterviews: any[]; get: (k: string) => string }) {
  const conf = computeValidationConfidence(allInterviews, get);
  return (
    <ChartCard title="Confidence breakdown" subtitle={`${conf.score}/100 — ${conf.label}`}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {conf.breakdown.map(b => {
          const c = b.score >= 65 ? CONFIRMED : b.score >= 40 ? PARTIAL : NOT_CONFIRMED;
          return (
            <div key={b.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11.5, fontWeight: 600, color: T1 }}>{b.label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: c }}>{b.score}%</span>
              </div>
              <div style={{ height: 6, borderRadius: 3, background: TRACK }}>
                <div style={{ height: 6, borderRadius: 3, width: `${b.score}%`, background: c, transition: 'width .4s' }} />
              </div>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

export default function InterviewResultCharts({ interview, allInterviews, get }: {
  interview: Interview;
  allInterviews: Interview[];
  get: (k: string) => string;
}) {
  const evidence = Array.isArray(interview.ai_evidence) ? interview.ai_evidence : [];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 12 }}>
      <VerdictGauge score={interview.ai_alignment_score} />
      <EvidenceBreakdown evidence={evidence} />
      <AgreementStrip aiScore={interview.ai_alignment_score} humanScore={interview.alignment_score} overridden={interview.score_overridden} />
      <ConfidenceTrend allInterviews={allInterviews} get={get} />
      <VerdictDistribution allInterviews={allInterviews} currentId={interview.id} />
      <SampleProgress count={allInterviews.length} get={get} />
      <ConfidenceDimensions allInterviews={allInterviews} get={get} />
    </div>
  );
}
