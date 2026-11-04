import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useState, useEffect, useRef } from 'react';
import ProfilePanel from './ProfilePanel';
import Logo from './Logo';
import NotificationBell from './NotificationBell';
import OnboardingWizard from './OnboardingWizard';
import GettingStartedPanel from './GettingStartedPanel';
import FeedbackWidget from './FeedbackWidget';
import ImpersonationBanner, { IMPERSONATION_BANNER_HEIGHT } from './ImpersonationBanner';
import { messagesApi } from '@/api/client';
import { useIsMobile } from '@/hooks/useIsMobile';

function guideForPath(pathname: string): string {
  if (pathname.startsWith('/messages')) return 'messaging';
  if (pathname.startsWith('/community')) return 'community';
  if (pathname.startsWith('/progress')) return 'journey';
  return 'getting-started';
}

// Pill links inside a cream track (2026-10 redesign): the active one is an
// ink pill, the rest are plain text on the track.
const navStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: 999,
  fontSize: 14,
  fontWeight: isActive ? 600 : 500,
  border: 'none',
  background: isActive ? '#16121d' : 'transparent',
  color: isActive ? '#fff' : '#16121d',
  cursor: 'pointer',
  transition: 'all .18s',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '-0.01em',
  whiteSpace: 'nowrap',
});

// Smaller pill for the mobile-only secondary nav row below the header —
// the desktop-sized navStyle() pills read as oversized once the header
// itself got more compact.
const navStyleMobile = (isActive: boolean): React.CSSProperties => ({
  ...navStyle(isActive),
  padding: '6px 14px',
  fontSize: 13,
});

const BOTTOM_TABS = [
  { to: '/journey',    label: 'Journey',    icon: '🧭' },
  { to: '/community',  label: 'Community',  icon: '🏆' },
  { to: '/progress',   label: 'My Ideas',   icon: '💡' },
  { to: '/grafter',    label: 'Grafter',    icon: '📈' },
  { to: '/messages',   label: 'Messages',   icon: '✉️' },
];

export default function AppShell() {
  const { user, isImpersonating } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const bannerOffset = isImpersonating ? IMPERSONATION_BANNER_HEIGHT : 0;
  const [profileOpen, setProfileOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [onboardingDone, setOnboardingDone] = useState(true); // assume done until user loads
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [helpMenuOpen, setHelpMenuOpen] = useState(false);
  const helpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user && !user.is_admin) {
      const key = `mvpclub_onboarded_${user.id}`;
      setOnboardingDone(!!localStorage.getItem(key));
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await messagesApi.unreadCount();
        if (!cancelled) setUnread(r.data.unread);
      } catch {}
    };
    check();
    const id = setInterval(check, 30000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Close the "?" help/feedback menu on an outside click — same pattern as
  // NotificationBell's own dropdown.
  useEffect(() => {
    if (!helpMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (helpMenuRef.current && !helpMenuRef.current.contains(e.target as Node)) {
        setHelpMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [helpMenuOpen]);

  const iconBtn: React.CSSProperties = {
    width: 38, height: 38, borderRadius: '50%',
    background: 'transparent', border: '1px solid #d9d3c5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all .18s', flexShrink: 0,
    color: '#16121d', fontSize: 14, fontWeight: 600, fontFamily: 'inherit',
  };

  const helpMenuItemStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8, width: '100%',
    padding: '12px 16px', background: 'none', border: 'none', textAlign: 'left' as const,
    fontSize: 14, fontWeight: 600, color: '#16121d', cursor: 'pointer', fontFamily: 'inherit',
  };

  return (
    <>
      <ImpersonationBanner />
      <nav style={{
        position: 'fixed', top: bannerOffset, left: 0, right: 0, zIndex: 100,
        background: '#f3f0e8',
        borderBottom: '1px solid #e2ddd1',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 16, padding: '0 clamp(16px, 3vw, 32px)', height: 64,
        fontFamily: 'var(--font-ui)',
      }}>
        <Logo size={isMobile ? 'sm' : 'lg'} />

        {/* Desktop nav links — hidden on mobile */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 4, background: '#e8e3d7', padding: 4, borderRadius: 999 }}>
            {!user?.is_admin && (
              <NavLink to="/community" style={({ isActive }) => navStyle(isActive)}>Community</NavLink>
            )}
            {!user?.is_admin && (
              <NavLink to="/progress" style={({ isActive }) => navStyle(isActive || location.pathname.startsWith('/work') || location.pathname === '/journey')}>My Idea Vault</NavLink>
            )}
            {!user?.is_admin && (
              <NavLink to="/grafter" style={({ isActive }) => navStyle(isActive)}>Grafter</NavLink>
            )}
            {!user?.is_admin && (
              <NavLink to="/content" style={({ isActive }) => navStyle(isActive)}>Content</NavLink>
            )}
            {user?.is_admin && (
              <NavLink to="/admin" style={({ isActive }) => ({
                ...navStyle(isActive),
                background: isActive ? '#1e1b4b' : 'transparent',
                color: isActive ? '#818cf8' : '#6366f1',
              })}>🛡 Admin Panel</NavLink>
            )}
          </div>
        )}
        {/* Spacer on mobile so icons stay right-aligned */}
        {isMobile && <div />}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div ref={helpMenuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setHelpMenuOpen(v => !v)}
              title="Help & feedback"
              style={iconBtn}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8e3d7'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
            >
              ?
            </button>

            {/* "?" menu — consolidates the how-to guides link and the feedback
                panel trigger behind one icon instead of two separate header
                buttons (plus FeedbackWidget's own persistent floating tab,
                now removed), which was crowding the mobile header and
                forcing the logo's wordmark to wrap onto two lines. */}
            {helpMenuOpen && (
              <div style={{
                position: isMobile ? 'fixed' : 'absolute',
                top: isMobile ? 64 + bannerOffset : 42,
                right: 0,
                left: isMobile ? 0 : 'auto',
                width: isMobile ? '100%' : 210,
                background: '#fff',
                borderRadius: isMobile ? 0 : 16,
                boxShadow: '0 12px 40px rgba(22,18,29,0.14)',
                border: '1px solid #e2ddd1',
                overflow: 'hidden',
                zIndex: 200,
              }}>
                <button
                  onClick={() => { setHelpMenuOpen(false); navigate(`/help?guide=${guideForPath(location.pathname)}`); }}
                  style={helpMenuItemStyle}
                >
                  📖 How-to guides
                </button>
                <button
                  onClick={() => { setHelpMenuOpen(false); setProfileOpen(false); setFeedbackOpen(true); }}
                  style={{ ...helpMenuItemStyle, borderTop: '1px solid #e2ddd1' }}
                >
                  💬 Feedback
                </button>
              </div>
            )}
          </div>

          <NotificationBell />

          <button
            onClick={() => navigate('/messages')}
            title="Private messages"
            style={{ ...iconBtn, position: 'relative', fontSize: 15 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#e8e3d7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            ✉️
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 15, height: 15, borderRadius: '50%',
                background: '#7c3aed', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #f3f0e8',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <button
            onClick={() => { setFeedbackOpen(false); setProfileOpen(true); }}
            style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#7c3aed', color: '#fff',
              border: 'none', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', letterSpacing: '-0.01em', fontFamily: 'inherit',
            }}
          >
            {user?.avatar_initials ?? '?'}
          </button>
        </div>
      </nav>

      {/* Mobile secondary nav row — Community / My Idea Vault (or Admin Panel for
          admins) as text links, shown just below the icon bar. There isn't room
          for them inline with the logo + icon buttons at 64px on a narrow screen
          (desktop gets them inline in the main nav above), and admins previously
          had no way at all to reach these on mobile since this row didn't exist
          and the bottom tab bar is non-admin-only. */}
      {isMobile && (
        <div style={{
          position: 'fixed', top: 64 + bannerOffset, left: 0, right: 0, zIndex: 99,
          background: '#f3f0e8',
          borderBottom: '1px solid #e2ddd1',
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '8px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {!user?.is_admin && (
            <NavLink to="/community" style={({ isActive }) => navStyleMobile(isActive)}>Community</NavLink>
          )}
          {!user?.is_admin && (
            <NavLink to="/progress" style={({ isActive }) => navStyleMobile(isActive || location.pathname.startsWith('/work') || location.pathname === '/journey')}>My Idea Vault</NavLink>
          )}
          {!user?.is_admin && (
            <NavLink to="/grafter" style={({ isActive }) => navStyleMobile(isActive)}>Grafter</NavLink>
          )}
          {!user?.is_admin && (
            <NavLink to="/content" style={({ isActive }) => navStyleMobile(isActive)}>Content</NavLink>
          )}
          {user?.is_admin && (
            <NavLink to="/admin" style={({ isActive }) => ({
              ...navStyleMobile(isActive),
              background: isActive ? '#1e1b4b' : 'transparent',
              color: isActive ? '#818cf8' : '#6366f1',
            })}>🛡 Admin Panel</NavLink>
          )}
        </div>
      )}

      <main style={{ paddingTop: (isMobile ? 108 : 64) + bannerOffset, paddingBottom: isMobile && !user?.is_admin ? 60 : 0, minHeight: '100vh', background: '#f3f0e8' }}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && !user?.is_admin && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: '#16121d',
          display: 'flex',
          height: 60,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}>
          {BOTTOM_TABS.map(tab => {
            const isActive = location.pathname.startsWith(tab.to) ||
              (tab.to === '/progress' && location.pathname.startsWith('/work'));
            const hasUnread = tab.to === '/messages' && unread > 0;
            return (
              <button
                key={tab.to}
                onClick={() => navigate(tab.to)}
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 2,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isActive ? '#f5f2ff' : '#8a8299',
                  position: 'relative', fontFamily: 'inherit',
                }}
              >
                <span style={{ width: 22, height: 3, borderRadius: 2, background: isActive ? '#d6ff3d' : '#2a2236', marginBottom: 2 }} />
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  {tab.label}
                </span>
                {hasUnread && (
                  <span style={{
                    position: 'absolute', top: 6, right: '50%', marginRight: -18,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#7c3aed', border: '1.5px solid #16121d',
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      )}
      <ProfilePanel open={profileOpen} onClose={() => setProfileOpen(false)} />
      {user && !user.is_admin && !onboardingDone && (
        <OnboardingWizard
          onComplete={() => {
            if (user) localStorage.setItem(`mvpclub_onboarded_${user.id}`, 'true');
            setOnboardingDone(true);
          }}
        />
      )}
      <GettingStartedPanel onboardingDone={onboardingDone} />
      <FeedbackWidget open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  );
}
