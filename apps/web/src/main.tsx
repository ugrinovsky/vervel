import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary';

import { ThemeController } from './util/ThemeController';
import './styles/variables.css';
import './styles/datepicker.css';

ThemeController.init();
ThemeController.initAutoListener();

// Disable pinch-to-zoom (iOS Safari ignores viewport user-scalable=no since iOS 10)
document.addEventListener('touchmove', (e) => {
  if ((e as TouchEvent).touches.length > 1) e.preventDefault();
}, { passive: false });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
