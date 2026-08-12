// ── Vera — the pain-point verdict reader ────────────────────────────────────
// "Sage" (see InterviewGuidePanel/generateDiscoveryGuide) drafts the
// questions before a conversation happens; Vera reads what came back
// afterward and tells the founder, pain point by pain point, whether the
// evidence actually confirmed it. Same family, same self-hosted Ollama
// engine underneath — just a different moment in the process.
//
// Vera isn't a second AI call. She's built entirely from evidence the
// per-interview classification (classifyInterviewAlignment, in
// backend/src/utils/aiQuestionCheck.ts) already extracts automatically the
// moment an interview completes — specifically each evidence quote's
// `painPointIndex` (1-based index into the pain points passed to that call,
// or null if the quote isn't about one specific pain point in particular).
// This file just pools that evidence per pain point and reads a verdict off
// it, the same "pure function computed fresh every render" shape as
// computeValidationConfidence in ./validationConfidence.ts.
//
// Vera's verdict is a SUGGESTION, never the final word — same rule as every
// other AI read in this app (the interview alignment score, the Build/Pivot/
// Drop confidence formula). The founder's own click on a pain point's
// Confirmed/Partial/Not confirmed chip (stored in the `painPointVerdicts`
// field) always overrides whatever Vera would have said; callers should
// treat `founderVerdict || veraVerdict.verdict` as the effective verdict to
// display, exactly like `alignment_score` falls back to the AI's read only
// until `score_overridden` is set.

export type VeraEvidenceQuote = {
  quote: string;
  signal: 'positive' | 'negative' | 'neutral';
  intervieweeName: string;
};

export type VeraVerdict = {
  index: number; // 0-based index into the painPoints array passed in
  text: string;
  // null = Vera hasn't seen enough tagged evidence yet to have an opinion —
  // callers should render this exactly like "not yet rated" today.
  verdict: 'confirmed' | 'partial' | 'not_confirmed' | null;
  positive: VeraEvidenceQuote[];
  negative: VeraEvidenceQuote[];
  neutral: VeraEvidenceQuote[];
  reason: string;
};

export function deriveVeraVerdicts(painPoints: string[], interviews: any[]): VeraVerdict[] {
  return painPoints.map((text, i) => {
    const oneBased = i + 1;
    const quotes: VeraEvidenceQuote[] = [];
    interviews.forEach(iv => {
      const evidence = Array.isArray(iv.ai_evidence) ? iv.ai_evidence : [];
      evidence.forEach((e: any) => {
        if (e?.painPointIndex === oneBased && e?.quote) {
          quotes.push({ quote: e.quote, signal: e.signal, intervieweeName: iv.interviewee_name || 'Unnamed' });
        }
      });
    });

    const positive = quotes.filter(q => q.signal === 'positive');
    const negative = quotes.filter(q => q.signal === 'negative');
    const neutral = quotes.filter(q => q.signal === 'neutral');

    let verdict: VeraVerdict['verdict'] = null;
    let reason = "No interview evidence has specifically addressed this pain point yet.";

    if (quotes.length > 0) {
      if (positive.length >= 2 && negative.length === 0) {
        verdict = 'confirmed';
        reason = `${positive.length} evidence quote${positive.length === 1 ? '' : 's'} confirm this, with nothing pushing back.`;
      } else if (negative.length > 0 && positive.length === 0) {
        verdict = 'not_confirmed';
        reason = `${negative.length} quote${negative.length === 1 ? '' : 's'} push back on this, with no confirming evidence yet.`;
      } else if (positive.length > 0 && negative.length > 0) {
        verdict = 'partial';
        reason = `Mixed signal — ${positive.length} quote${positive.length === 1 ? '' : 's'} confirm it, ${negative.length} push back.`;
      } else {
        verdict = 'partial';
        reason = 'Some evidence touches on this, but nothing conclusive either way yet.';
      }
    }

    return { index: i, text, verdict, positive, negative, neutral, reason };
  });
}
