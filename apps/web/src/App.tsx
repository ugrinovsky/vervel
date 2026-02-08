import { JSX } from 'react';
import Navigation from '@/components/Navigation/Navigation';
import { Routes, Route } from 'react-router';
import { routes } from '@/constants/routes';
import { Toaster } from 'react-hot-toast';

import 'tailwindcss';
import './App.css';

function App(): JSX.Element {
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
        {routes.map((rout) => (
          <Route path={rout.path} element={rout.element} />
        ))}
      </Routes>
      <Navigation />
    </>
  );
}

export default App;
