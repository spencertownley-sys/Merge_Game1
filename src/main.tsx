import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BRAND_NAME } from './config/brand';
import { registerSW } from 'virtual:pwa-register';

document.title = BRAND_NAME;

// Installable PWA: the service worker precaches the static build so the game runs fully
// offline after first load (CLAUDE.md Step 8/10). Updates apply on the next launch.
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
