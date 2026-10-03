import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { communityApi, publicApi } from '@/api/client';

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
  // Added with the 2026-10 redesign — absent on older posts.
  category?: string;
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

export const FREQ_OPTS = ['Multiple times a day', 'Daily', 'Weekly', 'Monthly', 'Occasionally', 'Rarely'];
export const IMPACT_OPTS = [
  { v: 'high',   label: '🔥 High — blocking or costly' },
  { v: 'medium', label: '⚡ Medium — annoying but managed' },
  { v: 'low',    label: '💡 Low — nice to fix' },
] as const;

// ── Redesign (2026-10, option "01 Bento Grid") ──────────────────────────────
// Every field is its own tile in a two-column grid: a dark title tile, a
// white pain tile, yellow "who" and blue "industry" tiles, a white frequency
// tile, coral/amber/green severity tiles and a black submit tile. Earlier
// versions are kept in "Claude outputs/" (picture1 / picture2).

const B = {
  paper: '#f2f0eb',
  ink: '#1a1a1a',
  white: '#ffffff',
  field: '#f6f5f1',
  yellow: '#ffd84d',
  blue: '#c8e6ff',
  coral: '#ff6b5b',
  amber: '#ffe3b3',
  mint: '#d4f5d0',
  muted: '#6b6b66',
  line: '#dddbd3',
};
const FONT = "'Bricolage Grotesque', system-ui, sans-serif";

const INDUSTRIES = [
  'SaaS / B2B software', 'E-commerce & retail', 'Fintech', 'Healthcare', 'Education',
  'Real estate & property', 'Food & hospitality', 'Logistics & supply chain', 'Marketing & media',
  'HR & recruiting', 'Legal', 'Travel', 'Climate & energy', 'AI / developer tools',
  'Consumer & lifestyle', 'Other',
];
const FREQ_CHOICES = FREQ_OPTS.filter(f => f !== 'Rarely');
const FREQ_SHORT: Record<string, string> = { 'Multiple times a day': 'Many times a day' };
const DESC_MAX = 500;

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;800&display=swap');
.lpb-overlay{position:fixed;inset:0;background:rgba(26,26,26,.55);z-index:300;backdrop-filter:blur(4px)}
.lpb-card{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:94%;max-width:600px;max-height:94vh;overflow-y:auto;background:${B.paper};border-radius:30px;padding:14px;box-shadow:0 40px 100px rgba(0,0,0,.35);z-index:301;font-family:${FONT};color:${B.ink}}
.lpb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.lpb-tile{border-radius:22px;padding:20px;min-width:0}
.lpb-span{grid-column:span 2}
.lpb-label{display:block;font-size:13px;font-weight:800;margin-bottom:8px}
.lpb-input{display:block;width:100%;box-sizing:border-box;border:2px solid transparent;border-radius:12px;padding:12px;font:inherit;font-size:14px;color:${B.ink};outline:none;transition:border-color .12s, box-shadow .12s}
.lpb-input:focus{border-color:${B.ink}}
textarea.lpb-input{resize:none;line-height:1.55;background:${B.field}}
.lpb-on-white{background:${B.field}}
.lpb-on-color{background:rgba(255,255,255,.65)}
.lpb-chip{border:2px solid ${B.line};background:#fff;border-radius:999px;padding:9px 14px;font:inherit;font-size:13px;font-weight:600;color:${B.ink};cursor:pointer;transition:all .12s}
.lpb-chip:hover{border-color:${B.ink}}
.lpb-chip.sel{background:${B.ink};border-color:${B.ink};color:#fff}
.lpb-sev{border:none;text-align:left;font:inherit;color:${B.ink};cursor:pointer;transition:all .12s}
.lpb-sev .t{font-weight:800}
.lpb-sev .s{font-size:12px;opacity:.85;margin-top:2px}
.lpb-sev.sel{box-shadow:inset 0 0 0 3px ${B.ink}}
.lpb-sev.dim{opacity:.7}
.lpb-high{border-radius:22px;padding:22px;background:${B.coral};color:${B.ink};display:flex;flex-direction:column;justify-content:flex-end;min-height:130px}
.lpb-high .t{font-size:26px}
.lpb-stack{display:grid;grid-template-rows:repeat(2,1fr);gap:12px}
.lpb-mini{border-radius:18px;padding:14px 16px;display:flex;flex-direction:column;justify-content:center}
.lpb-mini .t{font-size:17px}
.lpb-select{appearance:none;-webkit-appearance:none;cursor:pointer;padding-right:36px;background:rgba(255,255,255,.65) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%231a1a1a' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 14px center}
.lpb-submit{display:flex;justify-content:space-between;align-items:center;gap:12px;width:100%;box-sizing:border-box;border:none;border-radius:22px;padding:20px 22px;background:${B.ink};color:#fff;font:inherit;text-align:left;cursor:pointer;transition:transform .1s, opacity .12s}
.lpb-submit:hover:not(:disabled){transform:translateY(-1px)}
.lpb-submit:disabled{opacity:.5;cursor:not-allowed}
.lpb-close{position:absolute;top:22px;right:22px;width:34px;height:34px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.14);border:none;border-radius:50%;font-size:14px;color:#fff;cursor:pointer}
@media (max-width:560px){
  .lpb-card{width:100%;max-width:none;height:100%;max-height:100vh;top:0;left:0;transform:none;border-radius:0;padding:10px}
  .lpb-tile{padding:16px;border-radius:20px}
  .lpb-high{min-height:120px}
}
`;

interface Props {
  onClose: () => void;
  onLogged: (pp: PainPoint) => void;
  // "member": posts as the logged-in user, auto-closes shortly after success.
  // "public": no account required. Adds an optional email field, submits to
  //   the unauthenticated endpoint, and stays open after success with an
  //   optional "create a free account" CTA the visitor can ignore.
  mode?: 'member' | 'public';
}

export default function LogPainPointModal({ onClose, onLogged, mode = 'member' }: Props) {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [audience,    setAudience]    = useState('');
  const [frequency,   setFrequency]   = useState('');
  const [impact,      setImpact]      = useState<'low' | 'medium' | 'high' | ''>('');
  const [domain,      setDomain]      = useState('');
  const [email,       setEmail]       = useState('');
  const [posting,     setPosting]     = useState(false);
  const [posted,      setPosted]      = useState(false);
  const [held,        setHeld]        = useState(false);
  const [error,       setError]       = useState('');

  const valid = description.trim().length >= 10 && audience.trim().length >= 3 && !!frequency && !!impact;

  const missing = [
    description.trim().length < 10 && 'the pain (10+ characters)',
    audience.trim().length < 3 && 'who has it',
    !frequency && 'how often',
    !impact && 'how painful',
  ].filter(Boolean) as string[];

  const handle = async () => {
    if (!valid || !impact) return;
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

  const sevClass = (v: string) => `lpb-sev${impact === v ? ' sel' : impact ? ' dim' : ''}`;

  return (
    <>
      <style>{CSS}</style>
      <div className="lpb-overlay" onClick={onClose} />
      <div className="lpb-card" role="dialog" aria-modal="true" aria-label="Log a pain point">
        {posted ? (
          <div className="lpb-grid">
            <div className="lpb-tile lpb-span" style={{ background: B.ink, color: '#fff', position: 'relative' }}>
              <button className="lpb-close" onClick={onClose} aria-label="Close">✕</button>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: .6 }}>MVP Club · Pain points</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: -1, margin: '8px 0 6px' }}>
                {held ? 'Pain point received' : 'Pain point logged!'}
              </div>
              <div style={{ fontSize: 14, opacity: .8, lineHeight: 1.5 }}>
                {held
                  ? "It's in review before it goes public — thanks for your patience."
                  : 'Founders can now discover it — and maybe build the fix.'}
              </div>
            </div>
            <div className="lpb-tile" style={{ background: B.yellow }}>
              <div style={{ fontSize: 40 }}>🚀</div>
              <div style={{ fontWeight: 800, marginTop: 6 }}>Thanks for contributing</div>
            </div>
            <div className="lpb-tile" style={{ background: B.blue }}>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>Your pain point could be someone else's next big idea.</div>
            </div>
            {mode === 'public' && (
              <div className="lpb-tile lpb-span" style={{ background: B.white }}>
                <div style={{ fontSize: 14, color: B.muted, marginBottom: 14, lineHeight: 1.5 }}>
                  Want to see what founders are building on pain points like this — or come back and build on your own?
                </div>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button className="lpb-chip sel" style={{ padding: '12px 20px' }}
                    onClick={() => navigate('/', { state: { openRegister: true } })}>
                    Create a free account →
                  </button>
                  <button className="lpb-chip" style={{ padding: '12px 20px' }} onClick={onClose}>No thanks, I'm done</button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="lpb-grid">
            {/* Title tile */}
            <div className="lpb-tile lpb-span" style={{ background: B.ink, color: '#fff', padding: 26, position: 'relative' }}>
              <button className="lpb-close" onClick={onClose} aria-label="Close">✕</button>
              <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', opacity: .6 }}>MVP Club · Pain points</div>
              <h2 style={{ margin: '8px 0 6px', fontSize: 38, fontWeight: 800, letterSpacing: -1, lineHeight: 1.05 }}>Log a pain point</h2>
              <p style={{ margin: 0, fontSize: 14, opacity: .75, lineHeight: 1.5, maxWidth: 440 }}>
                Describe a real problem you've seen.{mode === 'public' && ' No account needed.'} Other founders can pick it up and build a solution.
              </p>
            </div>

            {/* Pain */}
            <div className="lpb-tile lpb-span" style={{ background: B.white }}>
              <label className="lpb-label" htmlFor="lpb-pain">What's the pain? <span style={{ color: '#e03131' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <textarea
                  id="lpb-pain"
                  className="lpb-input lpb-on-white"
                  rows={3}
                  maxLength={DESC_MAX}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g. As a Shopify store owner, I struggle to sync inventory across sales channels. It leads to overselling and unhappy customers."
                />
                <span style={{ position: 'absolute', right: 12, bottom: 8, fontSize: 12, color: B.muted }}>{description.length}/{DESC_MAX}</span>
              </div>
            </div>

            {/* Who */}
            <div className="lpb-tile" style={{ background: B.yellow }}>
              <label className="lpb-label" htmlFor="lpb-who">Who has it? <span style={{ color: '#c92a2a' }}>*</span></label>
              <input
                id="lpb-who"
                className="lpb-input lpb-on-color"
                maxLength={200}
                value={audience}
                onChange={e => setAudience(e.target.value)}
                placeholder="e.g. Small online retailers"
              />
            </div>

            {/* Industry */}
            <div className="lpb-tile" style={{ background: B.blue }}>
              <label className="lpb-label" htmlFor="lpb-ind">Industry <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <select
                id="lpb-ind"
                className="lpb-input lpb-select"
                value={domain}
                onChange={e => setDomain(e.target.value)}
                style={{ color: domain ? B.ink : B.muted }}
              >
                <option value="">Choose one</option>
                {INDUSTRIES.map(i => <option key={i} value={i} style={{ color: B.ink }}>{i}</option>)}
              </select>
            </div>

            {/* Frequency */}
            <div className="lpb-tile lpb-span" style={{ background: B.white }}>
              <div className="lpb-label" style={{ marginBottom: 10 }}>How often does it happen? <span style={{ color: '#e03131' }}>*</span></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {FREQ_CHOICES.map(f => (
                  <button key={f} type="button" aria-pressed={frequency === f}
                    className={`lpb-chip${frequency === f ? ' sel' : ''}`} onClick={() => setFrequency(f)}>
                    {FREQ_SHORT[f] ?? f}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <button type="button" aria-pressed={impact === 'high'} className={`${sevClass('high')} lpb-high`} onClick={() => setImpact('high')}>
              <div className="t">High</div>
              <div className="s">Blocking or costly</div>
            </button>
            <div className="lpb-stack">
              <button type="button" aria-pressed={impact === 'medium'} className={`${sevClass('medium')} lpb-mini`} style={{ background: B.amber }} onClick={() => setImpact('medium')}>
                <div className="t">Medium</div>
                <div className="s">Annoying but managed</div>
              </button>
              <button type="button" aria-pressed={impact === 'low'} className={`${sevClass('low')} lpb-mini`} style={{ background: B.mint }} onClick={() => setImpact('low')}>
                <div className="t">Low</div>
                <div className="s">Nice to fix</div>
              </button>
            </div>

            {/* Email (public only) */}
            {mode === 'public' && (
              <div className="lpb-tile lpb-span" style={{ background: B.white }}>
                <label className="lpb-label" htmlFor="lpb-email">
                  Email <span style={{ fontWeight: 400, color: B.muted }}>(optional — get notified if someone responds)</span>
                </label>
                <input id="lpb-email" className="lpb-input lpb-on-white" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
            )}

            {/* Submit */}
            <button type="button" className="lpb-submit lpb-span" onClick={handle} disabled={!valid || posting}>
              <span>
                <span style={{ display: 'block', fontSize: 18, fontWeight: 800 }}>{posting ? 'Submitting…' : 'Submit pain point'}</span>
                <span style={{ display: 'block', fontSize: 12.5, marginTop: 3, opacity: .7, color: error ? '#ffb4b4' : undefined }}>
                  {error ? error : missing.length ? `Still needed: ${missing.join(', ')}.` : 'Public and visible to founders'}
                </span>
              </span>
              <span style={{ width: 40, height: 40, flex: '0 0 auto', borderRadius: '50%', background: B.yellow, color: B.ink, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              </span>
            </button>
          </div>
        )}
      </div>
    </>
  );
}
