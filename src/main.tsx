import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { BRAND_NAME } from './config/brand';
import { registerSW } from 'virtual:pwa-register';

document.title = BRAND_NAME;

// Installable PWA: the service worker precaches the static build so the game runs fully
// offline after first load (CLAUDE.md Step 8/10). Updates apply on the next launch.
// Some hosts (sandboxed previews) refuse service workers; the game must still run there.
try {
  if ('serviceWorker' in navigator) {
    registerSW({
      immediate: true,
      onRegisterError: (err: unknown) => console.info('Service worker not registered:', err),
    });
  }
} catch (err) {
  console.info('Service worker registration skipped:', err);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
