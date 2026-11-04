import React, { useEffect, useMemo, useRef, useState } from 'react';

// 2026-10 redesign palette (mirrors index.css / WorkPage tokens).
const INK = '#16121d';
const INK2 = '#1c1726';
const INK_TXT = '#f5f2ff';
const INK_DIM = '#c9c0da';
const INK_MUTE = '#8a8299';
const ACCENT = '#7c3aed';
const LIME = '#d6ff3d';
const MONO = "'JetBrains Mono', ui-monospace, Menlo, monospace";

type Mod = 'idea' | 'hone' | 'validate' | 'shape' | 'done';

// ── Stage metadata ────────────────────────────────────────────────────────────

const STAGE_ORDER: Mod[] = ['idea', 'hone', 'validate', 'shape', 'done'];

const MOD_META: Record<Mod, { label: string; win: string }> = {
  idea:     { label: 'Idea',     win: 'You nailed your one-liner and your "why".' },
  hone:     { label: 'Hone',     win: 'You interrogated your idea and it held up.' },
  validate: { label: 'Validate', win: 'Real people confirmed the problem is real.' },
  shape:    { label: 'Shape',    win: 'You know exactly what to build and why.' },
  done:     { label: 'Ship',     win: "You turned an idea into something real. That's everything." },
};

const NEXT_STAGE: Partial<Record<Mod, { mod: Mod; label: string; desc: string }>> = {
  idea:     { mod: 'hone',     label: 'Hone it',      desc: 'Get specific. Define who has the problem, why it hurts, and score your idea.' },
  hone:     { mod: 'validate', label: 'Validate',     desc: 'Talk to 3 real people. Confirm the pain exists before you build anything.' },
  validate: { mod: 'shape',    label: 'Shape it',     desc: 'Design the simplest thing you can put in front of users in the next 4 weeks.' },
  shape:    { mod: 'done',     label: 'Get it done',  desc: 'Build your 3 features, find your first users, get real feedback.' },
};

const STAGE_QUOTES: Record<Mod, { text: string; attr: string }[]> = {
  idea: [
    { text: 'The way to get started is to quit talking and begin doing.', attr: '— Walt Disney' },
    { text: 'The secret of getting ahead is getting started.', attr: '— Mark Twain' },
    { text: 'A year from now you may wish you had started today.', attr: '— Karen Lamb' },
    { text: "You don't have to be great to start, but you have to start to be great.", attr: '— Zig Ziglar' },
    { text: 'Ideas are commodity. Execution of them is not.', attr: '— Michael Dell' },
    { text: 'Done is better than perfect.', attr: '— Sheryl Sandberg' },
    { text: "Whether you think you can, or you think you can't — you're right.", attr: '— Henry Ford' },
    { text: 'Action is the foundational key to all success.', attr: '— Pablo Picasso' },
    { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', attr: '— Chinese Proverb' },
    { text: 'Fortune favors the bold.', attr: '— Virgil' },
  ],
  hone: [
    { text: "If you're not embarrassed by the first version of your product, you've launched too late.", attr: '— Reid Hoffman, LinkedIn co-founder' },
  ],
  validate: [
    { text: 'Fall in love with the problem, not the solution, and the rest will follow.', attr: '— Uri Levine, Waze co-founder' },
  ],
  shape: [
    { text: "Build something 100 people love, not something 1 million people kind of like.", attr: '— Paul Graham, Y Combinator' },
  ],
  done: [
    { text: "Entrepreneurship is living a few years of your life like most people won't, so you can spend the rest like most people can't.", attr: '— Anonymous' },
  ],
};

// ── Confetti (only shown on final Ship stage) ─────────────────────────────────

const CONFETTI_COLORS = ['#ff3b30', '#ff9500', '#34c759', '#007aff', '#af52de', '#ff2d55', '#5ac8fa', '#ffcc00'];

function Confetti() {
  const pieces = useRef(
    Array.from({ length: 56 }, (_, i) => ({
      left:     `${(i * 1.8 + Math.sin(i) * 14 + 50) % 100}%`,
      delay:    `${(i * 0.055) % 1.6}s`,
      duration: `${1.5 + (i % 5) * 0.3}s`,
      color:    CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      size:     7 + (i % 5),
      round:    i % 3 === 0 ? '50%' : '2px',
    }))
  ).current;

  useEffect(() => {
    const id = 'stage-confetti-kf';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes confetti-fall {
          0%   { transform: translateY(-24px) rotate(0deg);   opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(600deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      {pieces.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', top: -24, left: p.left,
          width: p.size, height: p.size,
          borderRadius: p.round, background: p.color,
          animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
        }} />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  stage: Mod;
  fields: Record<string, string>;
  onContinue: () => void;
  // Only rendered on the final "done" stage — closes this modal without
  // navigating away, so the founder lands back in the wizard (sidebar still
  // shows every earlier stage as unlocked) instead of being pushed straight
  // out to the idea vault with no obvious way back in.
  onReviewSteps?: () => void;
}

const STAGE_VERB: Record<Mod, string> = { idea: 'Done.', hone: 'Held up.', validate: 'Proven.', shape: 'Scoped.', done: 'Live.' };

const eyebrow = (color: string, size = 11): React.CSSProperties => ({
  fontFamily: MONO, fontSize: size, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' as const, color,
});

// 2026-10 redesign: full-screen ink celebration — "Idea." with a lime full
// stop, the verb in violet, the founder's own statement on a lime card, a
// quote, and an "Up next" band with a lime CTA.
export default function StageCompleteModal({ stage, fields, onContinue, onReviewSteps }: Props) {
  const meta       = MOD_META[stage];
  const next       = NEXT_STAGE[stage];
  const quote      = useMemo(() => {
    const options = STAGE_QUOTES[stage];
    return options[Math.floor(Math.random() * options.length)];
  }, [stage]);
  const isDone     = stage === 'done';
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const isCore     = stageIndex < 3;
  const statement  = (fields.oneLiner || '').trim();
  const [copied, setCopied] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 450,
      background: INK, color: INK_TXT,
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Bricolage Grotesque', system-ui, sans-serif",
      overflowY: 'auto',
    }}>
      {isDone && <Confetti />}

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px clamp(16px, 3vw, 40px)', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: LIME, display: 'grid', placeItems: 'center', color: INK, fontWeight: 800, fontSize: 19 }}>✳</div>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>MVP <span style={{ fontWeight: 400, letterSpacing: '0.18em', fontSize: 14 }}>CLUB</span></span>
        </div>
        <div style={{ display: 'flex', gap: 6, flex: 1, maxWidth: 320 }}>
          {STAGE_ORDER.slice(0, 3).map((m, i) => (
            <div key={m} style={{ flex: 1, height: 6, borderRadius: 3, background: '#2a2236', overflow: 'hidden' }}>
              <div style={{ height: '100%', background: LIME, width: i <= stageIndex ? '100%' : '0%' }} />
            </div>
          ))}
        </div>
        <button onClick={onReviewSteps ?? onContinue} style={{ background: 'none', border: 'none', color: INK_DIM, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>Vault ✕</button>
      </header>

      <main style={{
        flex: 1, width: '100%', maxWidth: 1240, margin: '0 auto',
        padding: `clamp(16px, 4vw, 56px) clamp(16px, 3vw, 40px) ${isMobile ? '120px' : 'clamp(24px, 4vw, 56px)'}`,
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))', gap: 'clamp(32px, 5vw, 72px)',
        alignItems: 'center', position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <span style={eyebrow(LIME, 12)}>
            {isCore ? `Stage ${String(stageIndex + 1).padStart(2, '0')} / 03 · Complete ✓` : `${meta.label} · Complete ✓`}
          </span>
          <h1 style={{ margin: 0, fontSize: 'clamp(84px, 14vw, 200px)', fontWeight: 800, lineHeight: 0.88, letterSpacing: '-0.05em' }}>
            {meta.label}<span style={{ color: LIME }}>.</span><br />
            <span style={{ color: ACCENT }}>{STAGE_VERB[stage]}</span>
          </h1>
          <p style={{ margin: 0, fontSize: 'clamp(19px, 2vw, 24px)', color: INK_DIM, lineHeight: 1.35 }}>{meta.win}</p>
          <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 6, borderLeft: `3px solid ${ACCENT}`, paddingLeft: 16 }}>
            <blockquote style={{ margin: 0, fontSize: 'clamp(18px, 1.8vw, 22px)', fontWeight: 600, lineHeight: 1.35 }}>{quote.text}</blockquote>
            <figcaption style={{ fontFamily: MONO, fontSize: 12, color: INK_MUTE }}>{quote.attr}</figcaption>
          </figure>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {statement && (
            <div style={{ background: LIME, color: INK, borderRadius: 24, padding: 'clamp(20px, 2.6vw, 32px)', display: 'flex', flexDirection: 'column', gap: 12, transform: 'rotate(-1.2deg)', maxWidth: 520 }}>
              <span style={eyebrow(INK)}>Your one-liner</span>
              <p style={{ margin: 0, fontSize: 'clamp(20px, 2.4vw, 28px)', fontWeight: 600, lineHeight: 1.3 }}>“{statement}”</p>
            </div>
          )}
          <div style={{ width: '100%', maxWidth: 480, display: 'flex', gap: 10, flexWrap: 'wrap' as const }}>
            {statement && (
              <button
                onClick={() => { navigator.clipboard.writeText(statement); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
                style={{ background: 'transparent', color: INK_TXT, border: '1px solid #3a3148', borderRadius: 999, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
              >{copied ? 'Copied ✓' : 'Copy statement'}</button>
            )}
            {onReviewSteps && (
              <button onClick={onReviewSteps} style={{ background: 'transparent', color: INK_TXT, border: '1px solid #3a3148', borderRadius: 999, padding: '10px 16px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                Review answers
              </button>
            )}
          </div>
        </div>
      </main>

      <section style={{ position: 'relative', zIndex: 1, background: INK2 }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(18px, 2.5vw, 28px) clamp(16px, 3vw, 40px)', display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' as const }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1, minWidth: 260 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, display: 'grid', placeItems: 'center', fontFamily: MONO, fontWeight: 700, color: '#a78bfa', border: '1px solid #3a3148', flexShrink: 0 }}>
              {next ? String(STAGE_ORDER.indexOf(next.mod) + 1).padStart(2, '0') : '✓'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={eyebrow(INK_MUTE)}>{next ? (next.mod === 'validate' ? 'Up next · Final core stage' : next.mod === 'hone' ? 'Up next · ~10 min' : 'Up next · Optional') : 'What now'}</span>
              <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em' }}>{next ? next.label : 'Keep iterating'}</span>
              <span style={{ fontSize: 15, color: INK_DIM, lineHeight: 1.4 }}>{next ? next.desc : 'Back to your vault to start the next loop.'}</span>
            </div>
          </div>
          {!isMobile && (
            <button onClick={onContinue} style={{ background: LIME, color: INK, border: 'none', borderRadius: 16, padding: '20px 32px', fontSize: 19, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              {next ? `Start ${next.label} →` : 'Back to vault →'}
            </button>
          )}
        </div>
      </section>

      {isMobile && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, padding: '12px 14px 24px', background: INK2, zIndex: 2 }}>
          <button onClick={onContinue} style={{ display: 'block', width: '100%', background: LIME, color: INK, border: 'none', borderRadius: 14, padding: 17, fontSize: 18, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            {next ? `Start ${next.label} →` : 'Back to vault →'}
          </button>
        </div>
      )}
    </div>
  );
}
