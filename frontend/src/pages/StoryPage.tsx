import { Link, useNavigate } from 'react-router-dom';

// "Our Story" — the founder's own reasoning for why MVPClub.io exists, given
// to us verbatim and reproduced faithfully rather than rewritten. Linked from
// the hero-page footer nav (mirrors myecocred.com's footer pattern), and is
// itself a public, no-login page like /support and /pain-points.

const WHY_LINES = [
  'Was the idea bad?',
  'Was the problem not painful enough?',
  'Was the positioning wrong?',
  'Did they build the wrong features?',
  'Or did they simply never reach the right people?',
];

export default function StoryPage() {
  const navigate = useNavigate();

  return (
    <div style={{ background: '#fbf8f2', minHeight: '100vh' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 100px', fontFamily: 'var(--font-ui)', color: '#2b2318' }}>
        <Link to="/" style={{ fontSize: 13, color: '#8a7d64', textDecoration: 'none' }}>← Back to mvpclub.io</Link>

        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px,5vw,44px)', fontWeight: 700, letterSpacing: -0.5, lineHeight: 1.15, margin: '24px 0 20px' }}>
          Why We Built MVPClub.io
        </h1>

        <p style={{ fontSize: 19, lineHeight: 1.6, fontWeight: 600, color: '#3a3226', marginBottom: 32 }}>
          Too many good ideas are built before anyone knows if they are actually wanted.
        </p>

        <p style={proseStyle}>We kept seeing the same pattern.</p>
        <p style={proseStyle}>
          Someone has an idea they genuinely believe in. They spend weeks researching, designing and building it.
          They finally launch — and then wait for users.
        </p>
        <p style={proseStyle}>Sometimes nobody comes.</p>
        <p style={proseStyle}>And when that happens, it's difficult to know what went wrong.</p>

        <div style={{ margin: '28px 0', paddingLeft: 20, borderLeft: '2px solid #dfc9a3' }}>
          {WHY_LINES.map(line => (
            <p key={line} style={{ fontSize: 16.5, lineHeight: 1.8, fontStyle: 'italic', color: '#6b5d47', margin: 0 }}>{line}</p>
          ))}
        </div>

        <p style={proseStyle}>We believe founders shouldn't have to spend months building to find out.</p>
        <p style={proseStyle}>That's why we created MVPClub.io.</p>
        <p style={proseStyle}>
          Our goal is simple: help founders turn an idea into evidence before turning it into a product.
        </p>
        <p style={proseStyle}>
          Instead of relying only on opinions, assumptions or AI-generated market research, MVPClub is built around
          the things that matter most — understanding the problem, identifying the right customers, testing
          assumptions, collecting real feedback and learning from what people actually do.
        </p>

        <p style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 22, lineHeight: 1.5, textAlign: 'center' as const, color: '#8a5a2b', margin: '40px 0' }}>
          Because building an MVP should not be the first step.<br />
          Finding out what deserves to be built should be.
        </p>

        <p style={proseStyle}>
          MVPClub is our attempt to make that process simpler, more structured and accessible to every founder —
          whether you're a first-time entrepreneur with an idea or an experienced builder considering your next one.
        </p>
        <p style={proseStyle}>We're still learning too.</p>
        <p style={proseStyle}>
          Every founder who uses MVPClub, shares a pain point, tests an idea or tells us what we've got wrong helps
          shape what comes next.
        </p>

        <div style={{ textAlign: 'center' as const, margin: '48px 0 8px' }}>
          <p style={{ fontFamily: 'var(--font-hand)', fontSize: 30, lineHeight: 1.5, color: '#2b2318', margin: 0 }}>
            Build less on assumptions.<br />
            Learn more from reality.<br />
            Then build with confidence.
          </p>
        </div>

        <div style={{ textAlign: 'center' as const, marginTop: 48 }}>
          <button
            onClick={() => navigate('/', { state: { openRegister: true } })}
            style={{ padding: '13px 28px', borderRadius: 999, border: 'none', background: '#1d1d1f', color: '#fff', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            Get started →
          </button>
        </div>
      </div>
    </div>
  );
}

const proseStyle: React.CSSProperties = { fontSize: 16, lineHeight: 1.75, color: '#3a3226', marginBottom: 18 };
