import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  dark?: boolean;
}

export default function Logo({ size = 'md', href, dark = false }: LogoProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useApp();
  const dest = href ?? (isAuthenticated ? (user?.is_admin ? '/admin' : '/community') : '/');

  const iconSize  = size === 'sm' ? 26 : size === 'lg' ? 36 : 32;
  const titleSize = size === 'sm' ? 13 : size === 'lg' ? 27 : 15;
  const tagSize   = size === 'sm' ? 8  : size === 'lg' ? 11 : 9;

  const fg = dark ? '#ffffff' : '#1d1d1f';
  const fgMuted = dark ? 'rgba(255,255,255,.45)' : '#86868b';

  // Sun: 8 rays at 45° steps
  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const r1 = 9, r2 = 13;
    return {
      x1: 16 + r1 * Math.cos(angle),
      y1: 16 + r1 * Math.sin(angle),
      x2: 16 + r2 * Math.cos(angle),
      y2: 16 + r2 * Math.sin(angle),
    };
  });

  return (
    <button
      onClick={() => navigate(dest)}
      aria-label="MVP Club — home"
      style={{
        display: 'flex', alignItems: 'center', gap: 9,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '4px 2px', borderRadius: 8, transition: 'opacity .15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '.75')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      {/* Sun mark */}
      <svg width={iconSize} height={iconSize} viewBox="0 0 32 32" fill="none">
        {/* Rays */}
        {rays.map((r, i) => (
          <line key={i} x1={r.x1} y1={r.y1} x2={r.x2} y2={r.y2}
            stroke={fg} strokeWidth="2" strokeLinecap="round" />
        ))}
        {/* Core circle */}
        <circle cx="16" cy="16" r="5.5" fill={fg} />
      </svg>

      {/* Wordmark */}
      <div style={{ textAlign: 'left', lineHeight: 1 }}>
        <div style={{ fontSize: titleSize, fontWeight: 900, letterSpacing: -0.4, color: fg, lineHeight: 1 }}>
          MVP <span style={{ fontWeight: 300, letterSpacing: size === 'lg' ? 3 : 2, fontSize: size === 'lg' ? titleSize * 0.70 : titleSize * 0.85 }}>CLUB</span>
        </div>
        <div style={{ fontSize: tagSize, color: fgMuted, fontWeight: 400, marginTop: 3, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
          From idea to launched
        </div>
      </div>
    </button>
  );
}
