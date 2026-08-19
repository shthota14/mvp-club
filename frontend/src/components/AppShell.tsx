import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useState, useEffect } from 'react';
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

const navStyle = (isActive: boolean): React.CSSProperties => ({
  padding: '7px 16px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 500,
  border: 'none',
  background: isActive ? '#1d1d1f' : 'transparent',
  color: isActive ? '#fff' : '#6e6e73',
  cursor: 'pointer',
  transition: 'all .18s',
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '-0.01em',
});

const BOTTOM_TABS = [
  { to: '/journey',    label: 'Journey',    icon: '🧭' },
  { to: '/community',  label: 'Community',  icon: '🏆' },
  { to: '/progress',   label: 'My Ideas',   icon: '💡' },
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

  const iconBtn: React.CSSProperties = {
    width: 34, height: 34, borderRadius: '50%',
    background: 'transparent', border: '1px solid #d2d2d7',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', transition: 'all .18s', flexShrink: 0,
    color: '#6e6e73', fontSize: 13, fontWeight: 700,
  };

  return (
    <>
      <ImpersonationBanner />
      <nav style={{
        position: 'fixed', top: bannerOffset, left: 0, right: 0, zIndex: 100,
        background: 'rgba(255,255,255,.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e5e5ea',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: 64,
      }}>
        <Logo size="lg" />

        {/* Desktop nav links — hidden on mobile */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: 2 }}>
            {!user?.is_admin && (
              <NavLink to="/community" style={({ isActive }) => navStyle(isActive)}>Community</NavLink>
            )}
            {!user?.is_admin && (
              <NavLink to="/progress" style={({ isActive }) => navStyle(isActive || location.pathname.startsWith('/work') || location.pathname === '/journey')}>My Idea Vault</NavLink>
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
          <button
            onClick={() => navigate(`/help?guide=${guideForPath(location.pathname)}`)}
            title="How-to guides"
            style={iconBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7'; (e.currentTarget as HTMLButtonElement).style.color = '#1d1d1f'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6e6e73'; }}
          >
            ?
          </button>

          <button
            onClick={() => setFeedbackOpen(true)}
            title="Feature request, bug report, or feedback"
            style={{ ...iconBtn, fontSize: 15 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7'; (e.currentTarget as HTMLButtonElement).style.color = '#1d1d1f'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = '#6e6e73'; }}
          >
            💬
          </button>

          <NotificationBell />

          <button
            onClick={() => navigate('/messages')}
            title="Private messages"
            style={{ ...iconBtn, position: 'relative', fontSize: 15 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
          >
            ✉️
            {unread > 0 && (
              <span style={{
                position: 'absolute', top: -2, right: -2,
                width: 15, height: 15, borderRadius: '50%',
                background: '#ff3b30', color: '#fff',
                fontSize: 9, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1.5px solid #fff',
              }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>

          <button
            onClick={() => setProfileOpen(true)}
            style={{
              width: 32, height: 32, borderRadius: '50%',
              background: '#1d1d1f', color: '#fff',
              border: 'none', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', letterSpacing: '-0.01em',
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
          background: 'rgba(255,255,255,.98)',
          borderBottom: '1px solid #e5e5ea',
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '8px 16px', overflowX: 'auto', WebkitOverflowScrolling: 'touch',
        }}>
          {!user?.is_admin && (
            <NavLink to="/community" style={({ isActive }) => navStyle(isActive)}>Community</NavLink>
          )}
          {!user?.is_admin && (
            <NavLink to="/progress" style={({ isActive }) => navStyle(isActive || location.pathname.startsWith('/work') || location.pathname === '/journey')}>My Idea Vault</NavLink>
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

      <main style={{ paddingTop: (isMobile ? 108 : 64) + bannerOffset, paddingBottom: isMobile && !user?.is_admin ? 60 : 0, minHeight: '100vh', background: '#f5f5f7' }}>
        <Outlet />
      </main>

      {/* Mobile bottom tab bar */}
      {isMobile && !user?.is_admin && (
        <nav style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid #e5e5ea',
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
                  color: isActive ? '#1d1d1f' : '#aeaeb2',
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 20, lineHeight: 1 }}>{tab.icon}</span>
                <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400, letterSpacing: '-0.01em' }}>
                  {tab.label}
                </span>
                {hasUnread && (
                  <span style={{
                    position: 'absolute', top: 6, right: '50%', marginRight: -18,
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#ff3b30', border: '1.5px solid #fff',
                  }} />
                )}
                {isActive && (
                  <span style={{
                    position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                    width: 20, height: 3, borderRadius: 2, background: '#1d1d1f',
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
