import { useNavigate, useSearchParams } from 'react-router-dom';

export default function DonateSuccessPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const amount = params.get('amount');

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, maxWidth: 520, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,.08)', overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Top bar */}
        <div style={{ height: 6, background: 'linear-gradient(90deg, #7c3aed, #2563eb, #059669)' }} />

        <div style={{ padding: '48px 40px 44px' }}>
          {/* Animated heart */}
          <div style={{ fontSize: 64, marginBottom: 20 }}>💛</div>

          <h1 style={{
            fontSize: 28, fontWeight: 700, color: '#1d1d1f',
            fontFamily: 'var(--font-display)', letterSpacing: -0.8,
            marginBottom: 12,
          }}>
            Thank you{amount ? ` for your $${amount}` : ''}!
          </h1>

          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.75, marginBottom: 8 }}>
            Your contribution goes directly into keeping MVP Club free for every founder and the startup community.
          </p>
          <p style={{ fontSize: 14, color: '#9ca3af', lineHeight: 1.7, marginBottom: 36 }}>
            You're helping someone build something real. That matters.
          </p>

          {/* What happens next */}
          <div style={{
            background: '#f5f3ff', border: '1.5px solid #ddd6fe',
            borderRadius: 14, padding: '18px 20px', marginBottom: 32, textAlign: 'left',
          }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 12 }}>
              What happens next
            </div>
            {[
              'A receipt has been sent to your email by Stripe.',
              'Your donation is processed securely — no card details stored here.',
              'Funds go directly toward platform costs and community programs.',
            ].map((t, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: i < 2 ? 10 : 0 }}>
                <span style={{ color: '#7c3aed', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span style={{ fontSize: 13, color: '#3a3a3c', lineHeight: 1.55 }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/community')}
              style={{
                flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 4px 16px rgba(124,58,237,.25)',
              }}
            >
              Back to community →
            </button>
            <button
              onClick={() => navigate('/progress')}
              style={{
                flex: 1, padding: '13px', borderRadius: 12,
                border: '1.5px solid #e5e5ea', background: '#fff',
                color: '#6e6e73', fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              My journey
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
