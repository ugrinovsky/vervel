import { JSX } from 'react';
import Navigation from '@/components/Navigation/Navigation';
import { Routes, Route, Navigate, useLocation } from 'react-router';
import { routes } from '@/constants/routes';
import { Toaster } from 'react-hot-toast';
import LoginScreen from '@/screens/LoginScreen/LoginScreen';

import 'tailwindcss';
import './App.css';

function ProtectedRoute({ children }: { children: JSX.Element }) {
  const token = localStorage.getItem('token');
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

function App(): JSX.Element {
  const location = useLocation();
  const isLoginPage = location.pathname === '/login';

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
        {routes.map((rout) => (
          <Route
            key={rout.path}
            path={rout.path}
            element={<ProtectedRoute>{rout.element}</ProtectedRoute>}
          />
        ))}
      </Routes>
      {!isLoginPage && <Navigation />}
    </>
  );
}

export default App;
