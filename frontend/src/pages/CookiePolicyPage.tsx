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
        Optional — only active if you accept it. We run basic, first-party usage measurement on our own server (no
        third-party analytics provider, no ad trackers) — currently limited to the public homepage: which page you
        viewed, and which button or link you clicked. Nothing here uses a cookie or reads anything already on your
        device; it's a server-side record of that one visit, sent only after you've accepted this category.
      </p>
      <div>
        <div style={{ ...rowStyle, borderTop: 'none', fontWeight: 600, color: '#6e6e73', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          <div>What's collected</div><div>Retention</div><div>Why</div>
        </div>
        <div style={rowStyle}>
          <div>Page path, and the button/link you clicked (if any)</div>
          <div>Individual records: 90 days.<br />Daily totals: kept</div>
          <div>Seeing which pages and buttons are actually used, and how many people visit.</div>
        </div>
        <div style={rowStyle}>
          <div>Your IP address, one-way hashed</div>
          <div>Same as above</div>
          <div>Counting how many <em>different</em> visitors we get, without storing your actual IP address — the
            hash can't be reversed back to it.</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#6e6e73', lineHeight: 1.6, marginTop: 10 }}>
        After 90 days, the individual visit record is deleted; only that day's totals (e.g. "42 unique visitors, 61
        page views") are kept, indefinitely, for long-run trends. We don't use this to identify you personally, sell
        it, or share it with anyone.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>Third parties</h2>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        Some features (like scheduling video calls) hand off to Jitsi Meet's public server (meet.jit.si), which
        may set its own cookies once you're on their site — those are covered by their own policy, not this one.
      </p>

      <h2 style={{ fontSize: 18, fontWeight: 700, marginTop: 32, marginBottom: 8 }}>Questions</h2>
      <p style={{ fontSize: 13, lineHeight: 1.6 }}>
        Reach out via the <Link to="/help" style={{ color: '#1d1d1f', fontWeight: 600 }}>Help</Link> page with any
        questions about this policy.
      </p>
    </div>
  );
}
