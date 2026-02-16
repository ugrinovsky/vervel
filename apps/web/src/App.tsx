import { JSX } from 'react';
import Navigation from '@/components/Navigation/Navigation';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { routes } from '@/constants/routes';
import { Toaster } from 'react-hot-toast';
import LoginScreen from '@/screens/LoginScreen/LoginScreen';
import RegisterScreen from '@/screens/RegisterScreen/RegisterScreen';
import TrainerAthleteDetailScreen from '@/screens/TrainerAthleteDetailScreen/TrainerAthleteDetailScreen';
import TrainerGroupDetailScreen from '@/screens/TrainerGroupDetailScreen/TrainerGroupDetailScreen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';

import 'tailwindcss';
import './App.css';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function AppContent(): JSX.Element {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/register';

  // Deduplicate routes (profile appears in both athlete and trainer routes)
  const uniqueRoutes = routes.filter(
    (route, index, arr) =>
      route.element && arr.findIndex((r) => r.path === route.path) === index
  );

  return (
    <>
      <Toaster
        position="top-center"
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
      </Routes>
      {!isAuthPage && <Navigation />}
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
