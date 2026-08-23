import { useNavigate } from 'react-router-dom';

export default function DonateCancelPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      minHeight: '100vh', background: '#f9fafb',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px',
    }}>
      <div style={{
        background: '#fff', borderRadius: 24, maxWidth: 480, width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,.08)', overflow: 'hidden',
        textAlign: 'center',
      }}>
        <div style={{ height: 6, background: 'linear-gradient(90deg, #e5e5ea, #d1d5db)' }} />

        <div style={{ padding: '48px 40px 44px' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>👋</div>

          <h1 style={{
            fontSize: 26, fontWeight: 700, color: '#1d1d1f',
            fontFamily: 'var(--font-display)', letterSpacing: -0.8, marginBottom: 12,
          }}>
            No worries at all.
          </h1>

          <p style={{ fontSize: 15, color: '#6e6e73', lineHeight: 1.75, marginBottom: 32 }}>
            MVP Club is free, always. Come back whenever you feel like it — there's no pressure, ever.
          </p>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => navigate('/community')}
              style={{
                flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                background: 'linear-gradient(135deg, #7c3aed, #2563eb)',
                color: '#fff', fontSize: 14, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
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
