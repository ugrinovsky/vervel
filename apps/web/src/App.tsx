import { JSX } from 'react';
import Navigation from '@/components/Navigation/Navigation';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { routes } from '@/constants/routes';
import { Toaster } from 'react-hot-toast';
import LoginScreen from '@/screens/LoginScreen/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen/RegisterScreen';
import OAuthCallbackScreen from '@/screens/OAuthCallbackScreen/OAuthCallbackScreen';
import SelectRoleScreen from '@/screens/SelectRoleScreen/SelectRoleScreen';
import TrainerAthleteDetailScreen from '@/screens/TrainerAthleteDetailScreen/TrainerAthleteDetailScreen';
import TrainerGroupDetailScreen from '@/screens/TrainerGroupDetailScreen/TrainerGroupDetailScreen';
import TrainerPersonalScreen from '@/screens/TrainerPersonalScreen/TrainerPersonalScreen';
import TrainerPublicProfileScreen from '@/screens/TrainerPublicProfileScreen/TrainerPublicProfileScreen';
import InviteScreen from '@/screens/InviteScreen/InviteScreen';
import DocsScreen from '@/screens/DocsScreen/DocsScreen';
import AvatarScreen from '@/screens/AvatarScreen/AvatarScreen';
import LandingScreen from '@/screens/LandingScreen/LandingScreen';
import { AuthProvider, useAuth, useActiveMode } from '@/contexts/AuthContext';
import { useAchievementToast } from '@/hooks/useAchievementToast';
import IncomingCallWatcher from '@/components/VideoCall/IncomingCallWatcher';

import 'tailwindcss';
import './App.css';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

/** Root screen: redirects trainers (or 'both' in trainer mode) to /trainer */
function HomeScreen(): JSX.Element {
  const { isTrainer, isAthlete, activeMode } = useActiveMode();
  const showTrainerNav = isTrainer && (!isAthlete || activeMode === 'trainer');
  if (showTrainerNav) {
    return <Navigate to="/trainer" replace />;
  }
  return <AvatarScreen />;
}

function AppContent(): JSX.Element {
  const location = useLocation();
  useAchievementToast();
  const { user } = useAuth();
  const { isAthlete, activeMode } = useActiveMode();
  const isAuthPage =
    location.pathname === '/' ||
    location.pathname === '/login' ||
    location.pathname === '/register' ||
    location.pathname === '/auth/callback' ||
    location.pathname === '/select-role' ||
    location.pathname.startsWith('/invite/') ||
    location.pathname.startsWith('/docs/');
  const showIncomingCallWatcher = !!user && isAthlete && activeMode === 'athlete' && !isAuthPage;

  // Deduplicate routes (profile appears in both athlete and trainer routes)
  const uniqueRoutes = routes.filter(
    (route, index, arr) =>
      route.element && arr.findIndex((r) => r.path === route.path) === index
  );

  return (
    <>
      <Toaster
        position="top-center"
        containerStyle={{ top: 'env(safe-area-inset-top, 0px)' }}
        toastOptions={{
          style: {
            background: 'rgba(0,0,0,0.8)',
            color: '#fff',
          },
        }}
      />
      <Routes>
        <Route path="/login" element={<LoginScreen />} />
        <Route path="/register" element={<RegisterScreen />} />
        <Route path="/auth/callback" element={<OAuthCallbackScreen />} />
        <Route path="/select-role" element={<SelectRoleScreen />} />
        {/* Public invite route — handles auth state internally */}
        <Route path="/invite/:token" element={<InviteScreen />} />
        {/* Public legal docs */}
        <Route path="/docs/privacy" element={<DocsScreen />} />
        <Route path="/docs/offer" element={<DocsScreen />} />
        <Route path="/docs/seller" element={<DocsScreen />} />
        <Route path="/" element={<LandingScreen />} />
        <Route
          path="/home"
          element={<ProtectedRoute><HomeScreen /></ProtectedRoute>}
        />
        {uniqueRoutes.map((rout) => (
          <Route
            key={rout.path}
            path={rout.path}
            element={<ProtectedRoute>{rout.element}</ProtectedRoute>}
          />
        ))}
        {/* Trainer detail routes (with params) */}
        <Route
          path="/trainer/athletes/:athleteId"
          element={
            <ProtectedRoute>
              <TrainerAthleteDetailScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainer/groups/:groupId"
          element={
            <ProtectedRoute>
              <TrainerGroupDetailScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainer/personal"
          element={
            <ProtectedRoute>
              <TrainerPersonalScreen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trainer/profile/:trainerId"
          element={
            <ProtectedRoute>
              <TrainerPublicProfileScreen />
            </ProtectedRoute>
          }
        />
      </Routes>
      {!isAuthPage && <Navigation />}
      {showIncomingCallWatcher && <IncomingCallWatcher />}
    </>
  );
}

function App(): JSX.Element {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
