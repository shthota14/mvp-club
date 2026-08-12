import { useState, useEffect } from 'react';
import { ideasApi, recordingsApi } from '@/api/client';
import { RecorderButton, RecordingRow, InterviewRecording } from './InterviewAudio';

// ── Constants ─────────────────────────────────────────────────────────────────

const VALIDATE_COLOR = '#059669';
const MULTI_SEP = '|||';

// Signal chips per question — overall verdict (single-select)
export const SIGNAL_OPTIONS: Record<number, Array<{ label: string; color: string; bg: string }>> = {
  1: [
    { label: '✅ Right role',     color: '#065f46', bg: '#d1fae5' },
    { label: '〜 Adjacent role',  color: '#92400e', bg: '#fef3c7' },
    { label: '❌ Wrong role',     color: '#991b1b', bg: '#fee2e2' },
  ],
  2: [
    { label: '🎯 Named it unprompted', color: '#065f46', bg: '#d1fae5' },
    { label: '🤔 Adjacent problem',    color: '#92400e', bg: '#fef3c7' },
    { label: '❌ Never came up',       color: '#991b1b', bg: '#fee2e2' },
  ],
  3: [
    { label: '🔥 Vivid story',   color: '#065f46', bg: '#d1fae5' },
    { label: '💭 Vague / hypo',  color: '#92400e', bg: '#fef3c7' },
    { label: '😕 No connection', color: '#991b1b', bg: '#fee2e2' },
  ],
  4: [
    { label: '🔧 Manual workaround', color: '#4338ca', bg: '#ede9fe' },
    { label: '🏷 Competitor tool',   color: '#1e40af', bg: '#dbeafe' },
    { label: '🙈 Ignoring it',       color: '#92400e', bg: '#fef3c7' },
    { label: '🛠 Custom built',      color: '#065f46', bg: '#d1fae5' },
  ],
  5: [
    { label: '💸 Real number given',  color: '#065f46', bg: '#d1fae5' },
    { label: '🤔 Rough guess only',   color: '#92400e', bg: '#fef3c7' },
    { label: '❌ Couldn\'t quantify', color: '#991b1b', bg: '#fee2e2' },
  ],
  6: [
    { label: '🔥 Real consequences',        color: '#065f46', bg: '#d1fae5' },
    { label: '😐 Annoying but survivable',  color: '#92400e', bg: '#fef3c7' },
    { label: '🤷 Nothing breaks',           color: '#991b1b', bg: '#fee2e2' },
  ],
  7: [
    { label: '💰 Paid for a fix before',  color: '#065f46', bg: '#d1fae5' },
    { label: '🔍 Searched, found nothing', color: '#1e40af', bg: '#dbeafe' },
    { label: '🤷 Never looked',            color: '#92400e', bg: '#fef3c7' },
    { label: '👎 Not interested',          color: '#991b1b', bg: '#fee2e2' },
  ],
};

// One checkbox statement per question
export const RESPONSE_CHECK: Record<number, string> = {
  1: 'They have the right role and experience',
  2: 'They raised the problem themselves, unprompted',
  3: 'They shared a real, vivid story',
  4: 'They have no good solution today',
  5: 'They put a real number on the cost',
  6: 'Not solving it has real consequences for them',
  7: 'They have searched for or paid for a fix before',
};

// ── Script generation ─────────────────────────────────────────────────────────

function firstOf(val: string) {
  return (val || '').split(MULTI_SEP).filter(Boolean)[0]?.trim() || '';
}
function clean(val: string) { return firstOf(val) || ''; }

export interface ScriptQuestion {
  n: number;
  label: string;
  question: string;
  goal: string;
}

export function generateScript(f: Record<string, string>): ScriptQuestion[] {
  const who         = clean(f['whoExactly'])      || 'your target customer';
  const problem     = clean(f['problemSentence']) || 'the core problem';
  const pain        = clean(f['painIfNothing'])   || 'the cost of not solving it';
  const workaround  = clean(f['workaround'])      || 'their current approach';
  const oneLiner    = clean(f['oneLiner'])        || 'this idea';
  const keyQ        = clean(f['keyQuestion'])     || 'how you handle this today';

  const problemEmbed    = problem.replace(/^(they |i )/i, '').toLowerCase();
  const painEmbed       = pain.replace(/^(they |i )/i, '').toLowerCase();
  const workaroundEmbed = workaround.replace(/^(they |i )/i, '').toLowerCase();
  // Short label for embedding inside questions — max 5 words
  const problemShort    = problemEmbed.split(' ').slice(0, 5).join(' ').replace(/[,.]$/, '');

  return [
    {
      n: 1, label: 'Role',
      question: `What's your role, and what does a typical week look like for you?`,
      goal: `Confirm they match ${who}. Listen for seniority, scope, and how close they are to the problem space.`,
    },
    {
      n: 2, label: 'Their problems',
      question: `What are the biggest headaches or time-sinks in your work right now? Which one bugs you most?`,
      goal: `Do NOT mention [${problemShort || 'your problem'}]. The strongest signal in the whole interview is them naming it unprompted. If they never raise it, that's data too.`,
    },
    {
      n: 3, label: 'Story',
      question: `Walk me through the last time [${problemShort || 'that'}] actually happened. What did you do, step by step?`,
      goal: `Only dig here if it surfaced in Q2 — otherwise ask about the biggest problem THEY named. Real stories only; a hypothetical answer is a polite lie.`,
    },
    {
      n: 4, label: 'Current Solution',
      question: `How do you deal with it today? What have you tried — and what do you like or hate about it?`,
      goal: `Understand ${workaroundEmbed || workaround} and where it falls short. Their workaround is your real competition.`,
    },
    {
      n: 5, label: 'Cost the Pain',
      question: `If you had to put a number on it — how many hours a week, or how much money a month, does this cost you?`,
      goal: `Make ${painEmbed || pain} quantifiable. Push gently for an actual number. Vague pain doesn't fund startups.`,
    },
    {
      n: 6, label: 'Do-Nothing Test',
      question: `What happens if you just… don't solve this? What actually breaks?`,
      goal: `Urgency check. If nothing breaks, it's a vitamin, not a painkiller — no matter how much they sympathise.`,
    },
    {
      n: 7, label: 'Past Buying Behaviour',
      question: keyQ && keyQ !== 'how you handle this today'
        ? (keyQ.endsWith('?') ? keyQ : `${keyQ}?`)
        : `Have you ever gone looking for — or paid for — something to fix this? What happened?`,
      goal: `Past behaviour beats hypotheticals. Never ask "would you pay?" — ask what they've already searched for, tried, or spent. Listen for "${oneLiner}" moments without pitching.`,
    },
  ];
}

function buildCopyText(questions: ScriptQuestion[], responses?: Record<number, QuestionResponse>, intervieweeName?: string): string {
  const lines: string[] = [
    '── INTERVIEW SCRIPT ──────────────────────────────────────',
    intervieweeName ? `Interviewee: ${intervieweeName}` : '',
    '',
    'Opening (2 min):',
    '"Thanks for making time. This is a quick 20-minute conversation — no pitch, just questions. I\'m trying to understand how people deal with this problem before I build anything. Mind if I record for my own notes?"',
    '',
    ...questions.flatMap(q => {
      const r = responses?.[q.n];
      return [
        `Q${q.n} · ${q.label}`,
        `"${q.question}"`,
        `→ Goal: ${q.goal}`,
        Array.isArray(r?.signal) && r.signal.length ? `→ Signal: ${r.signal.join(', ')}` : (!Array.isArray(r?.signal) && r?.signal ? `→ Signal: ${r.signal}` : ''),
        r?.quote  ? `→ Quote: "${r.quote}"` : '',
        '',
      ].filter(Boolean);
    }),
    'Closing (2 min):',
    '"Is there anything I didn\'t ask that you think is important? And would it be ok if I followed up once I have something to show?"',
    '─────────────────────────────────────────────────────────',
  ].filter(l => l !== undefined);

  return lines.join('\n');
}

function buildInsightsSummary(questions: ScriptQuestion[], responses: Record<number, QuestionResponse>, intervieweeName?: string): string {
  const name = intervieweeName ? ` — ${intervieweeName}` : '';
  const lines = [
    `Interview signals${name}:`,
    ...questions.map(q => {
      const r = responses[q.n];
      const sigArr = Array.isArray(r?.signal) ? r.signal : (r?.signal ? [r.signal as unknown as string] : []);
      if (!sigArr.length && !r?.quote && !r?.picks?.length) return null;
      const parts = [`Q${q.n} ${q.label}`];
      if (sigArr.length) parts.push(sigArr.join(', '));
      if (r.picks?.length) parts.push(r.picks.join(', '));
      if (r.quote) parts.push(`"${r.quote}"`);
      return parts.join(' · ');
    }).filter(Boolean),
  ];
  // Append the inference read so the analysis travels with the saved insights
  const { perQuestion, overall } = inferResponses(questions, responses);
  if (overall) {
    lines.push(
      '',
      `Inference: ${overall.label} (${overall.pct}/100, ${overall.answered}/${questions.length} answered) → suggest ${overall.suggestedAlignment === 3 ? 'Confirmed' : overall.suggestedAlignment === 2 ? 'Partial' : 'Not confirmed'}`,
      ...perQuestion.map(pi => `• Q${pi.n} ${pi.label}: ${pi.texts.join(' ')}`),
      `→ ${overall.recommendation}`,
    );
  }
  return lines.join('\n');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface QuestionResponse {
  signal: string[];  // multi-select verdict chips
  picks: string[];   // checkbox confirmation
  quote: string;     // custom short note
}

// ── Inference engine ──────────────────────────────────────────────────────────
// Turns captured signals into per-question interpretations and an overall,
// weighted read of the interview. Weights follow the philosophy: an unprompted
// problem mention (Q2) and past buying behaviour (Q7) are the strongest
// evidence; the do-nothing test (Q6) close behind.

type SignalClass = 'strong' | 'medium' | 'weak' | 'info';

export const CHIP_INFERENCE: Record<string, { cls: SignalClass; value: number; text: string }> = {
  // Q1 — Role
  '✅ Right role':     { cls: 'strong', value: 1,   text: 'Right audience — their answers carry full weight.' },
  '〜 Adjacent role':  { cls: 'medium', value: 0.5, text: 'Adjacent profile — treat their signals as directional, not conclusive.' },
  '❌ Wrong role':     { cls: 'weak',   value: 0,   text: 'Wrong audience — exclude this interview from your validation count.' },
  // Q2 — Their problems
  '🎯 Named it unprompted': { cls: 'strong', value: 1,   text: 'They raised the problem themselves — the strongest confirmation it is real and top-of-mind.' },
  '🤔 Adjacent problem':    { cls: 'medium', value: 0.5, text: 'They named a nearby problem — consider reframing toward what they actually said.' },
  '❌ Never came up':       { cls: 'weak',   value: 0,   text: 'The problem never surfaced on its own — it may not matter enough to them.' },
  // Q3 — Story
  '🔥 Vivid story':   { cls: 'strong', value: 1,   text: 'A specific, recent story — the pain is lived, not imagined.' },
  '💭 Vague / hypo':  { cls: 'medium', value: 0.35, text: 'Vague or hypothetical answers — the pain is probably theoretical for them.' },
  '😕 No connection': { cls: 'weak',   value: 0,   text: 'No story means no lived pain.' },
  // Q4 — Current solution
  '🔧 Manual workaround': { cls: 'info',   value: 0.7, text: 'They invest effort to cope — pain is real, and their workaround is the benchmark you must beat.' },
  '🏷 Competitor tool':   { cls: 'info',   value: 0.6, text: 'They already use or pay for a tool — budget exists, but you are up against an incumbent.' },
  '🙈 Ignoring it':       { cls: 'weak',   value: 0.15, text: 'They tolerate the problem — urgency is low.' },
  '🛠 Custom built':      { cls: 'strong', value: 1,   text: 'They built their own fix — extreme pain and hard proof of demand.' },
  // Q5 — Cost the pain
  '💸 Real number given':  { cls: 'strong', value: 1,   text: 'A quantified cost — you can anchor pricing and ROI against a real number.' },
  '🤔 Rough guess only':   { cls: 'medium', value: 0.5, text: 'Pain is felt but unmeasured — expect a harder pricing conversation.' },
  '❌ Couldn\'t quantify': { cls: 'weak',   value: 0,   text: 'If they can\'t cost it, the cost may be too small to sell against.' },
  // Q6 — Do-nothing test
  '🔥 Real consequences':       { cls: 'strong', value: 1,   text: 'Doing nothing has a real price — painkiller territory.' },
  '😐 Annoying but survivable': { cls: 'medium', value: 0.4, text: 'A survivable annoyance — adoption will need a 10× better experience.' },
  '🤷 Nothing breaks':          { cls: 'weak',   value: 0,   text: 'Nothing breaks without a fix — vitamin, not painkiller.' },
  // Q7 — Past buying behaviour
  '💰 Paid for a fix before':   { cls: 'strong', value: 1,   text: 'They have already spent money on this — demonstrated demand, the best signal there is.' },
  '🔍 Searched, found nothing': { cls: 'strong', value: 0.85, text: 'They actively searched for a fix — demand exists and the market looks underserved.' },
  '🤷 Never looked':            { cls: 'medium', value: 0.3, text: 'They never sought a fix — the pain may not clear the effort bar.' },
  '👎 Not interested':          { cls: 'weak',   value: 0,   text: 'No interest in solving it — a clear negative signal.' },
};

export const QUESTION_WEIGHT: Record<number, number> = { 1: 1, 2: 2, 3: 1.25, 4: 1, 5: 1.25, 6: 1.5, 7: 2 };

const CLASS_STYLE: Record<SignalClass, { icon: string; color: string; bg: string }> = {
  strong: { icon: '✅', color: '#065f46', bg: '#d1fae5' },
  info:   { icon: '💡', color: '#1e40af', bg: '#dbeafe' },
  medium: { icon: '🤔', color: '#92400e', bg: '#fef3c7' },
  weak:   { icon: '❌', color: '#991b1b', bg: '#fee2e2' },
};

interface QuestionInference {
  n: number;
  label: string;
  cls: SignalClass;
  texts: string[];
}

interface OverallInference {
  pct: number;               // 0–100 weighted confirmation score
  answered: number;
  wrongRole: boolean;
  label: string;
  color: string;
  bg: string;
  suggestedAlignment: 1 | 2 | 3;
  recommendation: string;
}

export function inferResponses(
  questions: ScriptQuestion[],
  responses: Record<number, QuestionResponse>
): { perQuestion: QuestionInference[]; overall: OverallInference | null } {
  const perQuestion: QuestionInference[] = [];
  let weighted = 0, weightSum = 0, answered = 0;
  let wrongRole = false;

  for (const q of questions) {
    const r = responses[q.n];
    const sigs = Array.isArray(r?.signal) ? r.signal : (r?.signal ? [r.signal as unknown as string] : []);
    const known = sigs.map(s => CHIP_INFERENCE[s]).filter(Boolean);
    const hasCheck = !!r?.picks?.length;

    if (!known.length && !hasCheck) continue; // unanswered — excluded from scoring
    answered++;

    // Best selected signal drives the question's value; checkbox alone counts as strong.
    const bestChip = known.length ? known.reduce((a, b) => (b.value > a.value ? b : a)) : null;
    const value = bestChip ? bestChip.value : 1;
    const cls: SignalClass = bestChip ? bestChip.cls : 'strong';
    if (q.n === 1 && sigs.includes('❌ Wrong role')) wrongRole = true;

    const w = QUESTION_WEIGHT[q.n] ?? 1;
    weighted += value * w;
    weightSum += w;

    perQuestion.push({
      n: q.n,
      label: q.label,
      cls,
      texts: known.length ? known.map(k => k.text) : ['Confirmed via checkbox — no signal chips captured.'],
    });
  }

  if (!answered) return { perQuestion, overall: null };

  const pct = Math.round((weighted / weightSum) * 100);
  let overall: OverallInference;
  if (wrongRole) {
    overall = {
      pct, answered, wrongRole: true,
      label: 'Wrong audience', color: '#991b1b', bg: '#fee2e2', suggestedAlignment: 1,
      recommendation: 'They don\'t match your target profile — don\'t count this toward validation either way. Ask them who does fit, and get an intro.',
    };
  } else if (pct >= 70) {
    overall = {
      pct, answered, wrongRole: false,
      label: 'Problem confirmed', color: '#065f46', bg: '#d1fae5', suggestedAlignment: 3,
      recommendation: 'Count this as a ✅ confirmed conversation. Before you hang up: ask who else they know with the same pain.',
    };
  } else if (pct >= 40) {
    overall = {
      pct, answered, wrongRole: false,
      label: 'Partial signal', color: '#92400e', bg: '#fef3c7', suggestedAlignment: 2,
      recommendation: 'Real but weak in places. Look at the ❌ and 🤔 rows below — probe exactly those areas in your next conversation, or narrow who you target.',
    };
  } else {
    overall = {
      pct, answered, wrongRole: false,
      label: 'Not confirmed', color: '#991b1b', bg: '#fee2e2', suggestedAlignment: 1,
      recommendation: 'This conversation did not confirm the problem. That\'s valuable — it narrows down who your customer isn\'t. Log it honestly.',
    };
  }

  return { perQuestion, overall };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  fields?: Record<string, string>;
  ideaId?: string;
  intervieweeName?: string;
  defaultCollapsed?: boolean;
  /** Enables quick-select signal chips + quote fields */
  captureMode?: boolean;
  /** ID used to persist responses in localStorage */
  interviewId?: string;
  /** Called when user clicks "Save to insights". Second arg is the inference-suggested alignment score (3/2/1), if computable. */
  onSaveInsights?: (text: string, suggestedAlignment?: 1 | 2 | 3) => void;
}

export default function InterviewScriptCard({
  fields: fieldsProp,
  ideaId,
  intervieweeName,
  defaultCollapsed = false,
  captureMode = false,
  interviewId,
  onSaveInsights,
}: Props) {
  const [fields, setFields]     = useState<Record<string, string>>(fieldsProp ?? {});
  const [loading, setLoading]   = useState(!fieldsProp && !!ideaId);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [copied, setCopied]     = useState(false);
  const [saved, setSaved]       = useState(false);

  // Per-question responses: signal + quote
  const storageKey = interviewId ? `isc_${interviewId}` : null;
  const [responses, setResponses] = useState<Record<number, QuestionResponse>>(() => {
    if (!storageKey) return {};
    try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}'); } catch { return {}; }
  });

  // Sync responses to localStorage whenever they change
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify(responses));
  }, [responses, storageKey]);

  // Fetch entries if no fields prop
  useEffect(() => {
    if (fieldsProp) { setFields(fieldsProp); return; }
    if (!ideaId) return;
    setLoading(true);
    ideasApi.getEntries(ideaId)
      .then(r => {
        const map: Record<string, string> = {};
        (r.data.entries as { field_key: string; content: string }[]).forEach(e => {
          map[e.field_key] = e.content;
        });
        setFields(map);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ideaId, fieldsProp]);

  const questions = generateScript(fields);

  const blank = (): QuestionResponse => ({ signal: [], picks: [], quote: '' });

  const toggleSignal = (n: number, label: string) => {
    setResponses(r => {
      const cur = r[n] ?? blank();
      const sigs = Array.isArray(cur.signal) ? cur.signal : (cur.signal ? [cur.signal as unknown as string] : []);
      const next = sigs.includes(label) ? sigs.filter(s => s !== label) : [...sigs, label];
      return { ...r, [n]: { ...cur, signal: next } };
    });
  };

  const toggleCheck = (n: number) => {
    setResponses(r => {
      const cur = r[n] ?? blank();
      const checked = cur.picks.length > 0;
      return { ...r, [n]: { ...cur, picks: checked ? [] : [RESPONSE_CHECK[n]] } };
    });
  };

  const setQuote = (n: number, quote: string) => {
    setResponses(r => ({ ...r, [n]: { ...(r[n] ?? blank()), quote } }));
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildCopyText(questions, responses, intervieweeName));
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch { /* ignore */ }
  };

  const handleSaveInsights = () => {
    if (!onSaveInsights) return;
    const { overall } = inferResponses(questions, responses);
    onSaveInsights(buildInsightsSummary(questions, responses, intervieweeName), overall?.suggestedAlignment);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const capturedCount = Object.values(responses).filter(r => (Array.isArray(r.signal) ? r.signal.length : r.signal) || r.quote || r.picks?.length).length;
  const [step, setStep] = useState(0); // 0 = opening, 1–7 = questions, 8 = closing

  // ── Audio recordings (capture mode only) ──
  const [recordings, setRecordings] = useState<InterviewRecording[]>([]);
  useEffect(() => {
    if (!captureMode || !interviewId) return;
    recordingsApi.list(interviewId)
      .then(r => setRecordings(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, [captureMode, interviewId]);
  const addRecording = (rec: InterviewRecording) => setRecordings(rs => [...rs, rec]);
  const dropRecording = (id: string) => setRecordings(rs => rs.filter(r => r.id !== id));
  const fullRecordings = recordings.filter(r => r.question_n == null);

  const totalSteps = questions.length; // 7
  const onOpening  = step === 0;
  const onClosing  = step === totalSteps + 1;
  const q          = !onOpening && !onClosing ? questions[step - 1] : null;
  const resp       = q ? (responses[q.n] ?? blank()) : blank();
  const options    = q ? (SIGNAL_OPTIONS[q.n] ?? []) : [];

  if (loading) {
    return (
      <div style={{ background: '#f0fdf9', border: `1.5px solid ${VALIDATE_COLOR}30`, borderRadius: 14, padding: '16px 18px', color: '#6b7280', fontSize: 13 }}>
        Generating your interview script…
      </div>
    );
  }

  // ── READ-ONLY: full list view ─────────────────────────────────────────────────
  if (!captureMode) {
    return (
      <div style={{ background: '#f0fdf9', border: `1.5px solid ${VALIDATE_COLOR}40`, borderRadius: 14, overflow: 'hidden' }}>
        <div onClick={() => setCollapsed(c => !c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#065f46' }}>Your interview script</div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>7 questions built from your idea</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={e => { e.stopPropagation(); handleCopy(); }} style={{ padding: '5px 12px', borderRadius: 8, border: `1.5px solid ${VALIDATE_COLOR}50`, background: copied ? VALIDATE_COLOR : '#fff', color: copied ? '#fff' : VALIDATE_COLOR, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <span style={{ fontSize: 12, color: '#6b7280', fontWeight: 600 }}>{collapsed ? '▾ Show' : '▴ Hide'}</span>
          </div>
        </div>
        {!collapsed && (
          <div style={{ borderTop: `1px solid ${VALIDATE_COLOR}20`, padding: '0 18px 18px' }}>
            <div style={{ marginTop: 16, marginBottom: 12, background: '#fff', borderRadius: 10, padding: '12px 14px', border: '1px solid #d1fae5' }}>
              <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#6b7280', marginBottom: 6 }}>Opening</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.55, fontStyle: 'italic' }}>"Thanks for making time. No pitch — just questions. I want to understand the problem before I build anything."</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {questions.map(q => (
                <div key={q.n} style={{ background: '#fff', borderRadius: 10, border: '1px solid #d1fae5', padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#e5e7eb', color: '#6b7280', fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.n}</div>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.8, color: '#6b7280' }}>{q.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#1d1d1f', lineHeight: 1.6, fontWeight: 500, fontStyle: 'italic', marginBottom: 4 }}>"{q.question}"</div>
                  <div style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>→ {q.goal}</div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: '#9ca3af', textAlign: 'center' }}>
              7 questions · built from your Hone stage answers
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── CAPTURE MODE: one question at a time ──────────────────────────────────────
  return (
    <div style={{ background: '#f0fdf9', border: `1.5px solid ${VALIDATE_COLOR}40`, borderRadius: 14, overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: VALIDATE_COLOR }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>📋</span>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#fff' }}>
            {onOpening ? 'Opening' : onClosing ? 'Wrap up' : `Q${step} of ${totalSteps} · ${q!.label}`}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {capturedCount > 0 && (
            <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>
              {capturedCount}/{totalSteps} done
            </span>
          )}
          {interviewId && (
            <RecorderButton interviewId={interviewId} questionN={null} compact label="Record all" onSaved={addRecording} />
          )}
          <button onClick={handleCopy} style={{ padding: '4px 10px', borderRadius: 7, border: '1.5px solid rgba(255,255,255,0.4)', background: 'transparent', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
            {copied ? '✓ Copied' : '📋 Copy all'}
          </button>
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 16px 0' }}>
        {questions.map((_, i) => {
          const qn = i + 1;
          const done = !!(responses[qn]?.signal || responses[qn]?.picks?.length || responses[qn]?.quote);
          const active = step === i + 1;
          return (
            <div
              key={qn}
              onClick={() => setStep(i + 1)}
              title={`Q${qn}`}
              style={{
                width: active ? 20 : 8, height: 8, borderRadius: 4,
                background: done ? VALIDATE_COLOR : active ? '#065f46' : '#d1fae5',
                cursor: 'pointer', transition: 'all .2s',
                flexShrink: 0,
              }}
            />
          );
        })}
      </div>

      {/* Body */}
      <div style={{ padding: '16px 18px 18px' }}>

        {/* Opening screen */}
        {onOpening && (
          <div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, fontStyle: 'italic', background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #d1fae5', marginBottom: 16 }}>
              "Thanks for making time. This is a quick 20-minute conversation — no pitch, just questions. I'm trying to understand how people deal with this problem before I build anything. Mind if I record for my own notes?"
            </div>
            <button
              onClick={() => setStep(1)}
              style={{ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: VALIDATE_COLOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}
            >
              Start interview →
            </button>
          </div>
        )}

        {/* Closing screen */}
        {onClosing && (
          <div>
            <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, fontStyle: 'italic', background: '#fff', borderRadius: 10, padding: '14px 16px', border: '1px solid #d1fae5', marginBottom: 16 }}>
              "Is there anything I didn't ask that you think is important? And would it be ok if I followed up once I have something to show?"
            </div>
            {/* Summary of captured */}
            {capturedCount > 0 && (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d1fae5', padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.8, color: '#6b7280', marginBottom: 8 }}>Captured signals</div>
                {questions.map(q => {
                  const r = responses[q.n];
                  const sigArr = Array.isArray(r?.signal) ? r.signal : (r?.signal ? [r.signal as unknown as string] : []);
                  if (!sigArr.length && !r?.picks?.length && !r?.quote) return null;
                  return (
                    <div key={q.n} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                      <div style={{ width: 18, height: 18, borderRadius: '50%', background: VALIDATE_COLOR, color: '#fff', fontSize: 9, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>✓</div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>Q{q.n} {q.label}</span>
                        {r?.picks?.length ? <span style={{ fontSize: 11, color: VALIDATE_COLOR, marginLeft: 6 }}>{r.picks[0]}</span> : null}
                        {sigArr.length ? <span style={{ fontSize: 11, color: '#6b7280', marginLeft: 6 }}>{sigArr.join(' · ')}</span> : null}
                        {r?.quote ? <div style={{ fontSize: 11, color: '#6b7280', fontStyle: 'italic', marginTop: 2 }}>"{r.quote}"</div> : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* ── Recordings ── */}
            {interviewId && recordings.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d1fae5', padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.8, color: '#6b7280', marginBottom: 8 }}>
                  🎙️ Recordings ({recordings.length})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {[...fullRecordings, ...recordings.filter(r => r.question_n != null)].map(r => (
                    <RecordingRow key={r.id} rec={r} dense onDeleted={dropRecording} />
                  ))}
                </div>
              </div>
            )}

            {/* ── Inference analysis ── */}
            {capturedCount > 0 && (() => {
              const { perQuestion, overall } = inferResponses(questions, responses);
              if (!overall) return null;
              return (
                <div style={{ background: '#fff', borderRadius: 10, border: `1.5px solid ${overall.color}40`, overflow: 'hidden', marginBottom: 12 }}>
                  {/* Overall verdict */}
                  <div style={{ padding: '12px 14px', background: overall.bg, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ textAlign: 'center', minWidth: 52 }}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: overall.color, lineHeight: 1 }}>{overall.pct}</div>
                      <div style={{ fontSize: 8.5, fontWeight: 800, color: overall.color, letterSpacing: 0.8, opacity: 0.75 }}>/ 100</div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: overall.color }}>
                        {overall.label}
                        <span style={{ fontWeight: 600, opacity: 0.8 }}> · suggests {overall.suggestedAlignment === 3 ? '✅ Confirmed' : overall.suggestedAlignment === 2 ? '◐ Partial' : '❌ Not confirmed'}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: overall.color, lineHeight: 1.5, marginTop: 3, opacity: 0.9 }}>{overall.recommendation}</div>
                    </div>
                  </div>
                  {/* Score bar */}
                  <div style={{ height: 4, background: '#f1f5f9' }}>
                    <div style={{ height: '100%', width: `${overall.pct}%`, background: overall.color, transition: 'width .3s' }} />
                  </div>
                  {/* Per-question inferences */}
                  <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 1, color: '#9ca3af' }}>What each answer tells you</div>
                    {perQuestion.map(pi => {
                      const st = CLASS_STYLE[pi.cls];
                      return (
                        <div key={pi.n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>{st.icon}</span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: 11, fontWeight: 800, color: st.color }}>Q{pi.n} {pi.label}</span>
                            {pi.texts.map((t, i) => (
                              <div key={i} style={{ fontSize: 11.5, color: '#374151', lineHeight: 1.5 }}>{t}</div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {overall.answered < questions.length && (
                      <div style={{ fontSize: 10.5, color: '#9ca3af', lineHeight: 1.4 }}>
                        Based on {overall.answered} of {questions.length} questions — unanswered questions aren't counted.
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {onSaveInsights && capturedCount > 0 && (
              <button onClick={handleSaveInsights} style={{ width: '100%', padding: '11px 0', borderRadius: 10, border: 'none', background: saved ? '#d1fae5' : VALIDATE_COLOR, color: saved ? '#065f46' : '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', transition: 'all .2s', marginBottom: 8 }}>
                {saved ? '✓ Saved to Key Insights' : `💾 Save ${capturedCount} signal${capturedCount !== 1 ? 's' : ''} to Key Insights`}
              </button>
            )}
            <button onClick={() => setStep(totalSteps)} style={{ width: '100%', padding: '9px 0', borderRadius: 10, border: `1.5px solid ${VALIDATE_COLOR}40`, background: 'transparent', color: VALIDATE_COLOR, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              ← Back to last question
            </button>
          </div>
        )}

        {/* Question screen */}
        {q && (
          <div>
            {/* Question */}
            <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #d1fae5', padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontSize: 15, color: '#1d1d1f', lineHeight: 1.65, fontWeight: 600, fontStyle: 'italic', marginBottom: 8 }}>
                "{q.question}"
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5 }}>
                <span style={{ color: VALIDATE_COLOR, fontWeight: 700 }}>→ </span>{q.goal}
              </div>
            </div>

            {/* Checkbox */}
            <div onClick={() => toggleCheck(q.n)} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 12, padding: '10px 14px', background: '#fff', borderRadius: 10, border: `1.5px solid ${resp.picks?.length ? VALIDATE_COLOR : '#e5e7eb'}`, transition: 'all .12s' }}>
              <div style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, border: `2px solid ${resp.picks?.length ? VALIDATE_COLOR : '#d1d5db'}`, background: resp.picks?.length ? VALIDATE_COLOR : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}>
                {resp.picks?.length ? <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span> : null}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: resp.picks?.length ? '#065f46' : '#374151' }}>
                {RESPONSE_CHECK[q.n]}
              </span>
            </div>

            {/* Signal chips — multi-select */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
              {options.map(opt => {
                const sigs = Array.isArray(resp.signal) ? resp.signal : (resp.signal ? [resp.signal as unknown as string] : []);
                const selected = sigs.includes(opt.label);
                return (
                  <button key={opt.label} onClick={() => toggleSignal(q.n, opt.label)} style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: `1.5px solid ${selected ? opt.color : '#e5e7eb'}`, background: selected ? opt.bg : '#fff', color: selected ? opt.color : '#9ca3af', cursor: 'pointer', transition: 'all .12s' }}>
                    {selected ? '✓ ' : ''}{opt.label}
                  </button>
                );
              })}
            </div>

            {/* Note + voice memo */}
            <div style={{ display: 'flex', gap: 8, marginBottom: interviewId ? 8 : 16, alignItems: 'center' }}>
              <input
                value={resp.quote}
                onChange={e => setQuote(q.n, e.target.value)}
                placeholder="Key quote or note…"
                style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: `1.5px solid ${resp.quote ? VALIDATE_COLOR + '50' : '#e5e7eb'}`, fontSize: 13, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', color: '#374151', background: '#fff', transition: 'border-color .15s' }}
              />
              {interviewId && (
                <RecorderButton interviewId={interviewId} questionN={q.n} compact label="Voice" onSaved={addRecording} />
              )}
            </div>
            {interviewId && recordings.filter(r => r.question_n === q.n).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 16 }}>
                {recordings.filter(r => r.question_n === q.n).map(r => (
                  <RecordingRow key={r.id} rec={r} dense onDeleted={dropRecording} />
                ))}
              </div>
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setStep(s => s - 1)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1.5px solid ${VALIDATE_COLOR}30`, background: 'transparent', color: VALIDATE_COLOR, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(s => s + 1)}
                style={{ flex: 2, padding: '10px 0', borderRadius: 10, border: 'none', background: VALIDATE_COLOR, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
              >
                {step === totalSteps ? 'Finish →' : 'Next →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Interview Response Sheet ──────────────────────────────────────────────────
// Read-only, question-by-question view of one interview's captured responses:
// signals, quotes, voice notes, and the inference read. Used by the Interview
// Hub's per-interview tabs so responses can be read off logically anywhere.

const CHIP_LOOKUP: Record<string, { color: string; bg: string }> = {};
Object.values(SIGNAL_OPTIONS).forEach(opts => opts.forEach(o => { CHIP_LOOKUP[o.label] = { color: o.color, bg: o.bg }; }));

export function InterviewResponseSheet({ ideaId, interviewId, recordings = [], onDeleteRecording }: {
  ideaId: string;
  interviewId: string;
  recordings?: InterviewRecording[];
  onDeleteRecording?: (id: string) => void;
}) {
  const [fields, setFields] = useState<Record<string, string>>({});
  useEffect(() => {
    ideasApi.getEntries(ideaId).then(r => {
      const map: Record<string, string> = {};
      (r.data.entries as { field_key: string; content: string }[]).forEach(e => { map[e.field_key] = e.content; });
      setFields(map);
    }).catch(() => {});
  }, [ideaId]);

  const questions = generateScript(fields);
  let responses: Record<number, QuestionResponse> = {};
  try { responses = JSON.parse(localStorage.getItem(`isc_${interviewId}`) ?? '{}'); } catch { /* noop */ }
  const { perQuestion, overall } = inferResponses(questions, responses);
  const inferenceByN: Record<number, QuestionInference> = {};
  perQuestion.forEach(pi => { inferenceByN[pi.n] = pi; });

  const fullRecs = recordings.filter(r => r.question_n == null);
  const hasAnyCapture = Object.values(responses).some(r =>
    (Array.isArray(r.signal) ? r.signal.length : r.signal) || r.quote || r.picks?.length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Overall inference strip */}
      {overall && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: overall.bg, border: `1.5px solid ${overall.color}40`, borderRadius: 10 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: overall.color, lineHeight: 1 }}>{overall.pct}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: overall.color }}>
              {overall.label} · suggests {overall.suggestedAlignment === 3 ? '✅ Confirmed' : overall.suggestedAlignment === 2 ? '◐ Partial' : '❌ Not confirmed'}
            </div>
            <div style={{ fontSize: 11, color: overall.color, opacity: 0.85, lineHeight: 1.45, marginTop: 2 }}>{overall.recommendation}</div>
          </div>
        </div>
      )}

      {/* Whole-interview recordings */}
      {fullRecs.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {fullRecs.map(r => (
            <RecordingRow key={r.id} rec={r} dense onDeleted={id => onDeleteRecording?.(id)} />
          ))}
        </div>
      )}

      {!hasAnyCapture && (
        <div style={{ fontSize: 11.5, color: '#9ca3af', lineHeight: 1.5, padding: '8px 10px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e5e7eb' }}>
          No live-capture responses on this device yet. Signals captured during the interview (chips, quotes) appear here; the saved Key Insights below travel with the interview everywhere.
        </div>
      )}

      {/* Question-by-question readout */}
      {questions.map(q => {
        const r = responses[q.n];
        const sigs = Array.isArray(r?.signal) ? r.signal : (r?.signal ? [r.signal as unknown as string] : []);
        const answered = !!(sigs.length || r?.quote || r?.picks?.length);
        const qRecs = recordings.filter(rec => rec.question_n === q.n);
        const inf = inferenceByN[q.n];
        const st = inf ? CLASS_STYLE[inf.cls] : null;
        return (
          <div key={q.n} style={{ background: '#fff', border: `1px solid ${answered ? '#d1fae5' : '#eceef1'}`, borderRadius: 10, padding: '10px 12px', opacity: answered || qRecs.length ? 1 : 0.55 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
              <span style={{ width: 18, height: 18, borderRadius: '50%', background: answered ? VALIDATE_COLOR : '#e5e7eb', color: answered ? '#fff' : '#9ca3af', fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{q.n}</span>
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: 0.7, color: '#6b7280', flex: 1 }}>{q.label}</span>
              {st && <span title={inf!.texts.join(' ')} style={{ fontSize: 11 }}>{st.icon}</span>}
            </div>
            <div style={{ fontSize: 11.5, color: '#9ca3af', fontStyle: 'italic', lineHeight: 1.45, marginBottom: answered || qRecs.length ? 7 : 0 }}>"{q.question}"</div>

            {sigs.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 6 }}>
                {sigs.map(s => {
                  const cs = CHIP_LOOKUP[s] || { color: '#374151', bg: '#f3f4f6' };
                  return <span key={s} style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: cs.bg, color: cs.color }}>{s}</span>;
                })}
              </div>
            )}
            {r?.picks?.length ? (
              <div style={{ fontSize: 11.5, color: '#065f46', fontWeight: 600, marginBottom: 5 }}>✓ {RESPONSE_CHECK[q.n]}</div>
            ) : null}
            {r?.quote ? (
              <div style={{ fontSize: 12, color: '#374151', fontStyle: 'italic', lineHeight: 1.5, borderLeft: `2.5px solid ${VALIDATE_COLOR}`, paddingLeft: 8, marginBottom: 5 }}>"{r.quote}"</div>
            ) : null}
            {qRecs.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 5 }}>
                {qRecs.map(rec => <RecordingRow key={rec.id} rec={rec} dense onDeleted={id => onDeleteRecording?.(id)} />)}
              </div>
            )}
            {inf && (
              <div style={{ fontSize: 11, color: st!.color, lineHeight: 1.45, background: st!.bg, borderRadius: 6, padding: '5px 8px' }}>
                {inf.texts.join(' ')}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
