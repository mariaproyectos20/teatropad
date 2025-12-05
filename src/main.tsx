import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  // Register service worker to enable offline caching of the app shell
  navigator.serviceWorker
    .register('/sw.js')
    .then(() => console.log('Service worker registered'))
    .catch((err) => console.warn('Service worker registration failed', err));
}
