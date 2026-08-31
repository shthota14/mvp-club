import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import type { Stage, User } from '@/types';

interface Props {
  mode: 'login' | 'register';
  onClose: () => void;
  onSwitchMode: () => void;
}

type Step = 'login' | 'register' | 'about' | 'forgot' | 'reset-sent';

const STAGES: { value: Stage; label: string; desc: string; emoji: string }[] = [
  { value: 'idea', label: 'Just an idea', desc: "I have something in mind but haven't started yet", emoji: '💡' },
  { value: 'hone', label: 'Shaping it', desc: "I'm refining the problem and the solution", emoji: '🎯' },
  { value: 'validate', label: 'Testing the waters', desc: 'Talking to people, seeing if this resonates', emoji: '🧪' },
  { value: 'shape', label: 'Building it', desc: "I know what to build, I'm shaping the MVP", emoji: '🔨' },
  { value: 'done', label: 'Almost shipped', desc: 'My MVP is close to ready', emoji: '🚀' },
];

const ROLE_OPTIONS = [
  { key: 'first-founder',  emoji: '🚀', label: 'First-time founder',  desc: 'Building my first startup' },
  { key: 'serial',         emoji: '🔄', label: 'Serial entrepreneur', desc: "I've launched before" },
  { key: 'angel',          emoji: '💰', label: 'Angel investor',       desc: 'I back early-stage ideas' },
  { key: 'vc',             emoji: '🏦', label: 'VC / Fund',            desc: 'I invest professionally' },
  { key: 'builder',        emoji: '🛠️', label: 'Builder / Developer',  desc: 'I build and want a project' },
  { key: 'designer',       emoji: '🎨', label: 'Designer',             desc: 'I help with product & UX' },
  { key: 'marketer',       emoji: '📢', label: 'Marketer',             desc: 'Growth, content, distribution' },
  { key: 'domain-expert',  emoji: '🧠', label: 'Domain expert',        desc: 'Deep knowledge in a field' },
  { key: 'operator',       emoji: '👩‍💼', label: 'Operator / Exec',      desc: 'Ex-startup or corporate exec' },
  { key: 'student',        emoji: '🎓', label: 'Student',              desc: 'Learning while building' },
  { key: 'mentor',         emoji: '🤝', label: 'Mentor / Advisor',     desc: "I've been there, happy to help" },
];

export default function AuthModal({ mode, onClose }: Props) {
  const { login } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(mode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [ideaName, setIdeaName] = useState('');
  const [ideaDesc, setIdeaDesc] = useState('');
  const [selectedStage, setSelectedStage] = useState<Stage>('idea');
  const [userRole, setUserRole] = useState('');
  const [hoveredRole, setHoveredRole] = useState('');
  const [showWelcomeNote, setShowWelcomeNote] = useState(true); // dismissible handwritten note on step 1

  const isDark = step === 'about';

  const handleForgot = async () => {
    if (!email) { setError('Please enter your email address.'); return; }
    setLoading(true); setError('');
    try {
      await authApi.forgotPassword(email);
      setStep('reset-sent');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const res = await authApi.login(email, password);
      login(res.data.token, res.data.user as User);
      onClose();
      // Returning users land on Community by default.
      navigate('/community');
    } catch {
      setError('Invalid email or password.');
    } finally { setLoading(false); }
  };

  const handleRegister = () => {
    if (!email || !password || !name) { setError('Please fill in all fields.'); return; }
    setError('');
    setStep('about');
  };

  const handleFinish = async () => {
    setLoading(true); setError('');
    try {
      const res = await authApi.register({
        email, password, name,
        ideaName, ideaDescription: ideaDesc,
        currentStage: selectedStage,
        // Community opt-in used to be its own blocking signup step (a
        // required yes/no before account creation). It defaults to true now
        // — this is a community product and the ask was never enforced for
        // real value anyway — so it can't hold up signup. Revisit as a real
        // settings toggle if that's ever needed.
        communityOpt: true,
        helpTypes: [],
        userRole,
      });
      login(res.data.token, res.data.user as User);
      onClose();
      navigate('/journey');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 500,
    background: isDark ? '#0a0a0a' : 'rgba(255,255,255,0.95)',
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'center', padding: isDark ? '48px 20px 64px' : '20px',
    overflowY: 'auto',
  };

  const box: React.CSSProperties = {
    width: '100%', maxWidth: 400,
    // `margin: auto` centres when it fits but, unlike `align-items: center`,
    // still lets the overlay scroll to the TOP when the form is taller than
    // the viewport (the register step is ~880px on a phone).
    margin: isDark ? 0 : 'auto',
    position: 'relative',
    background: isDark ? 'transparent' : 'white',
    borderRadius: isDark ? 0 : 24,
    padding: isDark ? 0 : 32,
    boxShadow: isDark ? 'none' : '0 8px 48px rgba(0,0,0,.12)',
    color: isDark ? '#fff' : '#000',
  };

  const inp = (dark: boolean): React.CSSProperties => ({
    width: '100%', padding: '13px 16px',
    border: `1.5px solid ${dark ? 'rgba(255,255,255,.1)' : '#e5e7eb'}`,
    borderRadius: 14, fontSize: 15,
    background: dark ? 'rgba(255,255,255,.06)' : 'white',
    color: dark ? 'white' : 'black',
    outline: 'none',
  });

  const primaryBtn = (dark: boolean): React.CSSProperties => ({
    width: '100%', padding: '15px',
    border: 'none', borderRadius: 14,
    background: dark ? 'white' : 'black',
    color: dark ? 'black' : 'white',
    fontSize: 15, fontWeight: 800, cursor: 'pointer',
    marginTop: 8,
  });

  return (
    <div style={overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={box}>
        {!isDark && (
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 10, right: 10,
              width: 40, height: 40, borderRadius: '50%',
              border: 'none', background: 'transparent',
              color: '#86868b', fontSize: 18, lineHeight: 1, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        )}

        {/* LOGIN */}
        {step === 'login' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.6, marginBottom: 4 }}>Welcome back</h2>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <input style={inp(false)} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <div style={{ position: 'relative' }}>
              <input style={inp(false)} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()} />
              <button onClick={() => setStep('forgot')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6366f1', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                Forgot?
              </button>
            </div>
            <button style={primaryBtn(false)} onClick={handleLogin} disabled={loading}>{loading ? 'Signing in…' : 'Sign in →'}</button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6e6e73', marginTop: 8 }}>
              No account? <button onClick={() => setStep('register')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Join free</button>
            </p>
          </div>
        )}

        {/* FORGOT PASSWORD */}
        {step === 'forgot' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ marginBottom: 4 }}>
              <button onClick={() => setStep('login')} style={{ background: 'none', border: 'none', color: '#b0b0b8', fontSize: 13, cursor: 'pointer', padding: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 4 }}>← Back</button>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, marginBottom: 4 }}>Reset your password</h2>
              <p style={{ fontSize: 13, color: '#6e6e73', marginTop: 4, lineHeight: 1.55 }}>Enter your email and we'll send you a link to get back in.</p>
            </div>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <input style={inp(false)} type="email" placeholder="Your email address" value={email} onChange={e => setEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleForgot()} autoFocus />
            <button style={primaryBtn(false)} onClick={handleForgot} disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link →'}
            </button>
          </div>
        )}

        {/* RESET SENT */}
        {step === 'reset-sent' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'center' }}>
            <div style={{ fontSize: 52, marginBottom: 4 }}>📬</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, margin: 0 }}>Check your inbox</h2>
            <p style={{ fontSize: 14, color: '#6e6e73', lineHeight: 1.65, margin: 0 }}>
              If <strong>{email}</strong> has an account, a reset link is on its way. Check your spam folder if you don't see it.
            </p>
            <button style={primaryBtn(false)} onClick={() => setStep('login')}>Back to sign in</button>
          </div>
        )}

        {/* REGISTER — step 1 of 2: account fields */}
        {step === 'register' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {showWelcomeNote ? (
              <div style={{
                background: '#fffbe6', border: '1px solid #fde68a', borderRadius: 10,
                padding: '10px 30px 10px 12px', fontFamily: "'Caveat', cursive", fontSize: 17,
                color: '#78350f', transform: 'rotate(-1.2deg)', marginBottom: 4, position: 'relative' as const,
              }}>
                Hey, welcome! This takes about 30 seconds ✍️
                <button
                  type="button"
                  onClick={() => setShowWelcomeNote(false)}
                  aria-label="Dismiss"
                  style={{ position: 'absolute' as const, top: 4, right: 8, background: 'none', border: 'none', fontFamily: 'inherit', fontSize: 13, color: '#92702a', cursor: 'pointer' }}
                >✕</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowWelcomeNote(true)}
                style={{ alignSelf: 'flex-start', fontSize: 11.5, fontWeight: 700, color: '#6366f1', background: '#eef2ff', border: 'none', borderRadius: 999, padding: '6px 12px', cursor: 'pointer', fontFamily: 'inherit', marginBottom: -4 }}
              >Show welcome note</button>
            )}
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: .06, color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: 999, marginBottom: 4, alignSelf: 'flex-start' }}>Step 1 of 2</span>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.6, marginBottom: 4 }}>Create your account</h2>
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <input style={inp(false)} type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            <input style={inp(false)} type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input style={inp(false)} type="password" placeholder="Password (min. 6 chars)" value={password} onChange={e => setPassword(e.target.value)} />

            <button style={primaryBtn(false)} onClick={handleRegister}>Continue →</button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
              Already a member? <button onClick={() => setStep('login')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Sign in</button>
            </p>
          </div>
        )}

        {/* ABOUT — step 2 of 2: role + idea + stage combined onto one
            screen. Previously three separate full-screen steps (role, idea,
            stage) plus a fourth blocking step (community) that gated account
            creation on an explicit yes/no. None of role, idea or stage were
            ever validated — you could already click through all three without
            picking anything — so folding them into one optional screen loses
            no enforcement, just three screen transitions. Community opt-in
            now defaults to true in handleFinish instead of asking here. */}
        {step === 'about' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: .06, color: '#a5b4fc', background: 'rgba(99,102,241,.18)', padding: '4px 10px', borderRadius: 999, alignSelf: 'flex-start' }}>Step 2 of 2</span>
            <div>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.6, color: '#fff', marginBottom: 4 }}>Tell us a bit about you.</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)' }}>Everything below is optional — skip anything that doesn't apply.</p>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>I am a…</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {ROLE_OPTIONS.map(r => {
                  const sel = userRole === r.key;
                  const hov = hoveredRole === r.key;
                  return (
                    <div key={r.key}
                      onClick={() => setUserRole(sel ? '' : r.key)}
                      onMouseEnter={() => setHoveredRole(r.key)}
                      onMouseLeave={() => setHoveredRole(h => h === r.key ? '' : h)}
                      style={{
                        padding: '8px 12px', cursor: 'pointer', borderRadius: 999,
                        display: 'flex', alignItems: 'center', gap: 6,
                        background: sel ? 'rgba(99,102,241,.22)' : 'rgba(255,255,255,.05)',
                        border: `1.5px solid ${sel ? '#6366f1' : hov ? 'rgba(255,255,255,.3)' : 'rgba(255,255,255,.12)'}`,
                        transition: 'all .15s ease',
                      }}>
                      <span style={{ fontSize: 15, lineHeight: 1 }}>{r.emoji}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: sel ? '#fff' : 'rgba(255,255,255,.65)' }}>{r.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>Got an idea already?</div>
              <input
                placeholder="Name it — e.g. Project Phoenix"
                value={ideaName} onChange={e => setIdeaName(e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1.5px solid rgba(255,255,255,.16)', background: 'transparent', fontSize: 14, color: '#fff', padding: '7px 2px', outline: 'none', boxSizing: 'border-box' as const, marginBottom: 10 }}
              />
              <input
                placeholder="In one line, what is it?"
                value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)}
                style={{ width: '100%', border: 'none', borderBottom: '1.5px solid rgba(255,255,255,.16)', background: 'transparent', fontSize: 14, color: '#fff', padding: '7px 2px', outline: 'none', boxSizing: 'border-box' as const }}
              />
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5, color: 'rgba(255,255,255,.35)', marginBottom: 8 }}>Where are you right now?</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                {STAGES.map(s => {
                  const sel = selectedStage === s.value;
                  return (
                    <div key={s.value} onClick={() => setSelectedStage(s.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 12px', borderRadius: 999,
                      border: `1.5px solid ${sel ? 'rgba(88,86,214,.6)' : 'rgba(255,255,255,.12)'}`,
                      background: sel ? 'rgba(88,86,214,.2)' : 'rgba(255,255,255,.05)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}>
                      <span style={{ fontSize: 14 }}>{s.emoji}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: sel ? '#fff' : 'rgba(255,255,255,.65)' }}>{s.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <button style={{ ...primaryBtn(true), background: 'linear-gradient(135deg,#34c759,#0066cc)', color: 'white', marginTop: 2 }} onClick={handleFinish} disabled={loading}>
              {loading ? 'Creating account…' : "Let's build something real →"}
            </button>
            <p style={{ textAlign: 'center', fontSize: 13, marginTop: -6 }}>
              <button onClick={() => setStep('register')} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>← Back</button>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
