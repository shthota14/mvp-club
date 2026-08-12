import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '@/api/client';
import { useApp } from '@/context/AppContext';
import type { User } from '@/types';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const navigate   = useNavigate();
  const { login }  = useApp();

  const token = params.get('token') ?? '';

  const [password, setPassword]   = useState('');
  const [confirm, setConfirm]     = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [done, setDone]           = useState(false);
  const [showPass, setShowPass]   = useState(false);

  useEffect(() => {
    if (!token) setError('Invalid reset link. Please request a new one.');
  }, [token]);

  const handleReset = async () => {
    if (!password || password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setLoading(true); setError('');
    try {
      const res = await authApi.resetPassword(token, password);
      if (res.data.token) {
        login(res.data.token, res.data.user as User);
        setDone(true);
        setTimeout(() => navigate('/journey'), 2000);
      }
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Something went wrong. Please try again.');
    } finally { setLoading(false); }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '13px 16px', border: '1.5px solid #e5e7eb',
    borderRadius: 14, fontSize: 15, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit', color: '#1d1d1f',
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>

        {done ? (
          <div style={{ textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Password updated!</h2>
            <p style={{ color: 'rgba(255,255,255,.5)', fontSize: 14 }}>Signing you in…</p>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 24, padding: 32, boxShadow: '0 8px 48px rgba(0,0,0,.3)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🔑</div>
              <h2 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -.5, margin: '0 0 6px' }}>Choose a new password</h2>
              <p style={{ fontSize: 13, color: '#6e6e73', margin: 0 }}>Must be at least 6 characters.</p>
            </div>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#dc2626', marginBottom: 16 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <input
                  style={inp}
                  type={showPass ? 'text' : 'password'}
                  placeholder="New password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => setShowPass(p => !p)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#b0b0b8', fontSize: 13 }}
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                style={inp}
                type={showPass ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleReset()}
              />

              {/* Strength indicator */}
              {password.length > 0 && (
                <div style={{ display: 'flex', gap: 4 }}>
                  {[1,2,3,4].map(i => (
                    <div key={i} style={{
                      flex: 1, height: 3, borderRadius: 3,
                      background: password.length >= i * 3
                        ? (password.length < 6 ? '#f97316' : password.length < 10 ? '#eab308' : '#22c55e')
                        : '#e5e7eb',
                      transition: 'background .2s',
                    }} />
                  ))}
                </div>
              )}

              <button
                onClick={handleReset}
                disabled={loading || !token}
                style={{
                  width: '100%', padding: 15, border: 'none', borderRadius: 14,
                  background: '#1d1d1f', color: '#fff',
                  fontSize: 15, fontWeight: 800, cursor: 'pointer', marginTop: 4,
                  opacity: loading || !token ? .5 : 1,
                }}
              >
                {loading ? 'Updating…' : 'Set new password →'}
              </button>

              <button
                onClick={() => navigate('/')}
                style={{ background: 'none', border: 'none', color: '#b0b0b8', fontSize: 13, cursor: 'pointer', textAlign: 'center' }}
              >
                ← Back to sign in
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
