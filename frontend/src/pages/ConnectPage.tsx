import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

// ── Design tokens (mirrors BookingPage.tsx / SurveyPage.tsx, the other public/no-auth pages) ──
const FF  = '-apple-system,BlinkMacSystemFont,"SF Pro Display","Helvetica Neue",sans-serif';
const T1  = '#0f0f13';
const T2  = '#6e6e73';
const AC  = '#059669';   // matches STAGE_COLORS.validate — this link is shared from the Validate stage
const ACM = '#34d399';
const BG  = '#f7f7f9';

export default function ConnectPage() {
  const { ideaId } = useParams<{ ideaId: string }>();

  const [ideaName, setIdeaName] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [name,  setName]  = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone]   = useState(false);

  useEffect(() => {
    if (!ideaId) return;
    fetch(`/api/validation/public/${ideaId}`)
      .then(async r => {
        if (r.status === 404) { setNotFound(true); return null; }
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => { if (d) setIdeaName(d.ideaName || ''); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [ideaId]);

  const emailOk = email.trim().includes('@');
  const phoneOk = phone.trim().length >= 6;

  const submit = async () => {
    if (!ideaId || !emailOk || !phoneOk) {
      setError('A valid email and a mobile/WhatsApp number are both required.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await fetch(`/api/validation/public/${ideaId}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), phone: phone.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || 'Something went wrong — please try again.'); return; }
      setDone(true);
    } catch {
      setError('Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, margin: '0 auto 16px', boxShadow: `0 8px 24px ${AC}40` }}>🤝</div>
        <div style={{ fontSize: 14, color: T2, fontWeight: 500 }}>Loading…</div>
      </div>
    </div>
  );

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG, fontFamily: FF, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 360 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T1, marginBottom: 10 }}>This link isn't valid</div>
        <div style={{ fontSize: 14, color: T2, lineHeight: 1.7 }}>It may have been mistyped or the founder's idea was removed.</div>
      </div>
    </div>
  );

  // ── Success ──────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight: '100dvh', background: `linear-gradient(160deg,${AC}18 0%,${BG} 50%)`, fontFamily: FF, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 420, textAlign: 'center' }}>
        <div style={{ width: 88, height: 88, borderRadius: '50%', background: `linear-gradient(135deg,${AC},${ACM})`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 28px', boxShadow: `0 16px 48px ${AC}50`, fontSize: 40 }}>✓</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: T1, marginBottom: 10 }}>Thanks — you're all set</div>
        <div style={{ fontSize: 15, color: T2, lineHeight: 1.7 }}>They've got your details and will reach out to you directly soon.</div>
      </div>
    </div>
  );

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100dvh', background: BG, fontFamily: FF, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 440, background: '#fff', borderRadius: 20, boxShadow: '0 12px 40px rgba(0,0,0,0.08)', padding: '36px 32px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: AC, letterSpacing: 1.4, textTransform: 'uppercase' as const, marginBottom: 8 }}>Let's connect</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T1, lineHeight: 1.3, marginBottom: 8 }}>
          {ideaName ? `The founder behind ${ideaName} would love to chat` : "A founder would love to chat"}
        </div>
        <div style={{ fontSize: 14, color: T2, lineHeight: 1.65, marginBottom: 26 }}>
          Leave your email and a mobile/WhatsApp number below and they'll reach out directly to set up a quick conversation. No spam, no pitch — just a few honest questions.
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Your name (optional)</label>
        <input
          type="text" value={name} onChange={e => setName(e.target.value)}
          placeholder="e.g. Alex"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1.5px solid #d2d2d7', borderRadius: 10, fontSize: 15, fontFamily: FF, outline: 'none', color: T1, marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Email address</label>
        <input
          type="email" value={email} onChange={e => setEmail(e.target.value)}
          placeholder="you@example.com"
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1.5px solid #d2d2d7', borderRadius: 10, fontSize: 15, fontFamily: FF, outline: 'none', color: T1, marginBottom: 16 }}
        />

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#999', letterSpacing: 1.2, textTransform: 'uppercase' as const, marginBottom: 6 }}>Mobile or WhatsApp number</label>
        <input
          type="tel" value={phone} onChange={e => setPhone(e.target.value)}
          placeholder="+1 555 123 4567"
          onKeyDown={e => e.key === 'Enter' && submit()}
          style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', border: '1.5px solid #d2d2d7', borderRadius: 10, fontSize: 15, fontFamily: FF, outline: 'none', color: T1, marginBottom: error ? 10 : 22 }}
        />

        {error && <div style={{ fontSize: 12.5, color: '#dc2626', fontWeight: 600, marginBottom: 14 }}>{error}</div>}

        <button
          onClick={submit}
          disabled={submitting}
          style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: `linear-gradient(135deg,${AC},${ACM})`, color: '#fff', fontSize: 15, fontWeight: 800, cursor: submitting ? 'default' : 'pointer', fontFamily: FF, boxShadow: `0 6px 20px ${AC}40`, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Sending…' : 'Send my details'}
        </button>
      </div>
    </div>
  );
}
