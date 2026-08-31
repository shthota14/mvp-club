import { Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useEffect } from 'react';
import HeroPage from '@/pages/HeroPage';
import AppShell from '@/components/AppShell';
import MyProgressPage from '@/pages/MyProgressPage';
import CommunityPage from '@/pages/CommunityPage';
import IdeaDetailPage from '@/pages/IdeaDetailPage';
import AdminPage from '@/pages/AdminPage';
import MessagesPage from '@/pages/MessagesPage';
import HelpPage from '@/pages/HelpPage';
import DiagramPage from '@/pages/DiagramPage';
import WorkPage from '@/pages/WorkPage';
import SurveyPage from '@/pages/SurveyPage';
import BookingPage from '@/pages/BookingPage';
import ConnectPage from '@/pages/ConnectPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DonateSuccessPage from '@/pages/DonateSuccessPage';
import DonateCancelPage from '@/pages/DonateCancelPage';
import MemberProfilePage from '@/pages/MemberProfilePage';
import PublicChallengePage from '@/pages/PublicChallengePage';
import CookiePolicyPage from '@/pages/CookiePolicyPage';
import SupportLinkPage from '@/pages/SupportLinkPage';
import PublicPainPointsPage from '@/pages/PublicPainPointsPage';
import StoryPage from '@/pages/StoryPage';
import CookieConsent from '@/components/CookieConsent';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useApp();
  if (isLoading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#6e6e73', fontSize:14 }}>Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useApp();
  if (isLoading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'#6e6e73', fontSize:14 }}>Loading…</div>;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  if (!user?.is_admin) return <Navigate to="/community" replace />;
  return <>{children}</>;
}

function AdminRedirect({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useApp();
  if (isLoading) return null;
  if (user?.is_admin) return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

function LinkedInCallbackHandler() {
  const [params, setParams] = useSearchParams();
  const { login, refreshUser } = useApp();

  useEffect(() => {
    const status = params.get('linkedin');
    const token  = params.get('token');
    if (!status) return;

    if (status === 'connected' && token) {
      localStorage.setItem('mvpclub_token', token);
      refreshUser();
    }

    // Strip linkedin params from URL without reloading
    params.delete('linkedin');
    params.delete('token');
    params.delete('reason');
    setParams(params, { replace: true });
  }, []);

  return null;
}

export default function App() {
  const { isAuthenticated, isLoading, user } = useApp();

  if (isLoading) return null;

  return (
    <>
    <LinkedInCallbackHandler />
    <CookieConsent />
    <Routes>
      <Route path="/" element={isAuthenticated ? <Navigate to={user?.is_admin ? '/admin' : '/community'} replace /> : <HeroPage />} />
      <Route element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
        <Route path="/journey" element={<Navigate to="/progress" replace />} />
        <Route path="/community" element={<AdminRedirect><CommunityPage /></AdminRedirect>} />
        <Route path="/community/member/:name" element={<AdminRedirect><MemberProfilePage /></AdminRedirect>} />
        <Route path="/community/:id" element={<AdminRedirect><IdeaDetailPage /></AdminRedirect>} />
        <Route path="/community/:id/scratchpad" element={<AdminRedirect><DiagramPage /></AdminRedirect>} />
        <Route path="/progress" element={<AdminRedirect><MyProgressPage /></AdminRedirect>} />
        <Route path="/work" element={<AdminRedirect><WorkPage /></AdminRedirect>} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Route>
      <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/survey/:token" element={<SurveyPage />} />
      <Route path="/book/:token" element={<BookingPage />} />
      <Route path="/connect/:ideaId" element={<ConnectPage />} />
      <Route path="/donate/success" element={<DonateSuccessPage />} />
      <Route path="/donate/cancel" element={<DonateCancelPage />} />
      <Route path="/c/:id" element={<PublicChallengePage />} />
      <Route path="/cookies" element={<CookiePolicyPage />} />
      <Route path="/support" element={<SupportLinkPage />} />
      <Route path="/pain-points" element={<PublicPainPointsPage />} />
      <Route path="/story" element={<StoryPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
