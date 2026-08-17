import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useIsMobile } from '@/hooks/useIsMobile';
import { useApp } from '@/context/AppContext';

// Cookie consent banner + preferences modal, shown site-wide until the
// visitor makes a choice. Nothing in this app sets analytics cookies today
// (see /cookies for the current, honest list) — this captures consent now
// so that if/when we do add usage measurement, it's already gated on it.

const CONSENT_KEY = 'mvpclub_cookie_consent';
const CONSENT_VERSION = 1;
const OPEN_PREFERENCES_EVENT = 'mvpclub:open-cookie-preferences';

type CookieConsentValue = {
  version: number;
  necessary: true;
  analytics: boolean;
  decidedAt: string;
};

function readConsent(): CookieConsentValue | null {
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeConsent(analytics: boolean): CookieConsentValue {
  const value: CookieConsentValue = {
    version: CONSENT_VERSION,
    necessary: true,
    analytics,
    decidedAt: new Date().toISOString(),
  };
  localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  window.dispatchEvent(new CustomEvent('mvpclub:cookie-consent-changed', { detail: value }));
  return value;
}

// Exported so any future analytics init can check consent before loading
// anything non-essential — e.g. `if (hasAnalyticsConsent()) initAnalytics();`
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true;
}

// Exported so any link/button elsewhere in the app (e.g. a settings page)
// can reopen this banner's preferences view without prop-drilling.
export function openCookiePreferences() {
  window.dispatchEvent(new Event(OPEN_PREFERENCES_EVENT));
}

const card: React.CSSProperties = {
  background: '#fff',
  border: '1.5px solid #e5e5ea',
  borderRadius: 16,
  boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
  fontFamily: "'Inter', system-ui, sans-serif",
  color: '#1d1d1f',
};

const btnPrimary: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 20,
  fontSize: 13,
  fontWeight: 600,
  border: 'none',
  background: '#1d1d1f',
  color: '#fff',
  cursor: 'pointer',
  letterSpacing: '-0.01em',
  whiteSpace: 'nowrap',
};

const btnSecondary: React.CSSProperties = {
  ...btnPrimary,
  background: '#fff',
  color: '#1d1d1f',
  border: '1.5px solid #d2d2d7',
};

const btnGhost: React.CSSProperties = {
  ...btnPrimary,
  background: 'transparent',
  color: '#6e6e73',
  border: 'none',
  fontWeight: 500,
  textDecoration: 'underline',
  padding: '9px 4px',
};

function Toggle({ checked, disabled, onChange, label }: { checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => !disabled && onChange && onChange(!checked)}
      style={{
        width: 40,
        height: 24,
        borderRadius: 20,
        border: 'none',
        background: checked ? '#059669' : '#d2d2d7',
        position: 'relative',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        flexShrink: 0,
        padding: 0,
        transition: 'background .15s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: checked ? 19 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#fff',
          transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  );
}

export default function CookieConsent() {
  const [consent, setConsent] = useState<CookieConsentValue | null>(() => readConsent());
  const [mode, setMode] = useState<'hidden' | 'banner' | 'preferences'>(() => (readConsent() ? 'hidden' : 'banner'));
  const [draftAnalytics, setDraftAnalytics] = useState<boolean>(() => readConsent()?.analytics ?? false);
  const isMobile = useIsMobile();
  const { isAuthenticated, user } = useApp();
  // Mirrors AppShell's own condition for showing its fixed bottom tab bar —
  // when that bar is on screen, this component must clear it instead of
  // overlapping it.
  const clearsBottomNav = isMobile && isAuthenticated && !user?.is_admin;
  const bottomNavOffset = 'calc(60px + env(safe-area-inset-bottom) + 10px)';

  useEffect(() => {
    const openPrefs = () => {
      setDraftAnalytics(readConsent()?.analytics ?? false);
      setMode('preferences');
    };
    window.addEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, openPrefs);
  }, []);

  const decide = useCallback((analytics: boolean) => {
    setConsent(writeConsent(analytics));
    setMode('hidden');
  }, []);

  const openPreferences = useCallback(() => {
    setDraftAnalytics(consent?.analytics ?? false);
    setMode('preferences');
  }, [consent]);

  const savePreferences = useCallback(() => {
    setConsent(writeConsent(draftAnalytics));
    setMode('hidden');
  }, [draftAnalytics]);

  return (
    <>
      {/* Small persistent link so a visitor who already decided can change their mind later. */}
      {mode === 'hidden' && (
        <button
          type="button"
          onClick={openPreferences}
          style={{
            position: 'fixed',
            left: 14,
            bottom: clearsBottomNav ? bottomNavOffset : 12,
            zIndex: 900,
            background: 'transparent',
            border: 'none',
            color: '#b0b0b8',
            fontSize: 11,
            fontFamily: "'Inter', system-ui, sans-serif",
            cursor: 'pointer',
            padding: '4px 6px',
          }}
        >
          🍪 Cookie preferences
        </button>
      )}

      {mode === 'banner' && (
        <div
          role="dialog"
          aria-label="Cookie consent"
          style={{
            position: 'fixed',
            left: 16,
            right: 16,
            bottom: clearsBottomNav ? bottomNavOffset : 16,
            zIndex: 1000,
            maxWidth: 640,
            margin: '0 auto',
            padding: '18px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            ...card,
          }}
        >
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🍪 We use cookies</div>
            <div style={{ fontSize: 12.5, color: '#6e6e73', lineHeight: 1.5 }}>
              mvpclub.io uses cookies to keep you signed in and, with your consent, to measure usage and improve the
              product. See our{' '}
              <Link to="/cookies" style={{ color: '#1d1d1f', fontWeight: 600 }}>
                Cookie Policy
              </Link>
              .
            </div>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" style={btnGhost} onClick={openPreferences}>Preferences</button>
            <button type="button" style={btnSecondary} onClick={() => decide(false)}>Reject non-essential</button>
            <button type="button" style={btnPrimary} onClick={() => decide(true)}>Accept all</button>
          </div>
        </div>
      )}

      {mode === 'preferences' && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div style={{ width: '100%', maxWidth: 460, padding: '22px 24px', ...card }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>🍪 Cookie preferences</div>
            <div style={{ fontSize: 12.5, color: '#6e6e73', lineHeight: 1.5, marginBottom: 16 }}>
              Choose what mvpclub.io can use beyond what's required to run the product. See the full{' '}
              <Link to="/cookies" style={{ color: '#1d1d1f', fontWeight: 600 }}>Cookie Policy</Link> for details.
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid #f0f0f0' }}>
              <Toggle checked={true} disabled label="Necessary cookies (always on)" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Necessary</div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2, lineHeight: 1.4 }}>
                  Keeps you signed in and remembers basic settings. Required for the product to work — can't be turned off.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 0', borderTop: '1px solid #f0f0f0' }}>
              <Toggle checked={draftAnalytics} onChange={setDraftAnalytics} label="Analytics cookies" />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Analytics</div>
                <div style={{ fontSize: 12, color: '#6e6e73', marginTop: 2, lineHeight: 1.4 }}>
                  Helps us see which features are used and where people get stuck, so we can improve the product. Off by default.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button type="button" style={btnSecondary} onClick={() => decide(false)}>Reject non-essential</button>
              <button type="button" style={btnPrimary} onClick={savePreferences}>Save preferences</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
