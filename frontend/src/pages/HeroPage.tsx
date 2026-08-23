import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthModal from '@/components/Auth/AuthModal';

// Caveat (marker handwriting font) — same id/pattern as StageCompleteModal.tsx so it's loaded once app-wide
if (typeof document !== 'undefined' && !document.getElementById('caveat-font')) {
  const link = document.createElement('link');
  link.id = 'caveat-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&display=swap';
  document.head.appendChild(link);
}

export default function HeroPage() {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('register');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const open = (mode: 'login' | 'register') => { setAuthMode(mode); setAuthOpen(true); };
  const navigate = useNavigate();

  const stages = [
    { n: '01', label: 'Idea', desc: 'Capture a problem worth solving.', detail: 'Every great startup begins with a problem someone desperately needs solved. Not an app. Not a feature. A real, felt pain.', color: '#a78bfa' },
    { n: '02', label: 'Hone', desc: "Sharpen until it's specific and real.", detail: 'Vague ideas stay vague forever. Honing means narrowing to one person, one problem, one moment — until you can describe it in a single sentence.', color: '#60a5fa' },
    { n: '03', label: 'Validate', desc: 'Test with people before you build.', detail: 'Talk to strangers. Not friends. Strangers who have the problem. If three of them would pay you today, you have something real.', color: '#34d399' },
    { n: '04', label: 'Shape', desc: 'Define the smallest possible MVP.', detail: 'Strip every feature down to the one thing that delivers the core promise. Then cut it in half again. Ship that.', color: '#fbbf24' },
    { n: '05', label: 'Ship', desc: 'Launch, learn, and iterate fast.', detail: 'The only way to know if it works is to put it in front of real customers. Launch rough. Measure everything. Improve weekly.', color: '#f87171' },
  ];

  // Coordinates (in the 900x210 viewBox below) for each stage's waypoint on the winding trail map
  const trailPoints = [
    { x: 60, y: 165 }, { x: 270, y: 55 }, { x: 480, y: 150 }, { x: 690, y: 45 }, { x: 860, y: 110 },
  ];

  const faqs = [
    { icon: '🆓', q: 'Is MVP Club actually free?', a: "Yes \u2014 every core feature, for every founder, always. No paywalls, no feature gates that only unlock if you pay. If you find it useful, there's an optional way to support the project, but nothing here is held behind it." },
    { icon: '🤝', q: 'Why should I trust this?', a: "Honestly? Think of whoever's behind this as someone quietly on your side \u2014 conspiring, in the best sense of that word, to see you succeed. Not chasing your attention, not selling you something you don't need. Just someone who wants your idea to actually go somewhere, and will keep telling you the honest next step even when it isn't the exciting one." },
    { icon: '🤔', q: 'Is this AI giving me business advice, or is it just organizing my own thinking?', a: "MVP Club doesn't tell you what your idea should be. It asks you the questions a good advisor would ask, in the right order, and helps you organize what you already know \u2014 your assumptions, your interview notes, your decisions. The thinking stays yours." },
    { icon: '🔒', q: 'Do I have to share my idea publicly?', a: "No! Not without your consent. You control what you'd like to seek the community's assistance for \u2014 sharing your progress is something you choose to do, when you're ready, not something that happens automatically. Your workspace, the Idea, Hone, Validate, Shape, and Done stages, stays yours. Remember, this is a community-oriented initiative, built with one objective: to see you succeed." },
    { icon: '🎯', q: 'Is this for any kind of startup, or a specific type?', a: "Early-stage, pre-launch. If you have an idea and haven't validated it with real users yet, MVP Club is built for exactly that stage \u2014 from first sentence to first customer." },
  ];

  const features = [
    { label: 'Guided playbooks', desc: 'Step-by-step frameworks for every stage of the journey.' },
    { label: 'Startup templates', desc: 'Canvases, validation plans, checklists and more.' },
    { label: 'Community', desc: 'Founders at the exact same stage as you.' },
    { label: 'Accountability', desc: 'Goals, progress tracking, momentum.' },
    { label: 'Feedback loops', desc: 'Share ideas and get honest input fast.' },
    { label: 'One next step', desc: 'Always clear. Never overwhelming.' },
  ];

  return (
    <div style={{ background: '#080808', minHeight: '100vh', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif', overflowX: 'hidden' }}>

      <style>{`
        @keyframes waveFloat {
          0%   { transform: translateX(0px) translateY(0px) rotate(0deg); }
          33%  { transform: translateX(40px) translateY(-20px) rotate(1deg); }
          66%  { transform: translateX(-20px) translateY(10px) rotate(-0.5deg); }
          100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
        }
        @keyframes waveFloat2 {
          0%   { transform: translateX(0px) translateY(0px) rotate(0deg); }
          33%  { transform: translateX(-30px) translateY(15px) rotate(-1deg); }
          66%  { transform: translateX(25px) translateY(-10px) rotate(0.5deg); }
          100% { transform: translateX(0px) translateY(0px) rotate(0deg); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .hero-text { animation: fadeUp 0.9s ease both; }
        .hero-sub  { animation: fadeUp 0.9s ease 0.15s both; }
        .hero-cta  { animation: fadeUp 0.9s ease 0.28s both; }
        .wave1 { animation: waveFloat  9s ease-in-out infinite; transform-origin: center; }
        .wave2 { animation: waveFloat2 11s ease-in-out infinite; transform-origin: center; }
        .wave3 { animation: waveFloat  14s ease-in-out infinite reverse; transform-origin: center; }
        .stage-row:hover .stage-label { color: #fff; }
        .stage-row:hover .stage-bar   { opacity: 1; }

        /* ── Mobile ── below this width the desktop two/three-column grids
           (journey header, stage rows, features, community header, idea
           cards) are cramped into columns far too narrow to read — this
           collapses them to a single stacked column and tightens side
           padding so content isn't fighting the screen edges. */
        @media (max-width: 680px) {
          .hp-nav { padding: 14px 18px !important; }
          .hp-nav-tagline { display: none !important; }
          .hp-nav-icon { width: 28px !important; height: 28px !important; }
          .hp-mvp-text { font-size: 21px !important; }
          .hp-club-text { font-size: 14px !important; letter-spacing: 2px !important; }
          .hp-nav-signin { padding: 8px 10px !important; font-size: 13px !important; }
          .hp-nav-getstarted { padding: 8px 14px !important; font-size: 13px !important; }
          .hp-section-pad { padding-left: 20px !important; padding-right: 20px !important; padding-top: 56px !important; padding-bottom: 56px !important; }
          .hp-cta-pad { padding-top: 72px !important; padding-bottom: 72px !important; padding-left: 20px !important; padding-right: 20px !important; }
          .hp-2col { grid-template-columns: 1fr !important; gap: 28px !important; }
          .hp-stage-row { grid-template-columns: 1fr !important; gap: 10px !important; padding: 28px 0 !important; }
          .hp-feature-row { grid-template-columns: 1fr !important; gap: 6px !important; }
          .hp-idea-grid { grid-template-columns: 1fr !important; }
          .hp-footer { flex-direction: column !important; gap: 8px !important; text-align: center !important; }
          .hp-trail-map { display: none !important; }
        }
        /* Tablet — idea cards get some breathing room back before going full-width mobile */
        @media (min-width: 681px) and (max-width: 980px) {
          .hp-idea-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>

      {/* ── Nav ── */}
      <nav className="hp-nav" style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '20px 40px', position: 'fixed', top: 0, left: 0, right: 0,
        background: 'rgba(8,8,8,.8)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,.06)', zIndex: 100,
      }}>
        {/* Sun wordmark */}
        <button onClick={() => navigate('/')} aria-label="MVP Club home"
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, padding: 0, transition: 'opacity .15s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          {/* Sun SVG */}
          <svg className="hp-nav-icon" width="36" height="36" viewBox="0 0 36 36" fill="none">
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i * 45 * Math.PI) / 180;
              return (
                <line key={i}
                  x1={18 + 10 * Math.cos(a)} y1={18 + 10 * Math.sin(a)}
                  x2={18 + 15 * Math.cos(a)} y2={18 + 15 * Math.sin(a)}
                  stroke="white" strokeWidth="2.2" strokeLinecap="round" />
              );
            })}
            <circle cx="18" cy="18" r="6.5" fill="white" />
          </svg>
          {/* Text block */}
          <div style={{ lineHeight: 1, textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span className="hp-mvp-text" style={{ fontSize: 27, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>MVP</span>
              <span className="hp-club-text" style={{ fontSize: 19, fontWeight: 300, color: 'rgba(255,255,255,.7)', letterSpacing: 3, textTransform: 'uppercase' }}>Club</span>
            </div>
            <div className="hp-nav-tagline" style={{ fontSize: 9, color: 'rgba(255,255,255,.35)', fontWeight: 400, letterSpacing: 0.5, marginTop: 3 }}>
              From idea to launched
            </div>
          </div>
        </button>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button onClick={() => open('login')} className="hp-nav-signin"
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.45)', fontSize: 14, fontWeight: 500, cursor: 'pointer', padding: '8px 16px', borderRadius: 8 }}>
            Sign in
          </button>
          <button onClick={() => open('register')} className="hp-nav-getstarted"
            style={{ background: '#fff', color: '#080808', border: 'none', borderRadius: 100, padding: '9px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Get started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: 80, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>

        {/* Text block */}
        <div style={{ textAlign: 'center', padding: '0 24px', position: 'relative', zIndex: 2, maxWidth: 760, marginBottom: 0 }}>
          <p className="hero-text" style={{ fontSize: 13, fontWeight: 500, letterSpacing: 2.5, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', marginBottom: 28 }}>
            For early-stage founders
          </p>
          <h1 className="hero-text" style={{
            fontSize: 'clamp(32px, 5vw, 64px)', fontWeight: 700, lineHeight: 1.08,
            letterSpacing: '-3px', marginBottom: 24,
            fontFamily: 'var(--font-display)',
          }}>
            A clear path<br />for every founder!
          </h1>
          <p className="hero-sub" style={{ fontSize: 20, color: 'rgba(255,255,255,.45)', lineHeight: 1.7, maxWidth: 480, margin: '0 auto 36px', fontStyle: 'italic', fontFamily: 'var(--font-display)', letterSpacing: -0.3 }}>
            From first idea to first customer — one clear next step at every stage.
          </p>
          <div className="hero-cta" style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={() => open('register')}
              style={{
                background: '#fff', color: '#080808', border: 'none',
                borderRadius: 100, padding: '14px 32px', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              }}>
              <span style={{ fontSize: 16 }}>→</span> Start for free
            </button>
            <button onClick={() => open('login')}
              style={{
                background: 'rgba(255,255,255,.07)', color: 'rgba(255,255,255,.65)',
                border: '1px solid rgba(255,255,255,.1)', borderRadius: 100,
                padding: '14px 28px', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              }}>
              Sign in
            </button>
          </div>
        </div>

        {/* Wave visual */}
        <div style={{ width: '100%', maxWidth: 960, margin: '0 auto', position: 'relative', height: 240, flexShrink: 0 }}>
          <svg viewBox="0 0 960 240" xmlns="http://www.w3.org/2000/svg"
            style={{ width: '100%', height: '100%', overflow: 'visible' }}>
            <defs>
              <linearGradient id="g-amber" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity="0" />
                <stop offset="25%" stopColor="#f59e0b" stopOpacity="0.7" />
                <stop offset="75%" stopColor="#fb923c" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#fb923c" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="g-blue" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                <stop offset="30%" stopColor="#6366f1" stopOpacity="0.65" />
                <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.65" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="g-teal" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#14b8a6" stopOpacity="0" />
                <stop offset="40%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="60%" stopColor="#14b8a6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
              </linearGradient>
              <filter id="blur-wave">
                <feGaussianBlur stdDeviation="4" />
              </filter>
            </defs>

            {/* Amber ribbon — wide, low */}
            <g className="wave1" filter="url(#blur-wave)">
              <path d="M -80 170 C 100 110 260 200 480 150 C 700 100 860 180 1040 130 L 1040 180 C 860 230 700 155 480 205 C 260 255 100 165 -80 225 Z"
                fill="url(#g-amber)" />
            </g>

            {/* Blue ribbon — crosses over */}
            <g className="wave2" filter="url(#blur-wave)">
              <path d="M -60 110 C 120 160 300 80 500 130 C 700 180 880 90 1060 140 L 1060 185 C 880 140 700 230 500 180 C 300 130 120 210 -60 160 Z"
                fill="url(#g-blue)" />
            </g>

            {/* Teal/cyan ribbon — sits on top, narrower */}
            <g className="wave3" filter="url(#blur-wave)">
              <path d="M 0 140 C 180 100 360 170 560 120 C 760 70 920 150 1000 110 L 1000 148 C 920 188 760 108 560 158 C 360 208 180 138 0 178 Z"
                fill="url(#g-teal)" />
            </g>
          </svg>
        </div>

        {/* Social proof strip */}
        <div style={{ display: 'flex', gap: 32, alignItems: 'center', padding: '0 24px 60px', opacity: .3, flexWrap: 'wrap', justifyContent: 'center' }}>
          {['Idea stage', 'Validation', 'MVP build', 'First customers', 'Scale'].map((s, i) => (
            <span key={s} style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              {i > 0 && <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#fff', display: 'inline-block' }} />}
              {s}
            </span>
          ))}
        </div>
      </section>

      {/* ── About ── */}
      <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20 }}>
            Who we are
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, fontFamily: 'var(--font-display)', color: '#fff', marginBottom: 10 }}>
            Built by a founder,<br />for founders.
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.4)', fontStyle: 'italic', fontFamily: 'var(--font-display)', marginBottom: 36 }}>
            Not a platform. Not a course. A path.
          </p>

          {/* Handwritten sticky note — reuses the marker-note style from the stage-complete
              celebration screen. Placeholder text: swap in your real line before this ships. */}
          <div style={{
            display: 'inline-block', maxWidth: 360, textAlign: 'left', margin: '0 auto 36px',
            background: '#fffdf2', border: '1.5px solid #e5e0c8', borderRadius: 8,
            padding: '20px 24px', transform: 'rotate(-1.4deg)',
            boxShadow: '3px 5px 12px rgba(0,0,0,.3)',
          }}>
            <p style={{ fontFamily: 'var(--font-hand)', fontSize: 23, color: '#4a4426', lineHeight: 1.35, margin: 0 }}>
              I've shipped things before that nobody asked for. That's the whole reason MVP Club exists.
            </p>
          </div>

          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.45)', lineHeight: 1.8, fontFamily: 'var(--font-display)', fontStyle: 'italic', letterSpacing: -0.2, marginBottom: 36 }}>
            There's no feed to scroll here, no course to finish, no dashboard full of features you'll never open. Just one question, answered honestly at every stage: what should you do next? Idea. Hone it. Validate it. Shape it. Get it done.
          </p>

          {/* Trust badge strip */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
            {['🆓  Free forever', '🚫  No ads', '🔓  Built in public'].map(b => (
              <span key={b} style={{ fontSize: 12, fontWeight: 600, padding: '8px 16px', borderRadius: 100, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', color: 'rgba(255,255,255,.55)' }}>
                {b}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Journey section ── */}
      <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Header */}
          <div className="hp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 72, alignItems: 'end' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20 }}>
                The journey
              </p>
              <h2 style={{ fontSize: 'clamp(32px,4.5vw,56px)', fontWeight: 700, letterSpacing: -2, lineHeight: 1.05, fontFamily: 'var(--font-display)', color: '#fff', margin: 0 }}>
                Five stages.<br />One clear path.
              </h2>
            </div>
            <p style={{ fontSize: 20, color: 'rgba(255,255,255,.55)', lineHeight: 1.75, margin: 0, paddingBottom: 4, fontStyle: 'italic', fontFamily: 'var(--font-display)', letterSpacing: -0.3 }}>
              You're not the first founder to have your idea. But you might be the first to move through all five stages without skipping one. That's what separates the founders who launch from the ones who plan.
            </p>
          </div>

          {/* Winding trail map — visual overview before the detailed list below */}
          <div className="hp-trail-map" style={{ position: 'relative', width: '100%', maxWidth: 900, margin: '0 auto 64px', aspectRatio: '900 / 210' }}>
            <svg viewBox="0 0 900 210" style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
              <path
                d="M60,165 Q165,20 270,55 Q375,190 480,150 Q585,10 690,45 Q775,130 860,110"
                fill="none" stroke="rgba(255,255,255,.15)" strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round"
              />
              {stages.map((s, i) => (
                <circle key={s.n} cx={trailPoints[i].x} cy={trailPoints[i].y} r={9} fill={s.color} stroke="#080808" strokeWidth={3} />
              ))}
            </svg>
            {stages.map((s, i) => (
              <div key={s.n} style={{
                position: 'absolute', left: `${(trailPoints[i].x / 900) * 100}%`, top: `${(trailPoints[i].y / 210) * 100}%`,
                transform: 'translate(-50%, 16px)', textAlign: 'center', pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: 'var(--font-display)', letterSpacing: 0.3 }}>{s.label}</span>
              </div>
            ))}
          </div>

          {/* Stage rows */}
          {stages.map((s, i) => (
            <div key={s.n} className="stage-row hp-stage-row" style={{ display: 'grid', gridTemplateColumns: '64px 200px 1fr', gap: 32, alignItems: 'start', borderTop: i === 0 ? '1px solid rgba(255,255,255,.07)' : 'none', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '36px 0', cursor: 'default' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.2)', letterSpacing: 1, paddingTop: 6 }}>{s.n}</span>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingTop: 4 }}>
                <div className="stage-bar" style={{ width: 3, height: 40, borderRadius: 2, background: s.color, opacity: .6, flexShrink: 0, transition: 'opacity .2s', marginTop: 4 }} />
                <div>
                  <span className="stage-label" style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 700, letterSpacing: -1.5, color: 'rgba(255,255,255,.8)', transition: 'color .2s', fontFamily: 'var(--font-display)', lineHeight: 1, display: 'block' }}>{s.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: s.color, opacity: .8, letterSpacing: 0.2, marginTop: 6, display: 'block' }}>{s.desc}</span>
                </div>
              </div>
              <p style={{ fontSize: 16, color: 'rgba(255,255,255,.45)', lineHeight: 1.75, margin: 0, paddingTop: 6, fontStyle: 'italic', fontFamily: 'var(--font-display)', letterSpacing: -0.2 }}>{s.detail}</p>
            </div>
          ))}

        </div>
      </section>

      {/* ── Features ── */}
      <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px', background: 'rgba(255,255,255,.01)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div className="hp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 80px', alignItems: 'start' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20 }}>What you get</p>
              <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, fontFamily: 'var(--font-display)', color: '#fff' }}>
                Everything you need to start moving.
              </h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingTop: 8 }}>
              {features.map((f, i) => (
                <div key={f.label} className="hp-feature-row" style={{ borderBottom: '1px solid rgba(255,255,255,.07)', padding: '20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.8)' }}>{f.label}</span>
                  <span style={{ fontSize: 14, color: 'rgba(255,255,255,.3)', lineHeight: 1.55 }}>{f.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Community ── */}
      <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>

          {/* Header */}
          <div className="hp-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, marginBottom: 56, alignItems: 'end' }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20 }}>Community</p>
              <h2 style={{ fontSize: 'clamp(30px,4vw,52px)', fontWeight: 700, letterSpacing: -1.8, lineHeight: 1.05, fontFamily: 'var(--font-display)', color: '#fff', margin: 0 }}>
                Ideas from every<br />founder on the platform!
              </h2>
            </div>
            <div>
              <p style={{ fontSize: 18, color: 'rgba(255,255,255,.5)', lineHeight: 1.8, marginBottom: 28, fontStyle: 'italic', fontFamily: 'var(--font-display)', letterSpacing: -0.3 }}>
                Click one to explore, respond, or connect. Every idea here belongs to a real founder working through the same five stages as you.
              </p>
              <button onClick={() => open('register')}
                style={{ background: '#fff', color: '#080808', border: 'none', borderRadius: 100, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                See all startup ideas →
              </button>
            </div>
          </div>

          {/* Idea card grid */}
          <div className="hp-idea-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
            {[
              {
                name: 'Priya M.', initials: 'PM', avatar: '#6366f1',
                stage: 'Validate', stageColor: '#34d399',
                idea: 'AI scheduling assistant for independent therapists — auto-fills cancellations, sends reminders, handles intake forms.',
                replies: 12, encouraged: 34, time: '2h ago',
              },
              {
                name: 'James K.', initials: 'JK', avatar: '#f59e0b',
                stage: 'Hone', stageColor: '#60a5fa',
                idea: 'A marketplace where restaurants sell "imperfect" prep-cook meals directly to busy families at 40% off.',
                replies: 7, encouraged: 21, time: '5h ago',
              },
              {
                name: 'Sara L.', initials: 'SL', avatar: '#10b981',
                stage: 'Shape', stageColor: '#fbbf24',
                idea: 'Slack bot that detects when engineering teams are blocked and automatically escalates to the right person.',
                replies: 19, encouraged: 47, time: '1d ago',
              },
              {
                name: 'Omar R.', initials: 'OR', avatar: '#ec4899',
                stage: 'Idea', stageColor: '#a78bfa',
                idea: 'Subscription box for solo founders — curated tools, templates, and a monthly 1:1 with a mentor.',
                replies: 4, encouraged: 15, time: '3h ago',
              },
              {
                name: 'Ting W.', initials: 'TW', avatar: '#14b8a6',
                stage: 'Ship', stageColor: '#f87171',
                idea: 'Chrome extension that rewrites cold emails in real time to match the recipient\'s LinkedIn writing style.',
                replies: 31, encouraged: 88, time: '2d ago',
              },
              {
                name: 'Alex B.', initials: 'AB', avatar: '#8b5cf6',
                stage: 'Validate', stageColor: '#34d399',
                idea: 'B2B tool that turns customer support transcripts into weekly product insight reports — no analyst needed.',
                replies: 9, encouraged: 29, time: '6h ago',
              },
            ].map((card) => (
              <div key={card.name}
                onClick={() => open('register')}
                style={{
                  background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)',
                  borderRadius: 14, padding: '20px', cursor: 'pointer',
                  transition: 'border-color .15s, background .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.18)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.055)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,.07)'; (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,.03)'; }}
              >
                {/* Card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: card.avatar, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', flexShrink: 0 }}>
                      {card.initials}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.75)' }}>{card.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,.25)', marginTop: 1 }}>{card.time}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.8, color: card.stageColor, background: `${card.stageColor}18`, border: `1px solid ${card.stageColor}30`, borderRadius: 100, padding: '3px 10px', whiteSpace: 'nowrap' }}>
                    {card.stage}
                  </span>
                </div>

                {/* Idea text */}
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,.6)', lineHeight: 1.65, margin: '0 0 18px', minHeight: 66 }}>
                  {card.idea}
                </p>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 14 }}>
                  <button onClick={e => { e.stopPropagation(); open('register'); }}
                    style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 0', fontSize: 12, color: 'rgba(255,255,255,.45)', cursor: 'pointer', fontWeight: 600 }}>
                    👍 {card.encouraged}
                  </button>
                  <button onClick={e => { e.stopPropagation(); open('register'); }}
                    style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 0', fontSize: 12, color: 'rgba(255,255,255,.45)', cursor: 'pointer', fontWeight: 600 }}>
                    💬 {card.replies}
                  </button>
                  <button onClick={e => { e.stopPropagation(); open('register'); }}
                    style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 8, padding: '7px 0', fontSize: 12, color: 'rgba(255,255,255,.45)', cursor: 'pointer', fontWeight: 600 }}>
                    🤝 Connect
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Blur / CTA overlay hint */}
          <div style={{ textAlign: 'center', marginTop: 32, padding: '20px', borderRadius: 12, background: 'rgba(8,8,8,.6)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,.06)' }}>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,.3)' }}>Showing 6 of </span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,.55)' }}>247 active ideas</span>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,.3)' }}> — </span>
            <button onClick={() => open('register')} style={{ background: 'none', border: 'none', fontSize: 14, fontWeight: 700, color: '#a78bfa', cursor: 'pointer', padding: 0 }}>
              Join to see them all →
            </button>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px' }}>
        <div style={{ maxWidth: 700, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20, textAlign: 'center' }}>
            Questions
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, fontFamily: 'var(--font-display)', color: '#fff', marginBottom: 44, textAlign: 'center' }}>
            Good questions.
          </h2>
          <div>
            {faqs.map((f, i) => {
              const isOpen = faqOpen === i;
              return (
                <div key={f.q} style={{ borderBottom: '1px solid rgba(255,255,255,.07)' }}>
                  <button onClick={() => setFaqOpen(isOpen ? null : i)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
                      background: 'none', border: 'none', cursor: 'pointer', padding: '20px 4px', textAlign: 'left',
                    }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,.85)' }}>
                      <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
                      {f.q}
                    </span>
                    <span style={{ fontSize: 20, color: 'rgba(255,255,255,.3)', flexShrink: 0, transition: 'transform .2s', transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)' }}>
                      +
                    </span>
                  </button>
                  {isOpen && (
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,.45)', lineHeight: 1.75, margin: '0 4px 22px', paddingLeft: 30 }}>
                      {f.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Contact ── */}
      <section className="hp-section-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '96px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: 2.5, color: 'rgba(255,255,255,.25)', textTransform: 'uppercase', marginBottom: 20 }}>
            Contact
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.1, fontFamily: 'var(--font-display)', color: '#fff', marginBottom: 20 }}>
            Get in touch.
          </h2>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,.45)', lineHeight: 1.8, fontFamily: 'var(--font-display)', fontStyle: 'italic', letterSpacing: -0.2, marginBottom: 36 }}>
            MVP Club is small on purpose — one founder, no support queue. The fastest way to reach me is to create a free account and use the feedback button inside the app; I read every message myself.
          </p>
          <button onClick={() => open('register')}
            style={{ background: '#fff', color: '#080808', border: 'none', borderRadius: 100, padding: '13px 28px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Start for free →
          </button>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="hp-cta-pad" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '120px 40px', textAlign: 'center', background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(99,102,241,.08) 0%, transparent 70%)' }}>
        <h2 style={{ fontSize: 'clamp(36px,6vw,72px)', fontWeight: 700, letterSpacing: -2.5, lineHeight: 1.05, fontFamily: 'var(--font-display)', marginBottom: 24 }}>
          Ready to build<br />something real?
        </h2>
        <p style={{ fontSize: 16, color: 'rgba(255,255,255,.35)', marginBottom: 40 }}>
          Join free. No credit card required.
        </p>
        <button onClick={() => open('register')}
          style={{ background: '#fff', color: '#080808', border: 'none', borderRadius: 100, padding: '16px 40px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>
          Get started for free →
        </button>
      </section>

      {/* ── Footer ── */}
      <footer className="hp-footer" style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '28px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.15)' }}>© {new Date().getFullYear()} MVP Club</span>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,.2)', fontStyle: 'italic', fontFamily: 'var(--font-display)' }}>From idea to launched — one step at a time.</span>
      </footer>

      {authOpen && (
        <AuthModal mode={authMode} onClose={() => setAuthOpen(false)}
          onSwitchMode={() => setAuthMode(m => m === 'login' ? 'register' : 'login')} />
      )}
    </div>
  );
}
