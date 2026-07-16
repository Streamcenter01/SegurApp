import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Capture any early Google Maps load failures or billing issues globally
(window as any).googleMapsAuthError = false;
(window as any).gm_authFailure = () => {
  console.warn("Global catch: Google Maps authentication or billing failure detected.");
  (window as any).googleMapsAuthError = true;
  // Dispatch custom event to notify React components in real time
  window.dispatchEvent(new Event('google-maps-auth-error'));
};

// Intercept console errors related to Google Maps billing or auth issues
const originalConsoleError = console.error;
console.error = function (...args) {
  const message = args.map(arg => String(arg)).join(" ");
  if (
    message.includes("BillingNotEnabledMapError") ||
    message.includes("ApiNotActivatedMapError") ||
    message.includes("InvalidKeyMapError") ||
    message.includes("Google Maps JavaScript API error") ||
    message.includes("gm_authFailure")
  ) {
    console.warn("Caught Google Maps error in console interceptor:", message);
    (window as any).googleMapsAuthError = true;
    window.dispatchEvent(new Event('google-maps-auth-error'));
  }
  originalConsoleError.apply(console, args);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

