import { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';

// ── Design tokens ─────────────────────────────────────────────────────────────
const FF   = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif';
const T1   = '#0f0f13';
const T2   = '#6e6e73';
const T3   = '#b0b0b8';
const AC   = '#7c3aed';
const ACL  = '#ede9fe';
const ACM  = '#a78bfa';
const BG   = '#f7f7f9';

// ── Post-it palette ───────────────────────────────────────────────────────────
const POSTIT = [
  { bg: '#fff176', ink: '#78540a', tape: '#ffe082' },  // classic yellow
  { bg: '#f48fb1', ink: '#6a0032', tape: '#f06292' },  // hot pink
  { bg: '#80deea', ink: '#00363a', tape: '#4dd0e1' },  // aqua
  { bg: '#a5d6a7', ink: '#1b5e20', tape: '#66bb6a' },  // mint green
  { bg: '#ffcc80', ink: '#7f3000', tape: '#ffa726' },  // orange
  { bg: '#ce93d8', ink: '#38006b', tape: '#ba68c8' },  // lavender
  { bg: '#ef9a9a', ink: '#7f0000', tape: '#e57373' },  // coral red
  { bg: '#b3e5fc', ink: '#01457c', tape: '#4fc3f7' },  // sky blue
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface SurveyData {
  id: string; token: string; title: string; description: string; questions: string[]; idea_id: string;
}
interface SurveyContext {
  intro: string; problem: string; audience: string;
  hypType: 'pain' | 'value'; hypLabel: string;
  painPoints?: string[];
}
type Verdict  = 'confirmed' | 'partial' | 'not_confirmed';
type ChipOpt  = { k: string; icon: string; color: string; bg: string };

// ── Chip option sets ──────────────────────────────────────────────────────────
const SURVEY_CHIPS: Record<'pain' | 'value', ChipOpt[][]> = {
  pain: [
    [
      { k: 'Within the last week',      icon: '🕐', color: '#dc2626', bg: '#fef2f2' },
      { k: 'Within the last month',     icon: '📅', color: '#d97706', bg: '#fffbeb' },
      { k: 'It happens repeatedly',     icon: '🔁', color: '#d97706', bg: '#fffbeb' },
      { k: 'A few months ago',          icon: '📆', color: '#6e6e73', bg: '#f5f5f7' },
      { k: 'Rarely for me',             icon: '🤷', color: '#b0b0b8', bg: '#f5f5f7' },
      { k: 'It was really frustrating', icon: '😤', color: '#dc2626', bg: '#fef2f2' },
    ],
    [
      { k: 'A lot — major pain (8–10)',   icon: '🔥', color: '#dc2626', bg: '#fef2f2' },
      { k: 'Quite a bit (5–7)',           icon: '⚡', color: '#d97706', bg: '#fffbeb' },
      { k: 'Somewhat, depends (3–5)',     icon: '😐', color: '#6e6e73', bg: '#f5f5f7' },
      { k: 'Not much honestly (1–3)',     icon: '💤', color: '#b0b0b8', bg: '#f5f5f7' },
    ],
    [
      { k: 'I pay for something to fix it', icon: '💳', color: '#059669', bg: '#f0fdf4' },
      { k: 'I built my own workaround',     icon: '🔧', color: '#d97706', bg: '#fffbeb' },
      { k: 'I juggle multiple tools',       icon: '🔀', color: '#d97706', bg: '#fffbeb' },
      { k: 'I just ignore it',              icon: '🙈', color: '#b0b0b8', bg: '#f5f5f7' },
      { k: "I haven't found a good fix",    icon: '🚫', color: '#dc2626', bg: '#fef2f2' },
    ],
    [
      { k: 'Significant time lost',    icon: '⏱️', color: '#dc2626', bg: '#fef2f2' },
      { k: 'Real money wasted',        icon: '💸', color: '#d97706', bg: '#fffbeb' },
      { k: 'Missed opportunities',     icon: '📉', color: '#dc2626', bg: '#fef2f2' },
      { k: 'A lot of stress',          icon: '😔', color: '#7c3aed', bg: '#f5f3ff' },
      { k: "Hard to put a number on",  icon: '❓', color: '#6e6e73', bg: '#f5f5f7' },
      { k: 'Not much honestly',        icon: '🤷', color: '#b0b0b8', bg: '#f5f5f7' },
    ],
    [
      { k: 'Yes — I paid for a solution',   icon: '✅', color: '#059669', bg: '#f0fdf4' },
      { k: 'Yes — tried multiple things',   icon: '🔍', color: '#059669', bg: '#f0fdf4' },
      { k: 'Tried something that failed',   icon: '❌', color: '#d97706', bg: '#fffbeb' },
      { k: "It's on my to-do list",         icon: '📋', color: '#d97706', bg: '#fffbeb' },
      { k: "I've just accepted it",         icon: '😞', color: '#b0b0b8', bg: '#f5f5f7' },
      { k: 'Never looked for a fix',        icon: '🚫', color: '#6e6e73', bg: '#f5f5f7' },
    ],
  ],
  value: [
    [
      { k: 'Speed — saves me time',      icon: '⚡', color: '#d97706', bg: '#fffbeb' },
      { k: 'Cost — saves me money',      icon: '💰', color: '#059669', bg: '#f0fdf4' },
      { k: "Ease — it's simple to use",  icon: '✨', color: '#2563eb', bg: '#eff6ff' },
      { k: 'Reliability — just works',   icon: '🔒', color: '#7c3aed', bg: '#f5f3ff' },
      { k: 'Fits my existing tools',     icon: '🔌', color: '#2563eb', bg: '#eff6ff' },
      { k: 'Control — I stay in charge', icon: '🎛️', color: '#d97706', bg: '#fffbeb' },
    ],
    [
      { k: "I'm excited — I'd try it",   icon: '🚀', color: '#059669', bg: '#f0fdf4' },
      { k: "Interesting — I'm curious",  icon: '🔍', color: '#059669', bg: '#f0fdf4' },
      { k: 'Seems ok, not urgent',       icon: '😐', color: '#b0b0b8', bg: '#f5f5f7' },
      { k: 'I see gaps in the approach', icon: '🔧', color: '#d97706', bg: '#fffbeb' },
      { k: "I'm skeptical it'd work",    icon: '🤨', color: '#dc2626', bg: '#fef2f2' },
      { k: "I'm not sure I need this",   icon: '❓', color: '#dc2626', bg: '#fef2f2' },
    ],
    [
      { k: 'It would fit naturally',        icon: '✅', color: '#059669', bg: '#f0fdf4' },
      { k: 'Minor adjustments needed',      icon: '🔧', color: '#d97706', bg: '#fffbeb' },
      { k: "It's complex to adopt",         icon: '🌀', color: '#d97706', bg: '#fffbeb' },
      { k: 'Would require big changes',     icon: '⚠️', color: '#dc2626', bg: '#fef2f2' },
      { k: "I'd need team / boss sign-off", icon: '👥', color: '#b0b0b8', bg: '#f5f5f7' },
    ],
    [
      { k: "I'd pay a fair monthly fee",  icon: '💰', color: '#059669', bg: '#f0fdf4' },
      { k: "I'd pay per use",             icon: '💵', color: '#059669', bg: '#f0fdf4' },
      { k: 'Only after seeing real ROI',  icon: '📊', color: '#d97706', bg: '#fffbeb' },
      { k: "I'd need to think about it",  icon: '💭', color: '#b0b0b8', bg: '#f5f5f7' },
      { k: 'Nothing — I want it free',    icon: '🚫', color: '#dc2626', bg: '#fef2f2' },
    ],
    [
      { k: "Nothing — I'd start right away", icon: '✅', color: '#059669', bg: '#f0fdf4' },
      { k: 'Price is the barrier',           icon: '💸', color: '#dc2626', bg: '#fef2f2' },
      { k: 'Need team / boss approval',      icon: '📝', color: '#d97706', bg: '#fffbeb' },
      { k: 'Privacy or data concerns',       icon: '🔐', color: '#d97706', bg: '#fffbeb' },
      { k: "Timing isn't right for me",      icon: '⏳', color: '#d97706', bg: '#fffbeb' },
      { k: 'Too complex to adopt',           icon: '🌀', color: '#b0b0b8', bg: '#f5f5f7' },
    ],
  ],
};

const VERDICTS: { value: Verdict; icon: string; label: string; sub: string; color: string; bg: string; border: string; grad: string }[] = [
  { value: 'confirmed',     icon: '✅', label: 'Yes — this is real for me',   sub: "I face this and I'd want a solution.",     color: '#059669', bg: '#f0fdf4', border: '#86efac', grad: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' },
  { value: 'partial',       icon: '🤔', label: 'Somewhat — it depends',        sub: "I see it but it's not urgent for me.",    color: '#d97706', bg: '#fffbeb', border: '#fde68a', grad: 'linear-gradient(135deg,#fffbeb,#fef3c7)' },
  { value: 'not_confirmed', icon: '❌', label: 'Not really for me',             sub: 'I manage fine without a new solution.',   color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', grad: 'linear-gradient(135deg,#fef2f2,#fee2e2)' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseSurveyContext(desc: string): SurveyContext | null {
  try { const p = JSON.parse(desc); return p?.hypType ? p : null; } catch { return null; }
}

// ── Animated screen wrapper ───────────────────────────────────────────────────
function Screen({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  return (
    <div style={{
      transition: 'opacity .35s ease, transform .35s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(18px)',
      pointerEvents: visible ? 'auto' : 'none',
      position: visible ? 'relative' : 'absolute',
      width: '100%',
    }}>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SurveyPage() {
  const { token } = useParams<{ token: string }>();

  const [survey,      setSurvey]      = useState<SurveyData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [notFound,    setNotFound]    = useState(false);

  // Step: 0 = welcome, 1..N = questions, N+1 = verdict, N+2 = done
  const [step,        setStep]        = useState(0);
  const [visible,     setVisible]     = useState(true);

  const [name,        setName]        = useState('');
  const [chips,       setChips]       = useState<Record<number, Set<string>>>({});
  const [notes,       setNotes]       = useState<Record<number, string>>({});
  const [verdict,     setVerdict]     = useState<Verdict | null>(null);
  const [ppVerdicts,  setPpVerdicts]  = useState<Record<number, Verdict>>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [noteOpen,    setNoteOpen]    = useState<Record<number, boolean>>({});

  const scrollRef    = useRef<HTMLDivElement>(null);
  const [winW, setWinW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const onResize = () => setWinW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const isWide = winW >= 900;

  // Pick a random post-it colour + tilt once per survey session
  const postit = useMemo(() => {
    const palette = POSTIT[Math.floor(Math.random() * POSTIT.length)];
    const tilt    = (Math.random() * 5 - 2.5).toFixed(1); // –2.5° to +2.5°
    return { ...palette, tilt: `${tilt}deg` };
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/surveys/${token}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((d: SurveyData) => setSurvey(d))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  const totalQ = survey?.questions.length ?? 5;
  // progress: welcome=0, q[i]=i/totalQ, verdict=(totalQ/totalQ)
  const progressPct = step === 0 ? 0
    : step <= totalQ ? Math.round((step / totalQ) * 100)
    : 100;

  const transition = (to: number) => {
    setVisible(false);
    setTimeout(() => {
      setStep(to);
      setVisible(true);
      scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 320);
  };

  const toggleChip = (qi: number, key: string) => {
    setChips(prev => {
      const cur = new Set(prev[qi] ?? []);
      if (cur.has(key)) cur.delete(key); else cur.add(key);
      return { ...prev, [qi]: cur };
    });
  };

  const handleSubmit = async () => {
    if (!survey) return;
    const ctx2     = parseSurveyContext(survey.description);
    const pps      = ctx2?.painPoints ?? [];
    const isPPMode = pps.length > 0;

    const finalVerdict: Verdict | null = isPPMode ? (() => {
      const vs = Object.values(ppVerdicts);
      if (!vs.length) return null;
      const conf = vs.filter(v => v === 'confirmed').length;
      const notC = vs.filter(v => v === 'not_confirmed').length;
      if (conf >= Math.ceil(vs.length / 2)) return 'confirmed';
      if (notC >= Math.ceil(vs.length / 2)) return 'not_confirmed';
      return 'partial';
    })() : verdict;

    if (!finalVerdict) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const answers = isPPMode
        ? pps.map((pp, i) => ({
            question: `Pain point ${i + 1}: ${pp}`,
            answer: ppVerdicts[i] ?? 'no_answer',
            ...(notes[i]?.trim() ? { note: notes[i].trim() } : {}),
          }))
        : survey.questions.map((q, i) => {
            const sel  = Array.from(chips[i] ?? []);
            const note = notes[i]?.trim();
            return { question: q, answer: [sel.join(', '), note].filter(Boolean).join(' | Note: ') };
          });
      const res = await fetch(`/api/surveys/${token}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respondent_name: name.trim() || null, answers, alignment: finalVerdict }),
      });
      if (!res.ok) throw new Error();
      transition(totalQ + 2);
    } catch {
      setSubmitError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px', boxShadow: `0 8px 24px ${AC}40` }}>⏳</div>
        <div style={{ fontSize: 14, color: T2, fontWeight: 500 }}>Loading survey…</div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 10 }}>Survey not found</div>
        <div style={{ fontSize: 14, color: T2, lineHeight: 1.7 }}>This link may have expired or been removed.</div>
      </div>
    </div>
  );

  const ctx        = parseSurveyContext(survey!.description);
  const hypType    = ctx?.hypType ?? 'pain';
  const chipDefs   = SURVEY_CHIPS[hypType];
  const painPoints = ctx?.painPoints ?? [];
  const isPPMode   = painPoints.length > 0;

  // Short display label for a pain point sentence
  const shortPP = (s: string) => s.match(/struggle(?:s)? with (.+?) because/i)?.[1] ?? s.replace(/\.$/, '').slice(0, 100);

  // ── Thank you ───────────────────────────────────────────────────────────────
  if (step === totalQ + 2) {
    const v = VERDICTS.find(x => x.value === verdict)!;
    return (
      <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${AC}18 0%,${BG} 50%)`, fontFamily: FF, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ width: '100%', maxWidth: 480, textAlign: 'center' }}>
          {/* Big checkmark */}
          <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 16px 48px ${AC}50`, fontSize: 40 }}>
            🙏
          </div>
          <div style={{ fontSize: 30, fontWeight: 900, color: T1, letterSpacing: -.5, marginBottom: 12 }}>Thank you!</div>
          <div style={{ fontSize: 15, color: T2, lineHeight: 1.75, marginBottom: 32, maxWidth: 360, margin: '0 auto 32px' }}>
            Your response has been recorded. You're helping a founder figure out if their idea solves a real problem.
          </div>
          {/* Verdict recap */}
          <div style={{ padding: '20px 24px', borderRadius: 20, background: v.grad, border: `1.5px solid ${v.border}`, display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', marginBottom: 32, boxShadow: `0 4px 20px ${v.color}20` }}>
            <span style={{ fontSize: 28, flexShrink: 0 }}>{v.icon}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: v.color }}>{v.label}</div>
              <div style={{ fontSize: 13, color: v.color, opacity: .75, marginTop: 3 }}>{v.sub}</div>
            </div>
          </div>
          {/* Signup CTA */}
          <div style={{ marginBottom: 24, background: `linear-gradient(135deg,${AC}10,${ACM}08)`, border: `1.5px solid ${AC}25`, borderRadius: 20, padding: '24px 24px 20px', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: `0 4px 12px ${AC}40`, flexShrink: 0 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 900, color: T1, letterSpacing: -.2 }}>Got your own idea to validate?</div>
            </div>
            <div style={{ fontSize: 13, color: T2, lineHeight: 1.7, marginBottom: 18 }}>
              You just helped a founder test their idea. MVP Club guides you through the same process — from idea to validated startup in structured steps.
            </div>
            <a
              href="/signup"
              style={{ display: 'block', width: '100%', boxSizing: 'border-box', padding: '14px', borderRadius: 14, border: 'none', background: `linear-gradient(135deg,${AC},#6d28d9)`, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: FF, letterSpacing: .2, boxShadow: `0 6px 20px ${AC}45`, textAlign: 'center', textDecoration: 'none' }}
            >
              Start validating my idea →
            </a>
            <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: T3 }}>Free to join · No credit card needed</div>
          </div>

          <div style={{ fontSize: 12, color: T3 }}>
            Powered by <strong style={{ color: AC }}>MVP Club</strong> — helping founders validate ideas faster
          </div>
        </div>
      </div>
    );
  }

  // ── Shared chrome: progress bar + logo ──────────────────────────────────────
  const chrome = (
    <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(247,247,249,.92)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(229,229,234,.6)' }}>
      {/* Logo row */}
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, boxShadow: `0 2px 8px ${AC}40` }}>⚡</div>
          <span style={{ fontSize: 13, fontWeight: 800, color: AC, letterSpacing: .3 }}>MVP Club</span>
        </div>
        {step > 0 && step <= totalQ && (
          <span style={{ fontSize: 12, fontWeight: 600, color: T3 }}>
            {step} / {totalQ}
          </span>
        )}
        {step > totalQ && step < totalQ + 2 && (
          <span style={{ fontSize: 12, fontWeight: 600, color: T3 }}>Final step</span>
        )}
      </div>
      {/* Progress bar */}
      {step > 0 && (
        <div style={{ height: 3, background: '#e5e5ea' }}>
          <div style={{ height: '100%', background: `linear-gradient(90deg,${AC},${ACM})`, width: `${progressPct}%`, transition: 'width .5s cubic-bezier(.4,0,.2,1)', borderRadius: 2 }} />
        </div>
      )}
    </div>
  );

  // ── Step 0: Welcome ─────────────────────────────────────────────────────────
  if (step === 0) {
    const hypStyle = hypType === 'pain'
      ? { icon: '🔥', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5', label: 'Pain assumption', blurb: 'They want to know if this problem is real, frequent, and painful enough for people like you.' }
      : { icon: '💎', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', label: 'Value assumption', blurb: "They want to know if the solution they're building would be valuable to people like you." };

    return (
      <div style={{ minHeight: '100dvh', background: BG, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
        {chrome}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto' }}>
          {/* Hero */}
          <div style={{ background: `linear-gradient(145deg,${AC} 0%,#6d28d9 60%,#5b21b6 100%)`, padding: '48px 24px 56px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
            {/* decorative blobs */}
            <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,.06)', pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', bottom: -60, left: -20, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.04)', pointerEvents: 'none' }} />
            <div style={{ maxWidth: 520, margin: '0 auto', position: 'relative' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.15)', borderRadius: 100, padding: '5px 14px', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.9)', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 20 }}>
                ✦ Validation Survey
              </div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.3, letterSpacing: -.5, marginBottom: 12 }}>
                {survey!.title}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                {[['⏱️','~2 minutes'],['🔒','No login'],['👆','Tap to answer']].map(([icon,txt]) => (
                  <span key={txt} style={{ fontSize: 12, color: 'rgba(255,255,255,.75)', display: 'flex', alignItems: 'center', gap: 5 }}>{icon} {txt}</span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Newspaper article strip — full bleed ── */}
          <div style={{ background: '#fff', borderBottom: '1px solid #e5e5ea' }}>
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '36px 28px 32px' }}>

              {/* Dateline / section tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                <div style={{ height: 1, flex: '0 0 32px', background: '#1a1a1a' }} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#1a1a1a', whiteSpace: 'nowrap' }}>
                  {hypType === 'pain' ? 'Pain Point Research' : 'Value Proposition Research'}
                </span>
                <div style={{ height: 1, flex: 1, background: '#e5e5ea' }} />
                <span style={{ fontSize: 10, color: '#999', letterSpacing: .5, whiteSpace: 'nowrap' }}>
                  {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              {/* Headline */}
              <h1 style={{ margin: '0 0 8px', fontSize: isWide ? 36 : 26, fontWeight: 900, color: '#0f0f13', lineHeight: 1.2, letterSpacing: -.5, fontFamily: FF }}>
                {hypType === 'pain'
                  ? 'Is this a real problem? A founder is asking for your view.'
                  : 'Would this be valuable? A founder is asking for your view.'}
              </h1>

              {/* Deck / standfirst */}
              <p style={{ margin: '0 0 24px', fontSize: isWide ? 17 : 15, color: '#3a3a3f', lineHeight: 1.6, fontWeight: 500, borderBottom: '2px solid #1a1a1a', paddingBottom: 20 }}>
                {hypType === 'pain'
                  ? 'Before committing to build anything, this founder wants to hear from real people — not investors or colleagues — about whether a specific problem is genuinely painful in their day-to-day lives.'
                  : 'Before investing months of work, this founder wants to hear from real people — not investors or colleagues — about whether a solution they have in mind would genuinely make a difference in their work or life.'}
              </p>

              {/* Two-column body */}
              <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1fr 1fr' : '1fr', gap: isWide ? 40 : 0 }}>
                <p style={{ margin: 0, fontSize: 15, color: '#2a2a2a', lineHeight: 1.85 }}>
                  {hypType === 'pain'
                    ? 'Early-stage founders often build solutions to problems that do not hurt as much as they assumed. This survey exists to prevent exactly that. Your experience — however ordinary it may seem — is the most valuable data available.'
                    : 'Early-stage founders often build solutions that make sense on paper but fail to resonate in the real world. This survey exists to bridge that gap. Your perspective — however ordinary it may seem — is the most valuable data available.'}
                </p>
                <p style={{ margin: 0, fontSize: 15, color: '#2a2a2a', lineHeight: 1.85 }}>
                  The survey takes approximately two minutes. There are no right or wrong answers. You are not being sold anything. Your honest and candid response is all that is asked of you — and it will directly shape what this founder builds next.
                </p>
              </div>

            </div>
          </div>

          {/* ── Founder + CTA strip — full bleed, matches newspaper above ── */}
          <div style={{ background: '#fafafa', borderBottom: '1px solid #e5e5ea' }}>
            <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 28px 36px' }}>

              {/* Section tag */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <div style={{ height: 1, flex: '0 0 32px', background: '#1a1a1a' }} />
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as const, color: '#1a1a1a', whiteSpace: 'nowrap' }}>From the founder</span>
                <div style={{ height: 1, flex: 1, background: '#e5e5ea' }} />
              </div>

              {/* Two-column: idea/problem left + founder bio right */}
              <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1fr 1fr' : '1fr', gap: isWide ? 48 : 24, marginBottom: 28 }}>

                {/* Left col — the idea / problem */}
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    {isPPMode ? `Testing ${painPoints.length} pain point${painPoints.length > 1 ? 's' : ''}` : 'The idea & problem'}
                  </div>
                  {isPPMode ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {painPoints.map((pp, i) => (
                        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: '#999', minWidth: 18, paddingTop: 2 }}>{i + 1}.</span>
                          <span style={{ fontSize: 15, color: '#2a2a2a', lineHeight: 1.7 }}>{shortPP(pp)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      position: 'relative',
                      background: '#fffde7',
                      padding: '28px 24px 32px',
                      borderRadius: 2,
                      transform: `rotate(${postit.tilt})`,
                      transformOrigin: 'center top',
                      boxShadow: '0 8px 24px rgba(0,0,0,.15), 3px 5px 10px rgba(0,0,0,.10)',
                    }}>
                      {/* tape */}
                      <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', width: 64, height: 22, borderRadius: 3, background: '#ffe082cc', boxShadow: '0 1px 4px rgba(0,0,0,.15)' }} />
                      {/* dog-ear */}
                      <div style={{ position: 'absolute', bottom: 0, right: 0, width: 0, height: 0, borderStyle: 'solid', borderWidth: '0 0 22px 22px', borderColor: `transparent transparent rgba(0,0,0,.10) transparent` }} />
                      <div style={{ fontSize: 9, fontWeight: 900, color: '#78540a99', letterSpacing: 1.6, textTransform: 'uppercase' as const, marginBottom: 14 }}>📌 The idea & problem</div>
                      <p style={{ margin: 0, fontSize: 18, fontWeight: 700, fontStyle: 'italic', color: '#78540a', lineHeight: 1.8, fontFamily: 'var(--font-display)' }}>
                        {ctx?.problem ? `"${ctx.problem}"` : <span style={{ fontStyle: 'normal', fontSize: 14, color: '#a0896a', fontWeight: 500 }}>A founder is validating a new idea.</span>}
                      </p>
                    </div>
                  )}
                </div>

                {/* Right col — who is asking */}
                <div style={{ borderLeft: isWide ? '1px solid #e5e5ea' : 'none', paddingLeft: isWide ? 48 : 0, borderTop: isWide ? 'none' : '1px solid #e5e5ea', paddingTop: isWide ? 0 : 24 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 12 }}>Who is asking</div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: '#0f0f13', lineHeight: 1.25, letterSpacing: -.4, marginBottom: 10 }}>
                    {ctx?.intro || 'A founder is asking for your honest input.'}
                  </div>
                  <div style={{ fontSize: 15, color: '#3a3a3f', lineHeight: 1.7, marginBottom: 14 }}>
                    I have started an idea on{' '}
                    <a href={`/community/${survey!.idea_id}`} target="_blank" rel="noopener noreferrer" style={{ color: AC, fontWeight: 700, textDecoration: 'none', borderBottom: `1.5px solid ${AC}` }}>
                      MVP Club
                    </a>
                    {' '}and would love your honest feedback before I build it.
                  </div>
                  {ctx?.audience && (
                    <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, paddingTop: 12, borderTop: '1px solid #e5e5ea' }}>
                      <span style={{ fontWeight: 700, color: '#2a2a2a' }}>Built for: </span>
                      {ctx.audience.split('|||').map((seg, i) => (
                        <span key={i}>{i > 0 ? ' · ' : ''}{seg.trim()}</span>
                      ))}
                    </div>
                  )}
                </div>

              </div>

              {/* What we're testing — full width rule */}
              <div style={{ borderTop: '2px solid #1a1a1a', paddingTop: 20, marginBottom: 28, display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' as const }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{hypStyle.icon}</span>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: hypStyle.color, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 4 }}>
                    Testing: {hypStyle.label}
                  </div>
                  <div style={{ fontSize: 14, color: '#3a3a3f', lineHeight: 1.7, maxWidth: 620 }}>{hypStyle.blurb}</div>
                </div>
              </div>

              {/* Name + CTA */}
              <div style={{ display: 'grid', gridTemplateColumns: isWide ? '1fr auto' : '1fr', gap: 16, alignItems: 'flex-end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1.5, textTransform: 'uppercase' as const, marginBottom: 8 }}>
                    Your name (optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Alex — or stay anonymous"
                    style={{ width: '100%', boxSizing: 'border-box', padding: '13px 16px', border: `1.5px solid ${name ? AC + '70' : '#d2d2d7'}`, borderRadius: 10, fontSize: 15, fontFamily: FF, outline: 'none', color: T1, background: '#fff', transition: 'all .2s' }}
                  />
                </div>
                <button
                  onClick={() => transition(1)}
                  style={{ padding: '13px 32px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${AC},#6d28d9)`, color: '#fff', fontSize: 15, fontWeight: 800, cursor: 'pointer', fontFamily: FF, boxShadow: `0 6px 20px ${AC}45`, whiteSpace: 'nowrap' as const, transition: 'transform .15s, box-shadow .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = ''; }}
                >
                  Start survey →
                </button>
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: '#aaa' }}>Takes ~2 minutes · No login required</div>

            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Steps 1..totalQ: questions (chip mode OR per-pain-point mode) ───────────
  if (step >= 1 && step <= totalQ) {
    const qi      = step - 1;
    const q       = survey!.questions[qi];
    const opts    = chipDefs[qi] ?? [];
    const sel     = chips[qi] ?? new Set<string>();
    const hasNote = noteOpen[qi];
    const ppV     = ppVerdicts[qi];
    const canNext = isPPMode ? !!ppV : sel.size > 0;

    // Context reminder — post-it note style
    const problemText = ctx?.problem ?? '';
    const audience    = ctx?.audience ?? '';
    const isValueHyp  = hypType === 'value';
    const contextPanel = problemText ? (
      <div style={{
        position: 'relative',
        transform: `rotate(${postit.tilt})`,
        transformOrigin: 'center top',
        // layered shadow for physical paper feel
        boxShadow: '0 6px 18px rgba(0,0,0,.22), 2px 4px 8px rgba(0,0,0,.14)',
        borderRadius: 2,
        background: postit.bg,
        padding: isWide ? '22px 20px 26px' : '14px 16px 18px',
        ...(isWide ? {} : { marginBottom: 24 }),
      }}>
        {/* tape strip at top */}
        <div style={{
          position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
          width: 60, height: 20, borderRadius: 3,
          background: postit.tape + 'cc',
          boxShadow: '0 1px 4px rgba(0,0,0,.15)',
        }} />

        {/* label */}
        <div style={{
          fontSize: 9, fontWeight: 900, color: postit.ink + 'aa',
          letterSpacing: 1.6, textTransform: 'uppercase' as const,
          marginBottom: 10, marginTop: 2,
        }}>
          📌 Keep this in mind
        </div>

        {/* problem text — handwriting-feel via italic + slightly loose line-height */}
        <div style={{
          fontSize: isWide ? 14 : 13,
          fontWeight: 700,
          color: postit.ink,
          lineHeight: 1.7,
          fontStyle: 'italic',
          fontFamily: 'var(--font-display)',
        }}>
          "{problemText}"
        </div>

        {audience && (
          <div style={{
            marginTop: 12,
            paddingTop: 10,
            borderTop: `1px dashed ${postit.ink}30`,
            fontSize: 11,
            color: postit.ink + 'bb',
            fontWeight: 600,
          }}>
            🎯 For: <strong style={{ color: postit.ink }}>{audience}</strong>
          </div>
        )}

        {isWide && (
          <div style={{
            marginTop: 10,
            fontSize: 11,
            color: postit.ink + '99',
            fontStyle: 'italic',
          }}>
            {isValueHyp
              ? 'Would people value this solution?'
              : 'Is this problem real & painful?'}
          </div>
        )}

        {/* bottom right dog-ear fold */}
        <div style={{
          position: 'absolute', bottom: 0, right: 0,
          width: 0, height: 0,
          borderStyle: 'solid',
          borderWidth: '0 0 18px 18px',
          borderColor: `transparent transparent rgba(0,0,0,.12) transparent`,
        }} />
      </div>
    ) : null;

    return (
      <div style={{ minHeight: '100dvh', background: BG, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
        {chrome}

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 120 }}>
          <div style={{ maxWidth: isWide ? 1020 : 600, margin: '0 auto', padding: isWide ? '36px 28px 0' : '36px 20px 0' }}>

            {/* Wide layout: grid with right sidebar */}
            <div style={isWide ? { display: 'grid', gridTemplateColumns: '1fr 280px', gap: 28, alignItems: 'start' } : {}}>

              {/* Left: question + chips */}
              <Screen visible={visible}>
                {/* Step label */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', boxShadow: `0 4px 12px ${AC}40`, flexShrink: 0 }}>
                    {step}
                  </div>
                  <div style={{ height: 1.5, flex: 1, background: `linear-gradient(90deg,${AC}40,transparent)` }} />
                </div>

                {/* Mobile context banner */}
                {!isWide && contextPanel}

                {isPPMode ? (
                  /* ── Per-pain-point step ─────────────────────────── */
                  <>
                    {/* Pain point label */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: T3, letterSpacing: 1.2, textTransform: 'uppercase' as const }}>
                        Pain point {qi + 1} of {painPoints.length}
                      </div>
                      <div style={{ flex: 1, height: 1.5, background: `linear-gradient(90deg,${AC}30,transparent)` }} />
                    </div>

                    {/* Pain description card */}
                    <div style={{ background: `linear-gradient(135deg,${AC}08,${AC}04)`, borderRadius: 18, padding: '22px 22px', border: `1.5px solid ${AC}20`, marginBottom: 28 }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: AC, letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 10 }}>The pain we're testing</div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: T1, lineHeight: 1.55, letterSpacing: -.2, fontFamily: 'var(--font-display)' }}>
                        "{shortPP(painPoints[qi])}"
                      </div>
                      {ctx?.audience && (
                        <div style={{ fontSize: 12, color: T2, marginTop: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                          🎯 <span>For: <strong style={{ color: T1 }}>{ctx.audience}</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Question */}
                    <div style={{ fontSize: 22, fontWeight: 900, color: T1, lineHeight: 1.35, letterSpacing: -.4, marginBottom: 22 }}>
                      Does this resonate with your experience?
                    </div>

                    {/* Verdict options */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                      {VERDICTS.map(v => {
                        const on = ppV === v.value;
                        return (
                          <button
                            key={v.value}
                            onClick={() => setPpVerdicts(p => ({ ...p, [qi]: v.value }))}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 16,
                              padding: '16px 20px', borderRadius: 16, textAlign: 'left' as const,
                              border: `2px solid ${on ? v.color : '#e5e5ea'}`,
                              background: on ? v.grad : '#fff',
                              cursor: 'pointer', fontFamily: FF,
                              transition: 'all .18s cubic-bezier(.4,0,.2,1)',
                              boxShadow: on ? `0 4px 20px ${v.color}30` : '0 1px 6px rgba(0,0,0,.04)',
                              transform: on ? 'scale(1.02)' : 'scale(1)',
                            }}
                            onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.borderColor = v.color + '50'; }}
                            onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5ea'; }}
                          >
                            <span style={{ fontSize: 26, flexShrink: 0 }}>{v.icon}</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 15, fontWeight: 800, color: on ? v.color : T1, marginBottom: 3 }}>{v.label}</div>
                              <div style={{ fontSize: 13, color: on ? v.color : T2, opacity: on ? .85 : 1, lineHeight: 1.45 }}>{v.sub}</div>
                            </div>
                            <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: on ? v.color : 'transparent', border: `2px solid ${on ? v.color : '#d2d2d7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                              {on && <span style={{ color: '#fff', fontSize: 11, fontWeight: 900 }}>✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Note */}
                    {!hasNote ? (
                      <button onClick={() => setNoteOpen(p => ({ ...p, [qi]: true }))} style={{ background: 'none', border: 'none', padding: '2px 0', fontSize: 13, color: T3, cursor: 'pointer', fontFamily: FF, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 15 }}>💬</span> Add a note (optional)
                      </button>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T3, marginBottom: 6, letterSpacing: .5 }}>YOUR NOTE</div>
                        <textarea autoFocus value={notes[qi] ?? ''} onChange={e => setNotes(p => ({ ...p, [qi]: e.target.value }))} placeholder="Any extra context…" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: `1.5px solid ${AC}40`, borderRadius: 12, fontSize: 14, resize: 'vertical', fontFamily: FF, outline: 'none', lineHeight: 1.6, color: T1, background: `${AC}04` }} />
                      </div>
                    )}
                  </>
                ) : (
                  /* ── Generic chip-based step ──────────────────────── */
                  <>
                    {/* Question */}
                    <div style={{ fontSize: 24, fontWeight: 900, color: T1, lineHeight: 1.35, letterSpacing: -.4, marginBottom: 28 }}>
                      {q}
                    </div>

                    {/* Chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                      {opts.map(chip => {
                        const on = sel.has(chip.k);
                        return (
                          <button
                            key={chip.k}
                            onClick={() => toggleChip(qi, chip.k)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 14,
                              padding: '14px 18px', borderRadius: 14, textAlign: 'left' as const,
                              border: `2px solid ${on ? chip.color : '#e5e5ea'}`,
                              background: on ? chip.bg : '#fff',
                              cursor: 'pointer', fontFamily: FF,
                              transition: 'all .15s cubic-bezier(.4,0,.2,1)',
                              boxShadow: on ? `0 2px 12px ${chip.color}25` : '0 1px 4px rgba(0,0,0,.04)',
                              transform: on ? 'scale(1.01)' : 'scale(1)',
                            }}
                            onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.borderColor = chip.color + '60'; }}
                            onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5ea'; }}
                          >
                            <span style={{ fontSize: 22, flexShrink: 0, width: 28, textAlign: 'center' as const }}>{chip.icon}</span>
                            <span style={{ fontSize: 14, fontWeight: on ? 700 : 500, color: on ? chip.color : T1, flex: 1, lineHeight: 1.4 }}>{chip.k}</span>
                            <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, border: `2px solid ${on ? chip.color : '#d2d2d7'}`, background: on ? chip.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                              {on && <span style={{ color: '#fff', fontSize: 10, fontWeight: 900 }}>✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Note */}
                    {!hasNote ? (
                      <button onClick={() => setNoteOpen(p => ({ ...p, [qi]: true }))} style={{ background: 'none', border: 'none', padding: '2px 0', fontSize: 13, color: T3, cursor: 'pointer', fontFamily: FF, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 15 }}>💬</span> Add a note (optional)
                      </button>
                    ) : (
                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T3, marginBottom: 6, letterSpacing: .5 }}>YOUR NOTE</div>
                        <textarea autoFocus value={notes[qi] ?? ''} onChange={e => setNotes(p => ({ ...p, [qi]: e.target.value }))} placeholder="Any extra context you'd like to share…" rows={3} style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: `1.5px solid ${AC}40`, borderRadius: 12, fontSize: 14, resize: 'vertical', fontFamily: FF, outline: 'none', lineHeight: 1.6, color: T1, background: `${AC}04`, transition: 'all .15s' }} />
                      </div>
                    )}
                  </>
                )}
              </Screen>

              {/* Right: sticky context panel (desktop only) */}
              {isWide && contextPanel && (
                <div style={{ position: 'sticky', top: 80 }}>
                  {contextPanel}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Sticky bottom action bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(247,247,249,.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(229,229,234,.8)', padding: '14px 20px 20px' }}>
          <div style={{ maxWidth: isWide ? 1020 : 600, margin: '0 auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              onClick={() => transition(step - 1)}
              style={{ padding: '13px 18px', borderRadius: 14, border: '1.5px solid #e5e5ea', background: '#fff', color: T2, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF, flexShrink: 0 }}
            >
              ← Back
            </button>
            <button
              onClick={() => transition(step < totalQ ? step + 1 : totalQ + 1)}
              disabled={!canNext}
              style={{
                flex: 1, padding: '14px', borderRadius: 14, border: 'none',
                background: canNext ? `linear-gradient(135deg,${AC},#6d28d9)` : '#e5e5ea',
                color: canNext ? '#fff' : '#b0b0b8', fontSize: 15, fontWeight: 800,
                cursor: canNext ? 'pointer' : 'not-allowed', fontFamily: FF,
                boxShadow: canNext ? `0 6px 20px ${AC}45` : 'none',
                transition: 'all .2s',
              }}
            >
              {step < totalQ ? 'Next →' : 'Almost done →'}
            </button>
          </div>
          {!canNext && (
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 12, color: T3 }}>Select at least one option above to continue</div>
          )}
        </div>
      </div>
    );
  }

  // ── Verdict / summary step ────────────────────────────────────────────────────
  if (step === totalQ + 1) {
    // Derived overall verdict for PP mode
    const ppVs = Object.values(ppVerdicts);
    const ppConf = ppVs.filter(v => v === 'confirmed').length;
    const ppNotC = ppVs.filter(v => v === 'not_confirmed').length;
    const derivedVerdict: Verdict | null = isPPMode
      ? ppVs.length === 0 ? null
        : ppConf >= Math.ceil(ppVs.length / 2) ? 'confirmed'
        : ppNotC >= Math.ceil(ppVs.length / 2) ? 'not_confirmed'
        : 'partial'
      : verdict;
    const canSubmit = isPPMode ? !!derivedVerdict : !!verdict;

    return (
      <div style={{ minHeight: '100dvh', background: BG, fontFamily: FF, display: 'flex', flexDirection: 'column' }}>
        {chrome}

        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', paddingBottom: 140 }}>
          <div style={{ maxWidth: 580, margin: '0 auto', padding: '40px 20px 0' }}>
            <Screen visible={visible}>

              {isPPMode ? (
                /* ── Per-pain-point summary ──────────────────────────── */
                <>
                  <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px', boxShadow: `0 8px 24px ${AC}50` }}>🏁</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: T1, letterSpacing: -.4, marginBottom: 10 }}>Your pain point ratings</div>
                    <div style={{ fontSize: 15, color: T2, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
                      Here's what you shared. Hit submit when you're ready.
                    </div>
                  </div>

                  {/* Per-pain-point recap */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                    {painPoints.map((pp, i) => {
                      const v = VERDICTS.find(x => x.value === ppVerdicts[i]);
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', borderRadius: 14, border: `2px solid ${v ? v.color + '40' : '#e5e5ea'}`, background: v ? v.bg : '#fafafa', cursor: 'pointer' }}
                          onClick={() => transition(i + 1)}>
                          <span style={{ fontSize: 22, flexShrink: 0 }}>{v?.icon ?? '⏳'}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: T3, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 2 }}>Pain point {i + 1}</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: v ? v.color : T2 }}>{shortPP(pp)}</div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: v ? v.color : T3, background: v ? v.bg : '#f5f5f7', border: `1px solid ${v ? v.border : '#e5e5ea'}`, padding: '2px 8px', borderRadius: 20 }}>{v?.label ?? 'Not rated'}</span>
                            <span style={{ fontSize: 10, color: T3 }}>tap to change</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Overall derived verdict */}
                  {derivedVerdict && (() => {
                    const dv = VERDICTS.find(x => x.value === derivedVerdict)!;
                    return (
                      <div style={{ padding: '16px 20px', borderRadius: 16, background: dv.grad, border: `2px solid ${dv.border}`, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 28, flexShrink: 0 }}>{dv.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: dv.color }}>Overall: {dv.label}</div>
                          <div style={{ fontSize: 12, color: dv.color, opacity: .8, marginTop: 2 }}>Derived from your {painPoints.length} ratings</div>
                        </div>
                      </div>
                    );
                  })()}
                </>
              ) : (
                /* ── Generic single verdict ──────────────────────────── */
                <>
                  <div style={{ textAlign: 'center', marginBottom: 36 }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 20px', boxShadow: `0 8px 24px ${AC}50` }}>🏁</div>
                    <div style={{ fontSize: 26, fontWeight: 900, color: T1, letterSpacing: -.4, marginBottom: 10 }}>One last question</div>
                    <div style={{ fontSize: 15, color: T2, lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
                      Overall — what honestly reflects your experience?
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {VERDICTS.map(v => {
                      const on = verdict === v.value;
                      return (
                        <button key={v.value} onClick={() => setVerdict(v.value)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 20px', borderRadius: 18, border: `2px solid ${on ? v.color : '#e5e5ea'}`, background: on ? v.grad : '#fff', cursor: 'pointer', fontFamily: FF, textAlign: 'left' as const, transition: 'all .18s cubic-bezier(.4,0,.2,1)', boxShadow: on ? `0 4px 20px ${v.color}30` : '0 1px 6px rgba(0,0,0,.04)', transform: on ? 'scale(1.02)' : 'scale(1)' }}
                          onMouseEnter={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.borderColor = v.color + '50'; }}
                          onMouseLeave={e => { if (!on) (e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e5ea'; }}>
                          <span style={{ fontSize: 28, flexShrink: 0 }}>{v.icon}</span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: on ? v.color : T1, marginBottom: 3 }}>{v.label}</div>
                            <div style={{ fontSize: 13, color: on ? v.color : T2, opacity: on ? .85 : 1, lineHeight: 1.45 }}>{v.sub}</div>
                          </div>
                          <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: on ? v.color : 'transparent', border: `2px solid ${on ? v.color : '#d2d2d7'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                            {on && <span style={{ color: '#fff', fontSize: 12, fontWeight: 900 }}>✓</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              {submitError && (
                <div style={{ marginTop: 16, padding: '12px 16px', borderRadius: 12, background: '#fef2f2', border: '1.5px solid #fca5a5', fontSize: 13, color: '#dc2626' }}>
                  {submitError}
                </div>
              )}
            </Screen>
          </div>
        </div>

        {/* Sticky action bar */}
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(247,247,249,.95)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderTop: '1px solid rgba(229,229,234,.8)', padding: '14px 20px 20px' }}>
          <div style={{ maxWidth: 580, margin: '0 auto', display: 'flex', gap: 10 }}>
            <button onClick={() => transition(totalQ)} style={{ padding: '13px 18px', borderRadius: 14, border: '1.5px solid #e5e5ea', background: '#fff', color: T2, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: FF, flexShrink: 0 }}>← Back</button>
            <button onClick={handleSubmit} disabled={!canSubmit || submitting} style={{ flex: 1, padding: '14px', borderRadius: 14, border: 'none', background: canSubmit && !submitting ? `linear-gradient(135deg,${AC},#6d28d9)` : '#e5e5ea', color: canSubmit && !submitting ? '#fff' : '#b0b0b8', fontSize: 15, fontWeight: 800, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', fontFamily: FF, boxShadow: canSubmit && !submitting ? `0 6px 20px ${AC}45` : 'none', transition: 'all .2s' }}>
              {submitting ? '⏳ Submitting…' : '🚀 Submit my response'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 10, fontSize: 11, color: T3 }}>
            Your response is shared only with the founder who sent this link
          </div>
        </div>
      </div>
    );
  }

  return null;
}
