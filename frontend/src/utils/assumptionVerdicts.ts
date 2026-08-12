// ── Assumption verdicts — automatic confirm/bust reader ─────────────────────
// Validate step 3 ("What are you assuming?") used to let the founder tap a
// Confirmed/Busted status on a belief the moment they typed it — before a
// single conversation happened. That defeats the point of validating an
// assumption: the label has to be an OUTPUT of real evidence, never an
// input the founder picks by hand.
//
// This mirrors deriveVeraVerdicts (./veraVerdicts.ts) exactly, just keyed on
// assumptions instead of pain points. Nothing here is a second AI call —
// it's built entirely from evidence the per-interview classification
// (classifyInterviewAlignment, backend/src/utils/aiQuestionCheck.ts)
// already extracts automatically the moment an interview is analyzed:
// specifically each evidence quote's `assumptionIndex` (1-based index into
// the assumptions passed to that call, or null if the quote isn't about one
// specific assumption in particular).
//
// Same caveat as Vera: assumptionIndex is fixed at classification time
// against whichever assumptions existed then. Adding, reordering, or
// deleting an assumption after interviews were already analyzed can leave
// older evidence pointing at the wrong (or a since-removed) assumption —
// re-running "🤖 Analyze with AI" on those interviews re-tags evidence
// against the current list.

export type AssumptionEvidenceQuote = {
  quote: string;
  signal: 'positive' | 'negative' | 'neutral';
  intervieweeName: string;
};

export type AssumptionVerdict = {
  index: number; // 0-based index into the assumptions array passed in
  text: string;
  // null = no interview evidence has tagged this assumption yet — render
  // this as "No evidence yet," never as a default Confirmed/Busted guess.
  verdict: 'confirmed' | 'busted' | 'mixed' | null;
  positive: AssumptionEvidenceQuote[];
  negative: AssumptionEvidenceQuote[];
  neutral: AssumptionEvidenceQuote[];
  reason: string;
};

export function deriveAssumptionVerdicts(assumptions: string[], interviews: any[]): AssumptionVerdict[] {
  return assumptions.map((text, i) => {
    const oneBased = i + 1;
    const quotes: AssumptionEvidenceQuote[] = [];
    interviews.forEach(iv => {
      const evidence = Array.isArray(iv.ai_evidence) ? iv.ai_evidence : [];
      evidence.forEach((e: any) => {
        if (e?.assumptionIndex === oneBased && e?.quote) {
          quotes.push({ quote: e.quote, signal: e.signal, intervieweeName: iv.interviewee_name || 'Unnamed' });
        }
      });
    });

    const positive = quotes.filter(q => q.signal === 'positive');
    const negative = quotes.filter(q => q.signal === 'negative');
    const neutral = quotes.filter(q => q.signal === 'neutral');

    let verdict: AssumptionVerdict['verdict'] = null;
    let reason = 'No interview evidence has specifically addressed this assumption yet.';

    if (quotes.length > 0) {
      if (positive.length >= 2 && negative.length === 0) {
        verdict = 'confirmed';
        reason = `${positive.length} evidence quote${positive.length === 1 ? '' : 's'} confirm this, with nothing pushing back.`;
      } else if (negative.length > 0 && positive.length === 0) {
        verdict = 'busted';
        reason = `${negative.length} quote${negative.length === 1 ? '' : 's'} push back on this, with no confirming evidence yet.`;
      } else if (positive.length > 0 && negative.length > 0) {
        verdict = 'mixed';
        reason = `Mixed signal — ${positive.length} quote${positive.length === 1 ? '' : 's'} confirm it, ${negative.length} push back.`;
      } else {
        verdict = 'mixed';
        reason = 'Some evidence touches on this, but nothing conclusive either way yet.';
      }
    }

    return { index: i, text, verdict, positive, negative, neutral, reason };
  });
}
