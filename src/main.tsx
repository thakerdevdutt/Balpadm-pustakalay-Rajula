import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { APP_VERSION } from './version.ts';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

// Check if version changed and bust old CacheStorage to ensure users on mobile see new version immediately
if (typeof window !== 'undefined' && typeof caches !== 'undefined') {
  try {
    const cachedVer = localStorage.getItem('lekh_installed_version');
    if (cachedVer && cachedVer !== APP_VERSION) {
      caches.keys().then((keys) => {
        return Promise.all(keys.map((k) => caches.delete(k)));
      }).catch(() => {});
    }
    localStorage.setItem('lekh_installed_version', APP_VERSION);
  } catch {}
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Register PWA Service Worker
if ('serviceWorker' in navigator && typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch((err) => {
        console.log('Service Worker registration notice:', err);
      });
  });
}


