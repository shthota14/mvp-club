import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

export const IMPERSONATION_BANNER_HEIGHT = 40;

// Persistent strip shown across the whole app while an admin is "viewing as"
// a member — impossible to miss, and the only way out is the explicit
// "Return to admin" button (never a background/auto timeout the admin could
// lose track of).
export default function ImpersonationBanner() {
  const { user, isImpersonating, stopImpersonating } = useApp();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 10000,
      height: IMPERSONATION_BANNER_HEIGHT,
      background: '#7c2d12',
      color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      fontSize: 12.5, fontWeight: 700,
      padding: '0 16px',
      boxShadow: '0 2px 8px rgba(0,0,0,.15)',
    }}>
      <span style={{ fontSize: 14 }}>👁</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        Viewing as <strong>{user?.name ?? 'member'}</strong> — actions here affect their account
      </span>
      <button
        onClick={async () => { await stopImpersonating(); navigate('/admin'); }}
        style={{
          background: '#fff', color: '#7c2d12', border: 'none', borderRadius: 20,
          padding: '5px 14px', fontSize: 11.5, fontWeight: 800, cursor: 'pointer',
          flexShrink: 0, whiteSpace: 'nowrap',
        }}
      >
        ← Return to admin
      </button>
    </div>
  );
}
