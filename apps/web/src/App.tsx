import { JSX } from 'react';
import Navigation from '@/components/Navigation';
import { Routes, Route } from 'react-router';
import { routes } from '@/constants/routes';

import 'tailwindcss';
import './App.css';

function App(): JSX.Element {
  return (
    <>
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
