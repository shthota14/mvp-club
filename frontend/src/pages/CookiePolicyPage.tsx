import { Link } from 'react-router-dom';
import { openCookiePreferences } from '@/components/CookieConsent';

// Plain-language cookie policy. Kept intentionally short and honest about
// what mvpclub.io actually stores today (see the table below) rather than
// a generic boilerplate list of things the app doesn't do.

const rowStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '160px 110px 1fr',
  gap: 16,
  padding: '12px 0',
  borderTop: '1px solid #eee',
  fontSize: 13,
  lineHeight: 1.5,
};

export default function CookiePolicyPage() {
  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 20px 80px', fontFamily: "'Inter', system-ui, sans-serif", color: '#1d1d1f' }}>
      <Link to="/" style={{ fontSize: 13, color: '#6e6e73', textDecoration: 'none' }}>← Back to mvpclub.io</Link>

      <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.02em', marginTop: 20, marginBottom: 8 }}>Cookie Policy</h1>
      <div style={{ fontSize: 13, color: '#6e6e73', marginBottom: 28 }}>Last updated: today</div>

      <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 16 }}>
        "Cookies" here covers both actual browser cookies and similar local storage your browser holds on our
        behalf — mvpclub.io currently uses your browser's local storage rather than a traditional cookie for these,
        but we're describing it the way most people mean "cookies" so this policy is easy to act on, not just
        technically accurate.
      </p>

      <p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 24 }}>
        We use two categories: <strong>Necessary</strong>, which mvpclub.io can't function without and which don't
        require your consent, and <strong>Analytics</strong>, which is optional and only used with your consent to
        help us understand product usage. You can change your choice at any time — see{' '}
        <button
          type="button"
          onClick={openCookiePreferences}
          style={{ background: 'none', border: 'none', padding: 0, color: '#1d1d1f', fontWeight: 600, textDecoration: 'underline', cursor: 'pointer', font: 'inherit' }}
        >
          Cookie preferences
        </button>{' '}
        or the link in the bottom-left corner of any page.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>Necessary</h2>
      <p style={{ fontSize: 13, color: '#6e6e73', marginBottom: 4 }}>Always on — required for the product to work.</p>
      <div>
        <div style={{ ...rowStyle, borderTop: 'none', fontWeight: 600, color: '#6e6e73', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <div>Name</div><div>Duration</div><div>Purpose</div>
        </div>
        <div style={rowStyle}>
          <div><code>mvpclub_token</code></div>
          <div>Until you sign out</div>
          <div>Keeps you signed in, so you don't have to log in again on every visit.</div>
        </div>
        <div style={rowStyle}>
          <div><code>mvpclub_cookie_consent</code></div>
          <div>Until you change it</div>
          <div>Remembers the choice you make on this page or the cookie banner, so we don't ask again every visit.</div>
        </div>
      </div>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>Analytics</h2>
      <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 4 }}>
        Optional — only active if you accept it. Being straightforward: as of today mvpclub.io doesn't run any
        analytics or tracking scripts yet, so accepting this category currently has no effect. We're asking anyway
        so that if we do turn on basic usage measurement later (e.g. which features get used, where people get
        stuck), it will already respect whatever you chose here rather than starting to track you by default.
        This page will be updated with real details — provider, what's collected, retention — before that happens.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>Third parties</h2>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        Some features (like scheduling video calls) hand off to third-party services such as Zoom, which may set
        their own cookies once you're on their site — those are covered by their own policies, not this one.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>Questions</h2>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        Reach out via the <Link to="/help" style={{ color: '#1d1d1f', fontWeight: 600 }}>Help</Link> page with any
        questions about this policy.
      </p>
    </div>
  );
}
