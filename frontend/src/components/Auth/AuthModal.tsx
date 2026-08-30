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

type Step = 'login' | 'register' | 'role' | 'forgot' | 'reset-sent' | 'idea' | 'stage' | 'community';

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

// Roles whose own description implies they're actively building
// something of their own (vs. backing, advising, or helping others'
// ideas) — used to decide whether the post-signup "idea" step defaults
// to asking for an idea name or skips straight past it.
const FOUNDER_ROLES = new Set(['first-founder', 'serial', 'student']);

const HELP_OPTIONS = [
  { key: 'feedback', label: '💬 Idea feedback' },
  { key: 'accountability', label: '🔁 Accountability' },
  { key: 'technical', label: '🛠️ Technical help' },
  { key: 'cofounder', label: '🤝 Co-founder' },
  { key: 'validation', label: '🧪 Validation support' },
  { key: 'encouragement', label: '💛 Encouragement' },
  { key: 'beta', label: '🧑‍💻 Beta testers' },
  { key: 'brainstorm', label: '💡 Brainstorming' },
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
  const [ideaOverride, setIdeaOverride] = useState<boolean | null>(null); // null = follow role default
  const [communityOpt, setCommunityOpt] = useState<boolean | null>(null);
  const [helpTypes, setHelpTypes] = useState<string[]>([]);

  const isDark = ['idea', 'stage', 'community'].includes(step);

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
    setStep('role');
  };

  const handleFinish = async () => {
    setLoading(true); setError('');
    try {
      const res = await authApi.register({
        email, password, name,
        ideaName, ideaDescription: ideaDesc,
        currentStage: selectedStage,
        communityOpt: communityOpt ?? false,
        helpTypes,
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

  const toggleHelp = (key: string) =>
    setHelpTypes(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

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

        {/* ROLE — step 2 of 2: "I am a…" picker, split out of the account step */}
        {step === 'role' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <span style={{ display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: .06, color: '#6366f1', background: '#eef2ff', padding: '4px 10px', borderRadius: 999, marginBottom: 4, alignSelf: 'flex-start' }}>Step 2 of 2</span>
            <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.6, marginBottom: 4 }}>What best describes you?</h2>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: .5, color: '#6e6e73', marginBottom: -4 }}>
              I am a… <span style={{ fontWeight: 400, color: '#b0b0b8' }}>(pick one)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {ROLE_OPTIONS.map(r => {
                const sel = userRole === r.key;
                const hov = hoveredRole === r.key;
                return (
                  <div key={r.key}
                    onClick={() => setUserRole(sel ? '' : r.key)}
                    onMouseEnter={() => setHoveredRole(r.key)}
                    onMouseLeave={() => setHoveredRole(h => h === r.key ? '' : h)}
                    style={{
                      padding: 12, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: sel ? '#eef2ff' : '#fff',
                      border: `2.5px solid ${sel ? '#6366f1' : hov ? '#374151' : '#1f2937'}`,
                      borderRadius: sel
                        ? '15px 225px 15px 255px/225px 15px 255px 15px'
                        : '255px 15px 225px 15px/15px 225px 15px 255px',
                      transition: 'all .15s ease',
                    }}>
                    <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{r.emoji}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Caveat', cursive", fontSize: 20, fontWeight: 700, lineHeight: 1.15, color: '#1d1d1f' }}>{r.label}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 1 }}>{r.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <button style={primaryBtn(false)} onClick={() => setStep('idea')}>Continue →</button>
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6e6e73', marginTop: 4 }}>
              <button onClick={() => setStep('register')} style={{ background: 'none', border: 'none', color: '#6366f1', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>← Back</button>
            </p>
          </div>
        )}

        {/* IDEA */}
        {step === 'idea' && (() => {
          const roleDefault = !userRole || FOUNDER_ROLES.has(userRole);
          const showIdeaFields = ideaOverride !== null ? ideaOverride : roleDefault;
          const roleLabel = ROLE_OPTIONS.find(r => r.key === userRole)?.label;
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {showIdeaFields ? (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 4 }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>🌱</div>
                    <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.6, color: '#fff' }}>One more thing.</h2>
                    <p style={{ fontSize: 13.5, color: 'rgba(255,255,255,.45)', marginTop: 6 }}>Tell us about your idea so we can give you the right first step.</p>
                  </div>

                  {/* Note card — same paper/sticky-note motif as the hero page's
                      founder quote and the Caveat-font role picker, adapted for
                      this dark step so the idea itself feels like the one warm,
                      handwritten thing on an otherwise functional screen. */}
                  <div style={{
                    background: '#fffdf2', border: '1.5px solid #e5e0c8', borderRadius: 10,
                    padding: '20px 22px 18px', transform: 'rotate(-1deg)',
                    boxShadow: '4px 8px 20px rgba(0,0,0,.45)', margin: '6px 4px 10px',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#9c9270', marginBottom: 4 }}>🏷️ Give your idea a name</div>
                    <input
                      placeholder="e.g. Project Phoenix, FounderOS"
                      value={ideaName} onChange={e => setIdeaName(e.target.value)}
                      style={{
                        width: '100%', border: 'none', borderBottom: '2px solid #e5e0c8', background: 'transparent',
                        fontFamily: "'Caveat', cursive", fontSize: 26, fontWeight: 600, color: '#3f3a1f',
                        padding: '4px 2px 8px', outline: 'none', boxSizing: 'border-box' as const,
                      }}
                    />
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .5, color: '#9c9270', margin: '16px 0 4px' }}>💡 What is it? (one line)</div>
                    <input
                      placeholder="e.g. Helping founders ship faster with less overwhelm"
                      value={ideaDesc} onChange={e => setIdeaDesc(e.target.value)}
                      style={{
                        width: '100%', border: 'none', borderBottom: '1.5px solid #e5e0c8', background: 'transparent',
                        fontSize: 14.5, color: '#57503a', padding: '4px 2px 8px', outline: 'none', boxSizing: 'border-box' as const,
                      }}
                    />
                  </div>

                  <button style={{ ...primaryBtn(true), background: 'linear-gradient(135deg,#6366f1,#0066cc)', color: 'white' }} onClick={() => setStep('stage')}>Next →</button>
                  {roleDefault === false && (
                    <button onClick={() => setIdeaOverride(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'center' }}>
                      Actually, I'm not building my own idea →
                    </button>
                  )}
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
                    <h2 style={{ fontSize: 28, fontWeight: 800, letterSpacing: -.6, color: '#fff' }}>Got it{roleLabel ? ` — ${roleLabel.toLowerCase()}` : ''}.</h2>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginTop: 6, lineHeight: 1.5 }}>
                      You don't need an idea of your own to be here. We'll take you straight into the community, where you can see what founders are building and offer exactly what you're best at.
                    </p>
                  </div>
                  <button style={{ ...primaryBtn(true), background: 'linear-gradient(135deg,#6366f1,#0066cc)', color: 'white' }} onClick={() => setStep('community')}>Next →</button>
                  <button onClick={() => setIdeaOverride(true)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,.4)', fontSize: 12, cursor: 'pointer', padding: 0, textAlign: 'center' }}>
                    Actually, I do have an idea of my own →
                  </button>
                </>
              )}
            </div>
          );
        })()}

        {/* STAGE */}
        {step === 'stage' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ marginBottom: 4 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.6, color: '#fff' }}>Where are you right now?</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginTop: 6 }}>We'll put you at the right starting point.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.map(s => (
                <div key={s.value} onClick={() => setSelectedStage(s.value)} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '13px 14px', borderRadius: 14,
                  border: `1.5px solid ${selectedStage === s.value ? 'rgba(88,86,214,.6)' : 'rgba(255,255,255,.1)'}`,
                  background: selectedStage === s.value ? 'rgba(88,86,214,.2)' : 'rgba(255,255,255,.04)',
                  cursor: 'pointer', transition: 'all .15s',
                }}>
                  <span style={{ fontSize: 20 }}>{s.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>{s.desc}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: 20, height: 20, borderRadius: '50%', border: `1.5px solid ${selectedStage === s.value ? '#6366f1' : 'rgba(255,255,255,.2)'}`, background: selectedStage === s.value ? '#6366f1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff' }}>
                    {selectedStage === s.value && '✓'}
                  </div>
                </div>
              ))}
            </div>
            <button style={{ ...primaryBtn(true), background: 'linear-gradient(135deg,#6366f1,#0066cc)', color: 'white' }} onClick={() => setStep('community')}>Almost there →</button>
          </div>
        )}

        {/* COMMUNITY */}
        {step === 'community' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🤝</div>
              <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: -.6, color: '#fff' }}>You don't have to do this alone.</h2>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', marginTop: 8, lineHeight: 1.5 }}>Founders in this community are at every stage. Want them in your corner?</p>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              {[{ val: true, emoji: '👋', label: "Yes, I'm in" }, { val: false, emoji: '🎧', label: 'Maybe later' }].map(opt => (
                <button key={String(opt.val)} onClick={() => setCommunityOpt(opt.val)} style={{
                  flex: 1, padding: '16px 10px', borderRadius: 14, cursor: 'pointer',
                  border: `2px solid ${communityOpt === opt.val ? (opt.val ? 'rgba(52,199,89,.6)' : 'rgba(255,255,255,.3)') : 'rgba(255,255,255,.1)'}`,
                  background: communityOpt === opt.val ? (opt.val ? 'rgba(52,199,89,.18)' : 'rgba(255,255,255,.1)') : 'rgba(255,255,255,.04)',
                  color: communityOpt === opt.val ? '#fff' : 'rgba(255,255,255,.45)',
                  fontSize: 13, fontWeight: 700, transition: 'all .15s',
                }}>
                  <div style={{ fontSize: 26, marginBottom: 6 }}>{opt.emoji}</div>
                  {opt.label}
                </button>
              ))}
            </div>
            {communityOpt && (
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: .4, color: 'rgba(255,255,255,.3)', marginBottom: 10 }}>What kind of help? <span style={{ fontWeight: 400 }}>(pick all that apply)</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {HELP_OPTIONS.map(h => (
                    <div key={h.key} onClick={() => toggleHelp(h.key)} style={{
                      padding: '11px 12px', borderRadius: 12, cursor: 'pointer', fontSize: 12, fontWeight: 600, textAlign: 'center',
                      border: `1.5px solid ${helpTypes.includes(h.key) ? 'rgba(52,199,89,.5)' : 'rgba(255,255,255,.1)'}`,
                      background: helpTypes.includes(h.key) ? 'rgba(52,199,89,.18)' : 'rgba(255,255,255,.04)',
                      color: helpTypes.includes(h.key) ? '#34c759' : 'rgba(255,255,255,.55)',
                      transition: 'all .15s',
                    }}>
                      {h.label}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {error && <div style={{ color: '#ff3b30', fontSize: 13 }}>{error}</div>}
            <button style={{ ...primaryBtn(true), background: 'linear-gradient(135deg,#34c759,#0066cc)', color: 'white', marginTop: 4 }} onClick={handleFinish} disabled={loading || communityOpt === null}>
              {loading ? 'Creating account…' : "Let's build something real →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
