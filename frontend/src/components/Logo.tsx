import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
  dark?: boolean;
}

// 2026-10 redesign: ink tile with a lime asterisk, "MVP CLUB" wordmark and
// a mono tagline underneath. `dark` flips the tile to lime-on-ink for use on
// the dark hero / completion screens.
export default function Logo({ size = 'md', href, dark = false }: LogoProps) {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useApp();
  const dest = href ?? (isAuthenticated ? (user?.is_admin ? '/admin' : '/community') : '/');

  const tile      = size === 'sm' ? 30 : size === 'lg' ? 36 : 34;
  const titleSize = size === 'sm' ? 16 : size === 'lg' ? 19 : 18;
  const clubSize  = size === 'sm' ? 12 : size === 'lg' ? 15 : 14;
  const tagSize   = size === 'sm' ? 9  : 10;

  const fg      = dark ? '#f5f2ff' : '#16121d';
  const fgMuted = dark ? '#8a8299' : '#6f6880';
  const tileBg  = dark ? '#d6ff3d' : '#16121d';
  const tileFg  = dark ? '#16121d' : '#d6ff3d';

  return (
    <button
      onClick={() => navigate(dest)}
      aria-label="MVP Club — home"
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0, transition: 'opacity .15s', fontFamily: 'var(--font-ui)',
      }}
      onMouseEnter={e => (e.currentTarget.style.opacity = '.8')}
      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
    >
      <div style={{
        width: tile, height: tile, borderRadius: 10, background: tileBg,
        display: 'grid', placeItems: 'center', color: tileFg,
        fontWeight: 800, fontSize: Math.round(tile * 0.56), lineHeight: 1, flexShrink: 0,
      }}>✳</div>
      <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, textAlign: 'left' }}>
        <span style={{ fontWeight: 800, fontSize: titleSize, letterSpacing: '-0.02em', color: fg, whiteSpace: 'nowrap' as const }}>
          MVP <span style={{ fontWeight: 400, letterSpacing: '0.18em', fontSize: clubSize }}>CLUB</span>
        </span>
        {size !== 'sm' && (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: tagSize, color: fgMuted, marginTop: 4, whiteSpace: 'nowrap' as const }}>
            From idea to launched
          </span>
        )}
      </div>
    </button>
  );
}
