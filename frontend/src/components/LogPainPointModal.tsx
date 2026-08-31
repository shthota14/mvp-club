import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi, publicApi } from '@/api/client';
import { LIT } from '@/styles/communityTheme';

// ── Shared pain-point types + encode/decode ─────────────────────────────────
// Extracted out of CommunityPage.tsx so the same modal can be used both by
// logged-in members (posting into their own feed) and by anonymous visitors
// on the public landing/pain-points pages (mode="public") — same fields, same
// visual language, different submit target and a different, non-blocking
// post-submit moment.

export interface PainPoint {
  id: string;
  user_id?: string | null;
  content: string;
  stage: string;
  created_at: string;
  author_name: string;
  author_initials: string;
  encourage_count: number;
  pursue_count?: number;
  comment_count: number;
  user_reacted?: 'encourage' | 'pursue' | null;
  is_guest?: boolean;
}

// Encoded JSON in content field: ||PP||{...}||END||
// Falls back to raw content if not present.
export interface PainPointData {
  description: string;
  audience: string;
  frequency: string;
  impact: 'low' | 'medium' | 'high';
  domain: string;
}

export function encodePP(data: PainPointData): string {
  return `||PP||${JSON.stringify(data)}||END||`;
}

export function decodePP(content: string): PainPointData | null {
  const m = content.match(/\|\|PP\|\|(.+?)\|\|END\|\|/s);
  if (!m) return null;
  try { return JSON.parse(m[1]); } catch { return null; }
}

export const IMPACT_COLORS: Record<string, { color: string; bg: string; border: string; label: string }> = {
  high:   { color: '#dc2626', bg: '#fff5f5', border: '#fca5a5', label: '🔥 High impact' },
  medium: { color: '#d97706', bg: '#fffbeb', border: '#fcd34d', label: '⚡ Medium impact' },
  low:    { color: '#059669', bg: '#f0fdf4', border: '#86efac', label: '💡 Low impact' },
};

export const FREQ_OPTS = ['Multiple times a day', 'Daily', 'Weekly', 'Monthly', 'Occasionally'];
export const IMPACT_OPTS = [
  { v: 'high',   label: '🔥 High — blocking or costly' },
  { v: 'medium', label: '⚡ Medium — annoying but managed' },
  { v: 'low',    label: '💡 Low — nice to fix' },
] as const;

const CARD_RADIUS = 22;
const FIELD_RADIUS = 12;

// Small MVP Club brand mark (same sun-and-rays motif as the hero nav logo,
// recolored for this card's light "editorial paper" theme) — reused in both
// the form header and the success header so the modal reads as MVP Club
// branded wherever it's opened from, including standalone on /pain-points
// where it's often the very first thing a visitor sees.
// Clickable — doubles as a "go to mvpclub.io" link, since this modal is
// often the very first (and sometimes only) thing a visitor sees, e.g.
// landing straight into it from a shared /pain-points link.
function BrandMark({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Go to MVP Club home"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, font: 'inherit' }}
    >
      <svg width="26" height="26" viewBox="0 0 36 36" fill="none">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i * 45 * Math.PI) / 180;
          return (
            <line key={i}
              x1={18 + 10 * Math.cos(a)} y1={18 + 10 * Math.sin(a)}
              x2={18 + 15 * Math.cos(a)} y2={18 + 15 * Math.sin(a)}
              stroke={LIT.accent} strokeWidth="2.2" strokeLinecap="round" />
          );
        })}
        <circle cx="18" cy="18" r="6.5" fill={LIT.accent} />
      </svg>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2.5, color: LIT.accent, textTransform: 'uppercase' as const, fontFamily: LIT.bodyFont }}>
        MVP Club
      </span>
    </button>
  );
}

// ── Log Pain Point Modal ──────────────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onLogged: (pp: PainPoint) => void;
  // "member": existing behavior — posts as the logged-in user, auto-closes
  //   shortly after success.
  // "public": no account required. Adds an optional email field, submits to
  //   the unauthenticated endpoint, and — since this is meant to be a soft,
  //   non-blocking invitation rather than a signup wall — stays open after
  //   success with an optional "create a free account" CTA the visitor can
  //   ignore and just close instead.
  mode?: 'member' | 'public';
}

export default function LogPainPointModal({ onClose, onLogged, mode = 'member' }: Props) {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [audience,    setAudience]    = useState('');
  const [frequency,   setFrequency]   = useState('');
  const [impact,      setImpact]      = useState<'low' | 'medium' | 'high'>('medium');
  const [domain,      setDomain]      = useState('');
  const [email,       setEmail]       = useState('');
  const [posting,     setPosting]     = useState(false);
  const [posted,      setPosted]      = useState(false);
  const [held,        setHeld]        = useState(false);
  const [error,       setError]       = useState('');

  const valid = description.trim().length >= 10 && audience.trim().length >= 3 && frequency;

  const handle = async () => {
    if (!valid) return;
    setPosting(true);
    setError('');
    try {
      const data: PainPointData = { description: description.trim(), audience: audience.trim(), frequency, impact, domain: domain.trim() };

      if (mode === 'public') {
        const res = await publicApi.createPainPoint({ ...data, email: email.trim() });
        const isHeld = res.data?.held === true;
        setHeld(isHeld);
        setPosted(true);
        const pp: PainPoint = {
          id: res.data?.id ?? Date.now().toString(),
          content: encodePP(data), stage: 'idea',
          created_at: res.data?.created_at ?? new Date().toISOString(),
          author_name: 'Anonymous founder', author_initials: '👤',
          encourage_count: 0, pursue_count: 0, comment_count: 0, user_reacted: null,
          is_guest: true,
        };
        // Public mode doesn't auto-close — the success state below carries
        // the optional register invitation, and the visitor decides when
        // they're done rather than being timed out of it.
        if (!isHeld) onLogged(pp);
      } else {
        const content = encodePP(data);
        const res = await communityApi.createPost({ content, stage: 'idea', post_type: 'pain_point' });
        setPosted(true);
        const pp = res.data.post ?? { id: Date.now().toString(), content, stage: 'idea', created_at: new Date().toISOString(), author_name: 'You', author_initials: 'Y', encourage_count: 0, pursue_count: 0, comment_count: 0, user_reacted: null };
        setTimeout(() => { onLogged(pp); onClose(); }, 1200);
      }
    } catch {
      setError("Something went wrong — mind trying again in a moment?");
    }
    finally { setPosting(false); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 300, backdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '94%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto',
        background: LIT.card, borderRadius: CARD_RADIUS,
        boxShadow: '0 40px 100px rgba(70,50,15,.24)', zIndex: 301,
      }}>
        {/* Branded header band */}
        <div style={{
          position: 'relative' as const, textAlign: 'center' as const,
          padding: '26px 28px 20px', background: LIT.accentSoft,
          borderBottom: `1px solid ${LIT.accentSoftBorder}`,
          borderRadius: `${CARD_RADIUS}px ${CARD_RADIUS}px 0 0`,
        }}>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute' as const, top: 14, right: 14,
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,.6)', border: 'none', borderRadius: '50%',
              fontSize: 14, color: LIT.secondary, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >✕</button>
          <BrandMark onClick={() => { onClose(); navigate('/'); }} />
        </div>

        <div style={{ padding: '26px 28px 28px' }}>
          {posted ? (
            <div style={{ textAlign: 'center', padding: '20px 0 0' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>{held ? '🕓' : '🎯'}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>
                {held ? "Pain point received" : "Pain point logged!"}
              </div>
              <div style={{ fontSize: 14, color: LIT.secondary, marginTop: 6, fontFamily: LIT.bodyFont }}>
                {held
                  ? "It's in review before it goes public — thanks for your patience."
                  : "Other founders can now discover and pursue it."}
              </div>

              {mode === 'public' && (
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: `1px solid ${LIT.border}` }}>
                  <div style={{ fontSize: 13.5, color: LIT.secondary, marginBottom: 14, fontFamily: LIT.bodyFont, lineHeight: 1.5 }}>
                    Want to see what founders are building on pain points like this — or come back and build on your own?
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' as const }}>
                    <button
                      onClick={() => navigate('/', { state: { openRegister: true } })}
                      style={{
                        padding: '11px 20px', borderRadius: FIELD_RADIUS, border: 'none',
                        background: LIT.accent, color: '#fff', fontSize: 13.5, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >
                      Create a free account →
                    </button>
                    <button onClick={onClose} style={{
                      padding: '11px 20px', borderRadius: FIELD_RADIUS,
                      border: `1.5px solid ${LIT.border}`, background: LIT.card,
                      color: LIT.secondary, fontSize: 13.5, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>
                      No thanks, I'm done
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6, color: LIT.text, fontFamily: LIT.headFont, textAlign: 'center' as const }}>
                🎯 Log a pain point
              </div>
              <div style={{ fontSize: 14, color: LIT.secondary, marginBottom: 26, fontFamily: LIT.bodyFont, textAlign: 'center' as const, lineHeight: 1.55 }}>
                {mode === 'public'
                  ? "Describe a real problem you've seen. No account needed — other founders can pick it up and build a solution."
                  : "Describe a real problem you've seen. Other founders can pick it up and build a solution."}
              </div>

              {/* Description */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                What's the pain? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <textarea
                autoFocus
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="e.g. Freelancers spend 3+ hours a week chasing overdue invoices with no visibility into when they'll get paid."
                rows={3}
                style={{ width: '100%', padding: '11px 13px', borderRadius: FIELD_RADIUS, border: `1.5px solid ${LIT.border}`, fontSize: 14, lineHeight: 1.65, resize: 'vertical' as const, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: 18, color: LIT.text }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Who */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                Who experiences this? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Freelancers, small agencies, consultants"
                style={{ width: '100%', padding: '11px 13px', borderRadius: FIELD_RADIUS, border: `1.5px solid ${LIT.border}`, fontSize: 14, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: 18, color: LIT.text }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Frequency */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 8, fontFamily: LIT.headFont }}>
                How often does it happen? <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 18 }}>
                {FREQ_OPTS.map(f => (
                  <button key={f} onClick={() => setFrequency(f)} style={{
                    padding: '6px 14px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s',
                    border: `1.5px solid ${frequency === f ? LIT.accent : LIT.border}`,
                    background: frequency === f ? LIT.accentSoft : LIT.card,
                    color: frequency === f ? LIT.accent : LIT.secondary,
                  }}>{f}</button>
                ))}
              </div>

              {/* Impact */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 8, fontFamily: LIT.headFont }}>
                How painful is it?
              </label>
              <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                {IMPACT_OPTS.map(o => {
                  const ic = IMPACT_COLORS[o.v];
                  const sel = impact === o.v;
                  return (
                    <button key={o.v} onClick={() => setImpact(o.v)} style={{
                      flex: 1, padding: '10px 6px', borderRadius: FIELD_RADIUS, fontSize: 11, fontWeight: 700,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .12s', textAlign: 'center' as const,
                      border: `2px solid ${sel ? ic.color : LIT.border}`,
                      background: sel ? ic.bg : LIT.cardTint,
                      color: sel ? ic.color : LIT.muted,
                    }}>{o.label}</button>
                  );
                })}
              </div>

              {/* Domain (optional) */}
              <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                Industry / domain <span style={{ color: LIT.muted, fontWeight: 400 }}>(optional)</span>
              </label>
              <input
                value={domain}
                onChange={e => setDomain(e.target.value)}
                placeholder="e.g. Fintech, Healthcare, Education…"
                style={{ width: '100%', padding: '11px 13px', borderRadius: FIELD_RADIUS, border: `1.5px solid ${LIT.border}`, fontSize: 14, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: mode === 'public' ? 18 : 24, color: LIT.text }}
                onFocus={e => (e.target.style.borderColor = LIT.accent)}
                onBlur={e => (e.target.style.borderColor = LIT.border)}
              />

              {/* Email (optional, public mode only) */}
              {mode === 'public' && (
                <>
                  <label style={{ fontSize: 12, fontWeight: 700, color: LIT.muted, display: 'block', marginBottom: 6, fontFamily: LIT.headFont }}>
                    Email <span style={{ color: LIT.muted, fontWeight: 400 }}>(optional — get notified if someone responds)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    style={{ width: '100%', padding: '11px 13px', borderRadius: FIELD_RADIUS, border: `1.5px solid ${LIT.border}`, fontSize: 14, outline: 'none', fontFamily: LIT.bodyFont, boxSizing: 'border-box' as const, marginBottom: 24, color: LIT.text }}
                    onFocus={e => (e.target.style.borderColor = LIT.accent)}
                    onBlur={e => (e.target.style.borderColor = LIT.border)}
                  />
                </>
              )}

              {error && <div style={{ color: '#dc2626', fontSize: 13, marginBottom: 14, fontFamily: LIT.bodyFont }}>{error}</div>}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={handle}
                  disabled={!valid || posting}
                  style={{
                    flex: 2, padding: '14px', borderRadius: FIELD_RADIUS, border: 'none',
                    background: valid ? LIT.accent : LIT.border,
                    color: valid ? '#fff' : LIT.muted,
                    fontSize: 14, fontWeight: 700,
                    cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                  }}
                >
                  {posting ? 'Logging…' : '🎯 Log this pain point →'}
                </button>
                <button onClick={onClose} style={{
                  flex: 1, padding: '14px', borderRadius: FIELD_RADIUS,
                  border: `1.5px solid ${LIT.border}`, background: LIT.card,
                  color: LIT.secondary, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
