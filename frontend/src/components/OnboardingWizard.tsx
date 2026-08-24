import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ideasApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import { STAGE_COLORS, STAGE_LABELS, Stage } from '@/types';

interface Props {
  onComplete: () => void;
}

const STAGES: { key: Stage; desc: string }[] = [
  { key: 'idea',     desc: 'Capture what you want to build.' },
  { key: 'hone',     desc: 'Sharpen the problem and who it\'s for.' },
  { key: 'validate', desc: 'Talk to real people. Confirm it matters.' },
  { key: 'shape',    desc: 'Define the simplest version to build.' },
  { key: 'done',     desc: 'Ship it and get your first real feedback.' },
];

const btn = (primary: boolean): React.CSSProperties => ({
  background: primary ? '#1d1d1f' : 'none',
  color: primary ? '#fff' : '#6e6e73',
  border: 'none',
  borderRadius: primary ? 12 : 0,
  padding: primary ? '12px 28px' : '12px 4px',
  fontSize: 14,
  fontWeight: primary ? 600 : 400,
  cursor: 'pointer',
  letterSpacing: '-0.01em',
  transition: 'opacity .15s',
});

export default function OnboardingWizard({ onComplete }: Props) {
  const { refreshIdeas } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [ideaText, setIdeaText] = useState('');
  const [saving, setSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 3) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [step]);

  const handleFinish = async () => {
    setSaving(true);
    try {
      if (ideaText.trim()) {
        await ideasApi.create({ name: ideaText.trim(), description: null });
        await refreshIdeas();
        onComplete();
        navigate('/work');
      } else {
        onComplete();
        navigate('/journey');
      }
    } catch {
      onComplete();
      navigate('/journey');
    }
    setSaving(false);
  };

  // ── Step content ───────────────────────────────────────────────────────────

  const steps = [
    // 0 — Welcome
    <div key="welcome" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🚀</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.03em' }}>
        Welcome to MVP Club
      </h1>
      <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 14, lineHeight: 1.65 }}>
        A guided path from idea to your first real startup.
      </p>
      <p style={{ fontSize: 13, color: '#aeaeb2', marginTop: 6, lineHeight: 1.6 }}>
        One clear next step at a time — validate your idea first, then build and ship if you want to.
      </p>
    </div>,

    // 1 — Stage orientation
    <div key="stages">
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        Your path to launch
      </h2>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 20px' }}>
        Three core stages to validate your idea. Shape and Ship are there after if you want to keep going.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {STAGES.map(({ key, desc }, i) => (
          <div key={key} style={{
            display: 'flex', alignItems: 'center', gap: 14,
            padding: '11px 14px', borderRadius: 12,
            background: '#f5f5f7',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              background: STAGE_COLORS[key], color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 700, flexShrink: 0,
            }}>
              {i + 1}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f', display: 'flex', alignItems: 'center', gap: 6 }}>
                {STAGE_LABELS[key]}
                {(key === 'shape' || key === 'done') && (
                  <span style={{ fontSize: 9, fontWeight: 700, color: '#8e8e93', background: '#fff', border: '1px solid #e5e5ea', borderRadius: 999, padding: '1px 6px' }}>
                    OPTIONAL
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 1 }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>,

    // 2 — Patience / don't skip steps
    <div key="patience">
      <style>{`
        @keyframes obPatienceRow {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes obPatienceBar {
          from { transform: scaleX(0); }
          to   { transform: scaleX(1); }
        }
      `}</style>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        Slow is the fast way
      </h2>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 20px', lineHeight: 1.6 }}>
        The #1 reason startups fail isn't a bad idea — it's building on a step nobody actually finished.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Path A — rushes ahead */}
        <div style={{
          padding: '14px 16px', borderRadius: 14, background: '#fff5f5', border: '1px solid #fecaca',
          textAlign: 'left', animation: 'obPatienceRow .45s ease both', animationDelay: '0ms',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#dc2626', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 }}>
            ⚡ Rushes ahead
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {STAGES.map(({ key }, i) => (
              <div key={key} style={{
                flex: 1, height: 6, borderRadius: 4, transformOrigin: 'left',
                background: i === 1 || i === 2 ? '#fecaca' : '#dc262660',
                animation: 'obPatienceBar .5s cubic-bezier(.16,1,.3,1) both',
                animationDelay: `${150 + i * 70}ms`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#b91c1c', lineHeight: 1.5 }}>
            Builds fast, skips validation — ships something nobody asked for.
          </div>
        </div>

        {/* Path B — every step, in order */}
        <div style={{
          padding: '14px 16px', borderRadius: 14, background: '#f0fdf4', border: '1px solid #bbf7d0',
          textAlign: 'left', animation: 'obPatienceRow .45s ease both', animationDelay: '550ms',
        }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#15803d', textTransform: 'uppercase' as const, letterSpacing: 0.6, marginBottom: 8 }}>
            🐢 Every step, in order
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
            {STAGES.map(({ key }, i) => (
              <div key={key} style={{
                flex: 1, height: 6, borderRadius: 4, transformOrigin: 'left',
                background: STAGE_COLORS[key],
                animation: 'obPatienceBar .5s cubic-bezier(.16,1,.3,1) both',
                animationDelay: `${700 + i * 70}ms`,
              }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#15803d', lineHeight: 1.5 }}>
            Slower at first. Real by the end — validated by actual people, not assumptions.
          </div>
        </div>
      </div>

      <p style={{ fontSize: 12, color: '#aeaeb2', marginTop: 18, lineHeight: 1.6 }}>
        That's why each stage stays locked until the one before it is done — not to slow you down, but to keep you from spending months on the wrong thing.
      </p>
    </div>,

    // 3 — Idea capture
    <div key="idea">
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
        What's your idea?
      </h2>
      <p style={{ fontSize: 13, color: '#6e6e73', margin: '0 0 18px', lineHeight: 1.6 }}>
        One sentence. Rough is fine — you'll sharpen it as you go.
      </p>
      <textarea
        ref={textareaRef}
        value={ideaText}
        onChange={e => setIdeaText(e.target.value)}
        placeholder="e.g. An app that helps freelancers track invoices without spreadsheets"
        rows={3}
        style={{
          width: '100%', padding: '12px 14px',
          borderRadius: 10, border: '1.5px solid #d2d2d7',
          fontSize: 14, lineHeight: 1.6, color: '#1d1d1f',
          fontFamily: 'inherit', resize: 'none',
          outline: 'none', boxSizing: 'border-box',
          transition: 'border-color .18s',
        }}
        onFocus={e => (e.target.style.borderColor = '#007aff')}
        onBlur={e => (e.target.style.borderColor = '#d2d2d7')}
      />
      <p style={{ fontSize: 12, color: '#aeaeb2', marginTop: 8 }}>
        You can skip this and add your idea once you're in.
      </p>
    </div>,

    // 3 — Community intro
    <div key="community" style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 52, marginBottom: 20 }}>🤝</div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1d1d1f', margin: 0, letterSpacing: '-0.02em' }}>
        You're not alone
      </h2>
      <p style={{ fontSize: 15, color: '#6e6e73', marginTop: 14, lineHeight: 1.7 }}>
        Founders at every stage are building alongside you.
      </p>
      <p style={{ fontSize: 13, color: '#6e6e73', marginTop: 6, lineHeight: 1.7 }}>
        Share wins, ask for feedback, connect with people who get it — all from the Community tab.
      </p>
      <div style={{
        marginTop: 24, padding: '14px 20px',
        borderRadius: 12, background: '#f0f6ff',
      }}>
        <div style={{ fontSize: 13, color: '#007aff', fontWeight: 600 }}>
          💡 Post one win per week. It keeps you moving.
        </div>
      </div>
    </div>,
  ];

  // ── Layout ─────────────────────────────────────────────────────────────────

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 500,
      background: 'rgba(245,245,247,0.96)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: 24, overflowY: 'auto',
    }}>
      <div style={{
        width: '100%', maxWidth: 500,
        background: '#fff',
        borderRadius: 24,
        boxShadow: '0 16px 56px rgba(0,0,0,0.13)',
        margin: 'auto',
        padding: 'clamp(28px, 6vw, 44px) clamp(20px, 6vw, 44px) clamp(24px, 5vw, 36px)',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 36 }}>
          {[0, 1, 2, 3, 4].map(i => (
            <div key={i} style={{
              width: i === step ? 22 : 7, height: 7,
              borderRadius: 4,
              background: i === step ? '#1d1d1f' : '#d2d2d7',
              transition: 'all .3s',
            }} />
          ))}
        </div>

        {/* Step content */}
        {steps[step]}

        {/* Navigation */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: step > 0 ? 'space-between' : 'flex-end',
          marginTop: 36,
        }}>
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} style={btn(false)}>
              ← Back
            </button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {step === 3 && (
              <button
                onClick={() => { setIdeaText(''); setStep(4); }}
                style={btn(false)}
              >
                Skip
              </button>
            )}
            <button
              onClick={() => step < 4 ? setStep(s => s + 1) : handleFinish()}
              disabled={saving}
              style={btn(true)}
            >
              {step === 4 ? (saving ? 'Setting up…' : "Let's go →") : 'Continue →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
