// ── Validation confidence pipeline (shared) ─────────────────────────────────
// Extracted from WorkPage.tsx so every surface that needs the founder's
// validation confidence score — the Validate stage's Analyse/Decision steps,
// the per-interview AIAlignmentPanel result charts, and the Interview Hub's
// auto-analysis modal — computes it from ONE implementation instead of a
// hand-copied second version that can silently drift out of sync (see the
// 2026-08-01 sidebar/STEP_TITLES desync bug in project memory for why that's
// worth avoiding). Pure function, no React state — computed fresh from the
// `interviews` array + `get()` on every call.

// ── Validation confidence pipeline ──────────────────────────────────────────
// Turns the per-interview AI classification (already scored + evidence-tagged
// by classifyInterviewAlignment on save, see AIAlignmentPanel/follow-up #17)
// into a founder-facing pipeline: pool the evidence extracted from every
// interview, score how confident the aggregate signal is against the
// founder's OWN success bar from Validate step 1 (Goal Builder), and suggest
// — never force — a Build / Pivot / Drop verdict. Pure function, no React
// state — computed fresh from the `interviews` array + `get()` on every
// render of the Analyse/Decision steps.
export type EvidenceItem = { quote: string; signal: 'positive' | 'negative' | 'neutral'; intervieweeName: string; ivId: string };
export type ConfidenceBreakdown = { key: string; label: string; score: number; weight: number; detail: string };
export type ValidationConfidence = {
  score: number;
  label: string;
  color: string;
  breakdown: ConfidenceBreakdown[];
  evidence: { all: EvidenceItem[]; positive: EvidenceItem[]; negative: EvidenceItem[]; neutral: EvidenceItem[] };
  classifiedCount: number;
  totalCount: number;
  suggestedVerdict: 'Build' | 'Pivot' | 'Drop' | null;
  suggestedReason: string;
};

export function computeValidationConfidence(interviews: any[], get: (k: string) => string): ValidationConfidence {
  const scored = interviews.filter(iv => iv.alignment_score);
  const confirmed = scored.filter(iv => iv.alignment_score === 3);
  const classified = interviews.filter(iv => iv.ai_alignment_score != null);

  // Evidence Extraction (per interview, already done by the AI) pooled into
  // one Aggregate Evidence set across every classified interview.
  const all: EvidenceItem[] = classified.flatMap(iv =>
    (Array.isArray(iv.ai_evidence) ? iv.ai_evidence : []).map((e: any) => ({
      quote: e.quote, signal: e.signal, intervieweeName: iv.interviewee_name || 'Unnamed', ivId: iv.id,
    }))
  );
  const positive = all.filter(e => e.signal === 'positive');
  const negative = all.filter(e => e.signal === 'negative');
  const neutral  = all.filter(e => e.signal === 'neutral');

  // 1. Sample size vs the founder's own Step-1 target ("How many real conversations count?")
  const rawTarget = get('valGoalConvos') || '';
  const target = rawTarget === '15+' ? 15 : (parseInt(rawTarget) || 15);
  const sampleSizeScore = Math.min(100, Math.round((interviews.length / target) * 100));

  // 2. Signal strength vs the founder's own Step-1 confirmation bar (e.g. "60% or more")
  const targetRate = parseInt(get('valGoalRate') || '') || 60;
  const actualRate = scored.length > 0 ? (confirmed.length / scored.length) * 100 : 0;
  const signalStrengthScore = Math.min(100, Math.round((actualRate / targetRate) * 100));

  // 3. How often the AI's read and the founder's own call agree — a proxy for
  // how noisy the underlying signal is, and whether the founder is actually
  // pressure-testing the AI rather than rubber-stamping it.
  const bothScored = interviews.filter(iv => iv.alignment_score && iv.ai_alignment_score != null);
  const mismatched = bothScored.filter(iv => iv.alignment_score !== iv.ai_alignment_score);
  const consistencyScore = bothScored.length > 0
    ? Math.round(100 - (mismatched.length / bothScored.length) * 100)
    : 100; // nothing to compare yet — don't penalize what hasn't been checked

  // 4. Evidence depth — are interviews substantive enough for the AI to
  // extract real quotes, or just a bare score with nothing behind it?
  const avgEvidence = classified.length > 0 ? all.length / classified.length : 0;
  const evidenceDepthScore = Math.min(100, Math.round((avgEvidence / 3) * 100));

  const breakdown: ConfidenceBreakdown[] = [
    { key: 'sample',      label: 'Sample size',          score: sampleSizeScore,     weight: 0.30, detail: `${interviews.length} of your ${target}-conversation target` },
    { key: 'signal',      label: 'Signal strength',      score: signalStrengthScore, weight: 0.35, detail: `${Math.round(actualRate)}% confirmed vs. your ${targetRate}% bar` },
    { key: 'consistency', label: 'AI/founder agreement', score: consistencyScore,    weight: 0.15, detail: bothScored.length ? `${bothScored.length - mismatched.length} of ${bothScored.length} interviews agree` : 'No comparisons yet' },
    { key: 'evidence',    label: 'Evidence depth',       score: evidenceDepthScore,  weight: 0.20, detail: `${avgEvidence.toFixed(1)} evidence quotes / classified interview` },
  ];

  const score = Math.round(breakdown.reduce((s, b) => s + b.score * b.weight, 0));
  const label = score >= 85 ? 'Very high confidence' : score >= 65 ? 'High confidence' : score >= 40 ? 'Moderate confidence' : 'Low confidence';
  const color = score >= 85 ? '#059669' : score >= 65 ? '#16a34a' : score >= 40 ? '#d97706' : '#dc2626';

  // Suggested verdict — advisory only. The founder always makes the actual
  // Build / Pivot / Drop call themselves; this just states a clear opinion.
  let suggestedVerdict: ValidationConfidence['suggestedVerdict'] = null;
  let suggestedReason = '';
  if (sampleSizeScore < 50) {
    suggestedReason = `You're at ${interviews.length} of ${target} planned conversations — too early to call it either way.`;
  } else if (score >= 65 && actualRate >= targetRate) {
    suggestedVerdict = 'Build';
    suggestedReason = `${Math.round(actualRate)}% confirmed the pain, at or above your ${targetRate}% bar, with solid evidence behind it.`;
  } else if (negative.length > positive.length && scored.length > 0 && (confirmed.length / Math.max(scored.length, 1)) < 0.3) {
    suggestedVerdict = 'Drop';
    suggestedReason = `Most evidence is negative and few conversations confirmed the pain — the signal doesn't support this problem.`;
  } else {
    suggestedVerdict = 'Pivot';
    suggestedReason = `Mixed signal — some confirmation, but not enough to build with confidence. Worth reframing the problem or audience.`;
  }

  return { score, label, color, breakdown, evidence: { all, positive, negative, neutral }, classifiedCount: classified.length, totalCount: interviews.length, suggestedVerdict, suggestedReason };
}
