import { useApp } from '@/context/AppContext';
import { authApi, linkedinApi } from '@/api/client';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Props { open: boolean; onClose: () => void; }

export default function ProfilePanel({ open, onClose }: Props) {
  const { user, logout, refreshUser } = useApp();
  const [name, setName]                       = useState(user?.name ?? '');
  const [emailNotif, setEmailNotif]           = useState(user?.email_notifications ?? true);
  const [saving, setSaving]                   = useState(false);
  const [liStatus, setLiStatus]           = useState<{ connected: boolean; linkedin_url: string | null; linkedin_name: string | null } | null>(null);
  const [liLoading, setLiLoading]         = useState(false);
  const [liDisconnecting, setLiDisconnecting] = useState(false);
  const navigate = useNavigate();

  // Load LinkedIn status whenever panel opens
  useEffect(() => {
    if (!open) return;
    linkedinApi.status()
      .then(r => setLiStatus(r.data))
      .catch(() => {});
  }, [open]);

  const save = async () => {
    setSaving(true);
    await authApi.updateMe({ name, email_notifications: emailNotif });
    await refreshUser();
    setSaving(false);
    onClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const connectLinkedIn = async () => {
    setLiLoading(true);
    try {
      const res = await linkedinApi.init();
      window.location.href = res.data.url;
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
      alert(msg ?? 'Could not start LinkedIn login. Check that LINKEDIN_CLIENT_ID is set in .env.');
      setLiLoading(false);
    }
  };

  const disconnectLinkedIn = async () => {
    setLiDisconnecting(true);
    try {
      await linkedinApi.disconnect();
      setLiStatus({ connected: false, linkedin_url: null, linkedin_name: null });
      await refreshUser();
    } catch { /* ignore */ } finally {
      setLiDisconnecting(false);
    }
  };

  const backdrop: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 300,
    background: 'rgba(0,0,0,0.3)', display: open ? 'block' : 'none',
  };

  const panel: React.CSSProperties = {
    position: 'fixed', top: 0, right: open ? 0 : '-320px', bottom: 0,
    width: 300, background: '#fff', zIndex: 301,
    boxShadow: '-4px 0 24px rgba(0,0,0,0.1)',
    transition: 'right .3s ease',
    padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
    overflowY: 'auto',
  };

  return (
    <>
      <div style={backdrop} onClick={onClose} />
      <aside style={panel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Profile</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#6e6e73', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#6366f1', color: '#fff', fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            {user?.avatar_initials}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</div>
          <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2 }}>{user?.email}</div>
          {user?.name && (
            <button
              onClick={() => { onClose(); navigate(`/community/member/${encodeURIComponent(user.name)}`); }}
              style={{
                marginTop: 10, padding: '6px 16px', borderRadius: 20,
                border: '1.5px solid #e5e5ea', background: '#f9f9fb',
                fontSize: 12, fontWeight: 700, color: '#6e6e73',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              View my profile →
            </button>
          )}
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#6e6e73', display: 'block', marginBottom: 6 }}>Name</label>
          <input value={name} onChange={e => setName(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #d2d2d7', borderRadius: 10, fontSize: 14, outline: 'none' }} />
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#6e6e73', display: 'block', marginBottom: 6 }}>Current stage</label>
          <div style={{ padding: '10px 12px', border: '1.5px solid #d2d2d7', borderRadius: 10, fontSize: 14, color: '#6e6e73' }}>{user?.current_stage}</div>
        </div>
        {/* Email notifications toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: '#f5f5f7', borderRadius: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#1d1d1f' }}>Email notifications</div>
            <div style={{ fontSize: 11, color: '#6e6e73', marginTop: 2 }}>
              Get emailed when someone posts, comments, or offers to help
            </div>
          </div>
          <button
            onClick={() => setEmailNotif(v => !v)}
            style={{
              width: 44, height: 26, borderRadius: 13, border: 'none',
              background: emailNotif ? '#34c759' : '#d2d2d7',
              cursor: 'pointer', position: 'relative', flexShrink: 0,
              transition: 'background .2s', marginLeft: 12,
            }}
          >
            <span style={{
              position: 'absolute', top: 3,
              left: emailNotif ? 21 : 3,
              width: 20, height: 20, borderRadius: '50%',
              background: '#fff', transition: 'left .2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            }} />
          </button>
        </div>

        <button onClick={save} disabled={saving} style={{ padding: '12px', borderRadius: 12, border: 'none', background: '#000', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          {saving ? 'Saving…' : 'Save changes'}
        </button>

        {/* ── LinkedIn section ── */}
        <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.4px', color: '#6e6e73', marginBottom: 10 }}>
            LinkedIn
          </div>
          {liStatus?.connected ? (
            <div style={{ background: '#f0f9ff', border: '1.5px solid #bae6fd', borderRadius: 12, padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 16 }}>🔗</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#0369a1' }}>Connected</span>
              </div>
              {liStatus.linkedin_name && (
                <div style={{ fontSize: 13, color: '#0c4a6e', marginBottom: 4 }}>
                  as <strong>{liStatus.linkedin_name}</strong>
                </div>
              )}
              {liStatus.linkedin_url && (
                <a
                  href={liStatus.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12, color: '#0369a1', display: 'block', marginBottom: 10, wordBreak: 'break-all' }}
                >
                  {liStatus.linkedin_url}
                </a>
              )}
              <button
                onClick={disconnectLinkedIn}
                disabled={liDisconnecting}
                style={{ fontSize: 12, fontWeight: 700, color: '#6e6e73', background: 'none', border: '1px solid #d2d2d7', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', opacity: liDisconnecting ? 0.6 : 1 }}
              >
                {liDisconnecting ? 'Disconnecting…' : 'Disconnect'}
              </button>
            </div>
          ) : (
            <button
              onClick={connectLinkedIn}
              disabled={liLoading}
              style={{
                width: '100%', padding: '11px 0', borderRadius: 12,
                background: liLoading ? '#e5e7eb' : '#0a66c2',
                color: '#fff', border: 'none',
                fontSize: 14, fontWeight: 700, cursor: liLoading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <span style={{ fontSize: 16, fontWeight: 900 }}>in</span>
              {liLoading ? 'Redirecting…' : 'Connect LinkedIn'}
            </button>
          )}
        </div>

        <button onClick={handleLogout} style={{ padding: '12px', borderRadius: 12, border: '1.5px solid #d2d2d7', background: 'transparent', color: '#6e6e73', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          Sign out
        </button>
      </aside>
    </>
  );
}
