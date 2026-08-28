import { useState } from 'react';
import { donationsApi } from '@/api/client';
import { LIT } from '@/styles/communityTheme';

// Shared "Support MVP Club" donation modal — used from both the logged-in
// Community page and the pre-login Hero (landing) page, so every visitor
// sees exactly the same flow regardless of where they trigger it from.

// ── How Much Picker ───────────────────────────────────────────────────────────

function HowMuchPicker({ onAmountChange }: { onAmountChange?: (v: string) => void }) {
  const tiers = [
    { amount: '10',  label: 'Supporter',   desc: 'Keeps the lights on for the community' },
    { amount: '50',  label: 'Contributor', desc: 'Funds a month of platform development' },
    { amount: '200', label: 'Champion',    desc: 'Helps us reach more founders who need this' },
  ];
  const [selected, setSelected]   = useState<string | null>(null);
  const [custom,   setCustom]     = useState('');
  const isCustom = selected === 'custom';
  const finalAmount = isCustom ? custom : selected;

  return (
    <div style={{ marginBottom: 36 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 18, fontFamily: LIT.headFont }}>
        How much?
      </div>

      {/* Tier cards */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
        {tiers.map(t => {
          const on = selected === t.amount;
          return (
            <button key={t.amount} onClick={() => { const next = on ? null : t.amount; setSelected(next); setCustom(''); onAmountChange?.(next ?? ''); }}
              style={{
                flex: 1, padding: '16px 10px', borderRadius: LIT.radius, cursor: 'pointer',
                border: `2px solid ${on ? LIT.accent : LIT.border}`,
                background: on ? LIT.accentSoft : LIT.cardTint,
                textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s',
              }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: on ? LIT.accent : LIT.text, fontFamily: LIT.headFont, marginBottom: 4 }}>${t.amount}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: on ? LIT.accent : LIT.text, marginBottom: 3 }}>{t.label}</div>
              <div style={{ fontSize: 12, color: LIT.secondary, lineHeight: 1.5, fontFamily: LIT.bodyFont }}>{t.desc}</div>
            </button>
          );
        })}

        {/* Custom tile */}
        <button onClick={() => { const next = isCustom ? null : 'custom'; setSelected(next); if (!next) { setCustom(''); onAmountChange?.(''); } }}
          style={{
            flex: 1, padding: '16px 10px', borderRadius: LIT.radius, cursor: 'pointer',
            border: `2px solid ${isCustom ? LIT.accent : LIT.border}`,
            background: isCustom ? LIT.accentSoft : LIT.cardTint,
            textAlign: 'center', fontFamily: 'inherit', transition: 'all .15s',
          }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: isCustom ? LIT.accent : LIT.muted, fontFamily: LIT.headFont, marginBottom: 4 }}>✏️</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: isCustom ? LIT.accent : LIT.text, marginBottom: 3 }}>Custom</div>
          <div style={{ fontSize: 12, color: LIT.secondary, lineHeight: 1.5, fontFamily: LIT.bodyFont }}>Your own amount</div>
        </button>
      </div>

      {/* Custom amount input */}
      {isCustom && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: `2px solid ${LIT.accent}`, borderRadius: LIT.radius, overflow: 'hidden', background: LIT.card }}>
          <span style={{ padding: '12px 14px', fontSize: 16, fontWeight: 700, color: LIT.accent, background: LIT.accentSoft, borderRight: `1.5px solid ${LIT.accentSoftBorder}` }}>$</span>
          <input
            autoFocus
            type="number"
            min="1"
            value={custom}
            onChange={e => { setCustom(e.target.value); onAmountChange?.(e.target.value); }}
            placeholder="Enter amount"
            style={{
              flex: 1, padding: '12px 14px', border: 'none', outline: 'none',
              fontSize: 16, fontWeight: 700, color: LIT.text,
              fontFamily: 'inherit', background: 'transparent',
            }}
          />
          {custom && (
            <span style={{ padding: '12px 14px', fontSize: 12, color: LIT.accent, fontWeight: 700, background: LIT.accentSoft, borderLeft: `1.5px solid ${LIT.accentSoftBorder}` }}>
              USD
            </span>
          )}
        </div>
      )}

      {/* Selected summary */}
      {finalAmount && (
        <div style={{ marginTop: 10, fontSize: 13, color: LIT.secondary, textAlign: 'center', fontFamily: LIT.bodyFont }}>
          You're contributing <strong style={{ color: LIT.accent }}>${finalAmount}</strong> — thank you 💛
        </div>
      )}
    </div>
  );
}

// ── Pay It Forward Modal ──────────────────────────────────────────────────────

export default function PayItForwardModal({ onClose }: { onClose: () => void }) {
  const [donationAmount, setDonationAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [shared, setShared]   = useState(false);

  // Share a direct link to this modal (/support — see App.tsx) so it can be
  // sent to people who aren't on the site yet. Native share sheet where
  // available, falling back to a clipboard copy — same "flash a checkmark
  // for 2s" pattern used for the interview-script share button in WorkPage.
  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/support`;
    const text = 'MVP Club is free for every founder — support the platform that keeps it that way 💛';
    if (navigator.share) {
      try { await navigator.share({ title: 'Support MVP Club', text, url: shareUrl }); } catch { /* user cancelled — ignore */ }
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(`${text}\n${shareUrl}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      } catch { /* ignore */ }
    }
  };

  const handleCheckout = async () => {
    if (!donationAmount || Number(donationAmount) < 1) {
      setError('Please select or enter an amount first.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await donationsApi.createCheckout(Number(donationAmount));
      window.location.href = res.data.url;
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };
  const uses = [
    { icon: '🔓', pct: 35, color: '#7c3aed', label: 'Platform & infrastructure',  desc: 'Hosting, servers, database, and the APIs that keep MVP Club running reliably for every user.' },
    { icon: '🛠️', pct: 25, color: '#2563eb', label: 'Product development',         desc: 'Building and improving the guided journey — new stages, smarter tools, better frameworks for founders.' },
    { icon: '🤝', pct: 20, color: '#059669', label: 'Community programs',           desc: 'Mentorship connections, founder events, community moderation, and keeping the network healthy and active.' },
    { icon: '🧭', pct: 15, color: '#d97706', label: 'Educational content',          desc: 'Playbooks, validation frameworks, templates, and stage-by-stage guides that help founders move faster.' },
    { icon: '🌱', pct:  5, color: '#dc2626', label: 'Outreach',                     desc: 'Reaching first-time founders and underrepresented builders who need this most but might not find it on their own.' },
  ];

  const moments = [
    { stage: 'Idea',     color: '#7c3aed' },
    { stage: 'Hone',     color: '#2563eb' },
    { stage: 'Validate', color: '#059669' },
    { stage: 'Shape',    color: '#d97706' },
    { stage: 'Ship',     color: '#dc2626' },
  ];

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)', zIndex: 400, backdropFilter: 'blur(6px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: '94%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto',
        background: LIT.card, borderRadius: LIT.radius,
        boxShadow: '0 40px 100px rgba(0,0,0,.22)', zIndex: 401,
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}>

        {/* ── Hero ── */}
        <div style={{
          background: 'linear-gradient(135deg, #1a0533 0%, #0f1e4a 60%, #0a2a1a 100%)',
          borderRadius: '24px 24px 0 0',
          padding: '48px 44px 40px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background orbs */}
          {[
            { w: 260, h: 260, top: -80, right: -60, bg: 'rgba(124,58,237,.18)' },
            { w: 180, h: 180, top: 40,  right: 120,  bg: 'rgba(37,99,235,.12)' },
            { w: 140, h: 140, bottom: -40, left: 60,  bg: 'rgba(5,150,105,.12)' },
          ].map((o, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              width: o.w, height: o.h,
              top: o.top, right: (o as { right?: number }).right, bottom: (o as { bottom?: number }).bottom, left: (o as { left?: number }).left,
              background: o.bg, filter: 'blur(40px)', pointerEvents: 'none',
            }} />
          ))}

          {/* Share this link — top-right of the hero block, above the orbs */}
          <button
            onClick={handleShare}
            title={shared ? 'Copied!' : 'Share this link'}
            style={{
              position: 'absolute', top: 20, right: 20, zIndex: 2,
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 12px', borderRadius: 999,
              border: `1.5px solid ${shared ? '#34d399' : 'rgba(255,255,255,.22)'}`,
              background: shared ? 'rgba(52,211,153,.15)' : 'rgba(255,255,255,.08)',
              color: shared ? '#34d399' : 'rgba(255,255,255,.75)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit', transition: 'all .15s',
            }}
          >
            {shared ? (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            ) : (
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 15V4" /><path d="M8 8l4-4 4 4" /><path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
              </svg>
            )}
            {shared ? 'Copied!' : 'Share'}
          </button>

          <div style={{ position: 'relative' }}>
            <div style={{ fontSize: 44, marginBottom: 16 }}>🤝</div>
            <h2 style={{
              fontSize: 'clamp(26px,4vw,36px)', fontWeight: 700, color: '#fff',
              fontFamily: LIT.headFont, letterSpacing: -1, lineHeight: 1.15,
              margin: '0 0 14px',
            }}>
              Support MVP Club
            </h2>
            <p style={{ fontSize: 16, fontFamily: LIT.bodyFont, color: 'rgba(255,255,255,.6)', lineHeight: 1.75, maxWidth: 480, margin: 0 }}>
              MVP Club is free for every founder and community user — and we intend to keep it that way.
              No ads, no investors, no paywalls. Your donation directly funds the platform and the community around it.
            </p>
          </div>
        </div>

        <div style={{ padding: '36px 44px 44px' }}>

          {/* ── Who can contribute ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 18, fontFamily: LIT.headFont }}>
              Anyone can contribute
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 0, position: 'relative' }}>
              <div style={{
                position: 'absolute', top: 20, left: 20, right: 20, height: 2,
                background: 'linear-gradient(90deg, #7c3aed, #2563eb, #059669, #d97706, #dc2626)',
                zIndex: 0,
              }} />
              {moments.map((m, i) => (
                <div key={m.stage} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative', zIndex: 1 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: m.color,
                    border: `3px solid ${m.color}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800, color: '#fff',
                    boxShadow: `0 0 0 4px ${m.color}20`,
                  }}>
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: m.color, textAlign: 'center' }}>
                    {m.stage}
                  </div>
                </div>
              ))}
            </div>
            <div style={{
              marginTop: 20, padding: '14px 18px', borderRadius: 12,
              background: '#f0fdf4', border: '1.5px solid #86efac',
            }}>
              <div style={{ fontSize: 13, color: '#065f46', lineHeight: 1.65 }}>
                Whether you're just getting started or you've already launched — if MVP Club has been useful to you or the startup community you care about, any contribution is welcome and appreciated.
              </div>
            </div>
          </div>

          {/* ── Where it goes — Donut chart ── */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, color: LIT.muted, textTransform: 'uppercase', marginBottom: 18, fontFamily: LIT.headFont }}>
              Where it goes
            </div>

            {/* Donut + legend side by side */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 20, flexWrap: 'wrap' }}>

              {/* SVG Donut */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <svg width="180" height="180" viewBox="0 0 180 180">
                  {(() => {
                    const cx = 90, cy = 90, r = 70, strokeW = 28;
                    const circumference = 2 * Math.PI * r;
                    let offset = 0;
                    return uses.map(u => {
                      const dash = (u.pct / 100) * circumference;
                      const gap  = circumference - dash;
                      const rotation = (offset / 100) * 360 - 90;
                      offset += u.pct;
                      return (
                        <circle
                          key={u.label}
                          cx={cx} cy={cy} r={r}
                          fill="none"
                          stroke={u.color}
                          strokeWidth={strokeW}
                          strokeDasharray={`${dash} ${gap}`}
                          strokeDashoffset={0}
                          transform={`rotate(${rotation} ${cx} ${cy})`}
                          style={{ transition: 'stroke-opacity .2s' }}
                          onMouseEnter={e => (e.currentTarget.style.strokeOpacity = '0.75')}
                          onMouseLeave={e => (e.currentTarget.style.strokeOpacity = '1')}
                        >
                          <title>{u.label} — {u.pct}%</title>
                        </circle>
                      );
                    });
                  })()}
                  {/* Centre label */}
                  <text x="90" y="85" textAnchor="middle" style={{ fontSize: 22, fontWeight: 800, fill: LIT.text, fontFamily: LIT.headFont }}>100%</text>
                  <text x="90" y="103" textAnchor="middle" style={{ fontSize: 10, fill: LIT.muted, fontFamily: 'system-ui, sans-serif' }}>of donations</text>
                </svg>
              </div>

              {/* Legend */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minWidth: 180 }}>
                {uses.map(u => (
                  <div key={u.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: u.color, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: LIT.text }}>{u.icon} {u.label}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: u.color }}>{u.pct}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Category breakdown */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {uses.map(u => (
                <div key={u.label} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12,
                  padding: '12px 14px', borderRadius: LIT.radius,
                  background: `${u.color}08`, border: `1.5px solid ${u.color}20`,
                }}>
                  <div style={{ fontSize: 20, flexShrink: 0, marginTop: 1 }}>{u.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: LIT.text }}>{u.label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: u.color }}>{u.pct}%</span>
                    </div>
                    <div style={{ fontSize: 13, color: LIT.secondary, lineHeight: 1.55, fontFamily: LIT.bodyFont }}>{u.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── How much ── */}
          <HowMuchPicker onAmountChange={setDonationAmount} />

          {/* ── CTA ── */}
          {error && (
            <div style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', fontSize: 13, color: '#dc2626' }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleCheckout}
              disabled={loading}
              style={{
                flex: 2, padding: '15px', borderRadius: LIT.radius, border: 'none',
                background: loading ? LIT.border : `linear-gradient(135deg, ${LIT.accent}, #6b4520)`,
                color: loading ? LIT.muted : '#fff',
                fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', textAlign: 'center',
                boxShadow: loading ? 'none' : LIT.shadow,
                transition: 'all .15s',
              }}
            >
              {loading ? 'Redirecting to Stripe…' : '💛 Support MVP Club →'}
            </button>
            <button onClick={onClose} style={{
              flex: 1, padding: '15px', borderRadius: LIT.radius,
              border: `1.5px solid ${LIT.border}`, background: LIT.card,
              color: LIT.secondary, fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              Maybe later
            </button>
          </div>

          <p style={{ fontSize: 12, color: LIT.muted, textAlign: 'center', marginTop: 16, lineHeight: 1.6, fontFamily: LIT.bodyFont }}>
            No pressure. MVP Club is free for everyone, always. Every contribution — big or small — goes directly into keeping it that way.
          </p>
        </div>
      </div>
    </>
  );
}
