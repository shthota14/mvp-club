import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import PayItForwardModal from '@/components/PayItForwardModal';

// Standalone landing target for the "Support MVP Club" share link (/support).
// It's just the same PayItForwardModal used from the Hero page nav and the
// Community page banner, reachable directly so a shared link opens the
// donation flow immediately for anyone — signed in or not — instead of
// dropping them on a page where they'd have to go find the button again.
export default function SupportLinkPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
  const goBack = () => navigate(isAuthenticated ? '/community' : '/', { replace: true });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a0533 0%, #0f1e4a 60%, #0a2a1a 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>
      <PayItForwardModal onClose={goBack} />
    </div>
  );
}
