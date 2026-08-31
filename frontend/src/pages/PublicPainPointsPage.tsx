import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import { LIT } from '@/styles/communityTheme';
import LogPainPointModal, { PainPoint, PainPointData, decodePP, IMPACT_COLORS } from '@/components/LogPainPointModal';

// Public, no-login-required feed of logged pain points, reachable at
// /pain-points — the shareable counterpart to the "😖 Log a pain point" CTA
// on the hero nav. Anyone can browse and log a pain point here; the detailed
// investigation/discussion tools (reactions, comments, pursuing) stay a
// members-only feature inside /community, so this page's own CTA to "see
// more" is what nudges a visitor toward creating a free account.

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function PublicPainPointsPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
  const [painPoints, setPainPoints] = useState<PainPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLog, setShowLog] = useState(false);

  useEffect(() => {
    let cancelled = false;
    publicApi.listPainPoints()
      .then(res => { if (!cancelled) setPainPoints(res.data.painPoints ?? []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: LIT.pageBg, fontFamily: LIT.bodyFont }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 20px 80px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 0 8px' }}>
          <button
            onClick={() => navigate(isAuthenticated ? '/community' : '/')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 800, color: LIT.text, fontFamily: LIT.headFont, padding: 0 }}
          >
            MVP <span style={{ fontWeight: 300, letterSpacing: 1, color: LIT.muted }}>CLUB</span>
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? '/community' : '/')}
            style={{ background: 'none', border: `1.5px solid ${LIT.border}`, borderRadius: 999, padding: '7px 16px', fontSize: 13, fontWeight: 600, color: LIT.secondary, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {isAuthenticated ? 'Back to community' : 'Sign in'}
          </button>
        </div>

        {/* Intro */}
        <div style={{ padding: '20px 0 28px' }}>
          <h1 style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.6, color: LIT.text, margin: '0 0 8px', fontFamily: LIT.headFont }}>
            Pain points founders are seeing
          </h1>
          <p style={{ fontSize: 15, color: LIT.secondary, lineHeight: 1.6, margin: '0 0 20px', maxWidth: 560 }}>
            Real problems, logged by anyone — no account needed. Founders on MVP Club discover these and build solutions.
          </p>
          <button
            onClick={() => setShowLog(true)}
            style={{
              padding: '13px 22px', borderRadius: LIT.radius, border: 'none',
              background: LIT.accent, color: '#fff', fontSize: 14.5, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            🎯 Log a pain point →
          </button>
        </div>

        {/* Feed */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: LIT.muted, fontSize: 14 }}>Loading…</div>
        )}

        {!loading && painPoints.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', background: LIT.card, borderRadius: LIT.radius, border: `1px solid ${LIT.border}` }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🎯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: LIT.text, fontFamily: LIT.headFont }}>No pain points logged yet</div>
            <div style={{ fontSize: 13.5, color: LIT.secondary, marginTop: 6 }}>Be the first — it takes about 30 seconds.</div>
          </div>
        )}

        {!loading && painPoints.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {painPoints.map(pp => {
              const data: PainPointData | null = decodePP(pp.content);
              const ic = IMPACT_COLORS[data?.impact ?? 'medium'] ?? IMPACT_COLORS['medium'];
              return (
                <div key={pp.id} style={{ background: LIT.card, border: `1px solid ${LIT.border}`, borderRadius: LIT.radius, padding: '16px 18px', boxShadow: LIT.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, color: ic.color, background: ic.bg, border: `1px solid ${ic.border}`, whiteSpace: 'nowrap' as const }}>
                      {ic.label}
                    </span>
                    <span style={{ fontSize: 12, color: LIT.muted, whiteSpace: 'nowrap' as const }}>{timeAgo(pp.created_at)}</span>
                  </div>
                  <div style={{ fontSize: 15, color: LIT.text, lineHeight: 1.55, marginBottom: 10 }}>
                    {data?.description ?? pp.content}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, fontSize: 12.5, color: LIT.secondary }}>
                    {data?.audience && <span>👥 {data.audience}</span>}
                    {data?.frequency && <span>· {data.frequency}</span>}
                    {data?.domain && <span>· {data.domain}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: LIT.muted, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${LIT.border}` }}>
                    Logged by {pp.is_guest ? 'a visitor' : pp.author_name}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Soft nudge toward the full community */}
        {!loading && (
          <div style={{ textAlign: 'center', marginTop: 36, padding: '22px 20px', background: LIT.accentSoft, border: `1px solid ${LIT.accentSoftBorder}`, borderRadius: LIT.radius }}>
            <div style={{ fontSize: 14, color: LIT.text, marginBottom: 12, fontFamily: LIT.bodyFont }}>
              Want to discuss these, pursue one, or track responses to your own?
            </div>
            <button
              onClick={() => navigate('/', { state: { openRegister: true } })}
              style={{ padding: '10px 20px', borderRadius: LIT.radius, border: 'none', background: LIT.accent, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Create a free account →
            </button>
          </div>
        )}
      </div>

      {showLog && (
        <LogPainPointModal
          mode="public"
          onClose={() => setShowLog(false)}
          onLogged={pp => setPainPoints(prev => [pp, ...prev])}
        />
      )}
    </div>
  );
}
