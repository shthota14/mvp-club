import { useEffect, useMemo, useRef } from 'react';

// ── Caveat (marker handwriting font) ─────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('caveat-font')) {
  const link = document.createElement('link');
  link.id = 'caveat-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap';
  document.head.appendChild(link);
}

const STAGE_COLORS_MAP: Record<string, string> = {
  idea: '#5856d6', hone: '#0066cc', validate: '#34c759', shape: '#ff9500', done: '#ff3b30',
};

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

// ── Animated tick SVG ─────────────────────────────────────────────────────────
// Draws a circle then a checkmark using stroke-dashoffset animation.
// Circle circumference ≈ 2π × 54 ≈ 339; check path length ≈ 130.

function AnimatedTick({ color }: { color: string }) {
  useEffect(() => {
    const id = 'wb-tick-kf';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = `
        @keyframes draw-circle {
          from { stroke-dashoffset: 340; }
          to   { stroke-dashoffset: 0; }
        }
        @keyframes draw-check {
          0%   { stroke-dashoffset: 130; opacity: 0; }
          10%  { opacity: 1; }
          100% { stroke-dashoffset: 0; }
        }
        @keyframes pop-in {
          0%   { transform: scale(0.7); opacity: 0; }
          60%  { transform: scale(1.08); }
          100% { transform: scale(1);   opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <div style={{ animation: 'pop-in 0.5s cubic-bezier(.34,1.56,.64,1) forwards', display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
      <svg width="160" height="160" viewBox="0 0 120 120" fill="none">
        {/* Shadow ring */}
        <circle cx="60" cy="60" r="54" stroke="#e0e0e0" strokeWidth="5" />
        {/* Animated circle */}
        <circle
          cx="60" cy="60" r="54"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray="340"
          strokeDashoffset="340"
          transform="rotate(-90 60 60)"
          style={{ animation: 'draw-circle 0.6s ease-out 0.1s forwards' }}
        />
        {/* Animated checkmark */}
        <path
          d="M33 60 L52 80 L87 40"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="130"
          strokeDashoffset="130"
          style={{ animation: 'draw-check 0.45s ease-out 0.65s forwards' }}
        />
      </svg>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  stage: Mod;
  fields: Record<string, string>;
  onContinue: () => void;
}

// Whiteboard palette
const WB_BG   = '#fefefe';
const WB_TEXT = '#1a1a1a';
const WB_DIM  = '#666';
const WB_RULE = '#e8e8e8';

export default function StageCompleteModal({ stage, onContinue }: Props) {
  const meta       = MOD_META[stage];
  const next       = NEXT_STAGE[stage];
  const quote      = useMemo(() => {
    const options = STAGE_QUOTES[stage];
    return options[Math.floor(Math.random() * options.length)];
  }, [stage]);
  const isDone     = stage === 'done';
  const stageIndex = STAGE_ORDER.indexOf(stage);
  const color      = STAGE_COLORS_MAP[stage];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 450,
      background: WB_BG,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px 20px',
      fontFamily: "'Caveat', 'Comic Sans MS', cursive, system-ui",
      overflowY: 'auto',
    }}>
      {isDone && <Confetti />}

      {/* Top marker-line accent */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6, background: color, zIndex: 2 }} />

      <div style={{
        position: 'relative', zIndex: 1,
        width: '100%', maxWidth: 420,
        display: 'flex', flexDirection: 'column', gap: 0,
      }}>

        {/* ── Progress track ── */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
          {STAGE_ORDER.map((s, i) => (
            <div key={s} style={{
              height: 5, borderRadius: 3,
              width: i === stageIndex ? 44 : 24,
              background: i <= stageIndex ? color : '#e0e0e0',
              transition: 'width .3s',
            }} />
          ))}
        </div>

        {/* ── Huge animated tick ── */}
        <AnimatedTick color={color} />

        {/* ── Stage complete label + title ── */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: WB_DIM, marginBottom: 6 }}>
            Stage complete
          </div>
          <div style={{ fontSize: 48, fontWeight: 700, color: WB_TEXT, lineHeight: 1.0, marginBottom: 8 }}>
            {meta.label}
          </div>
          {/* Marker underline */}
          <div style={{ width: 60, height: 5, background: color, borderRadius: 3, margin: '0 auto 12px' }} />
          <div style={{ fontSize: 20, color: WB_DIM, lineHeight: 1.5 }}>
            {meta.win}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 2, background: WB_RULE, margin: '4px 0 20px' }} />

        {/* ── Quote (sticky note) ── */}
        <div style={{
          textAlign: 'center', marginBottom: 20, marginLeft: 8, marginRight: 8,
          background: '#fffdf2', border: '1.5px solid #e5e0c8', borderRadius: 8,
          padding: '18px 20px', transform: 'rotate(-1.4deg)',
          boxShadow: '3px 5px 12px rgba(0,0,0,0.10)',
        }}>
          <p style={{
            fontSize: 21, color: '#4a4426',
            lineHeight: 1.5, margin: '0 0 8px',
          }}>
            {quote.text}
          </p>
          <p style={{ fontFamily: "system-ui, sans-serif", fontSize: 12.5, color: '#a39a5c', fontWeight: 700, margin: 0 }}>
            {quote.attr}
          </p>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 2, background: WB_RULE, margin: '4px 0 20px' }} />

        {/* ── Next stage card ── */}
        {!isDone && next && (
          <div style={{
            border: `2.5px solid ${color}`,
            borderRadius: 10, background: `${color}08`,
            padding: '16px 18px',
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: `2.5px solid ${color}`,
              background: `${color}15`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase' as const, color: WB_DIM, marginBottom: 3 }}>Up next</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: WB_TEXT, marginBottom: 2 }}>{next.label}</div>
              <div style={{ fontSize: 15, color: WB_DIM, lineHeight: 1.4 }}>{next.desc}</div>
            </div>
          </div>
        )}

        {isDone && (
          <div style={{
            border: `2.5px solid ${color}`,
            borderRadius: 10, background: `${color}08`,
            padding: '18px', marginBottom: 16,
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: WB_TEXT, marginBottom: 5 }}>
              You're a founder now. 🚀
            </div>
            <div style={{ fontSize: 17, color: WB_DIM, lineHeight: 1.5 }}>
              Share your launch in the community and keep iterating.
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <button
          onClick={onContinue}
          style={{
            width: '100%',
            background: color, color: '#fff',
            border: 'none', borderRadius: 8,
            padding: '18px 0', fontSize: 24, fontWeight: 700,
            cursor: 'pointer', letterSpacing: '.03em',
            fontFamily: "'Caveat', 'Comic Sans MS', cursive, system-ui",
            boxShadow: `0 4px 20px ${color}40`,
            transition: 'opacity .15s, transform .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {isDone ? 'Go to my idea vault →' : `Start ${next!.label} →`}
        </button>

      </div>
    </div>
  );
}
