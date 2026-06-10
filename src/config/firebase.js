import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAMpaImFb-azX17e03RVWJR3Wty4pGxRMY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "gestionate-facil-ae8a7.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "gestionate-facil-ae8a7",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "gestionate-facil-ae8a7.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "691318933017",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:691318933017:web:355152d3a1a7d154798c88",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-HS1RTZ3WHZ"
};

const app = initializeApp(firebaseConfig);

// Inicializar App Check
if (typeof window !== 'undefined') {
  // Habilitar el token de depuración en localhost
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }

  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_APP_CHECK_SITE_KEY || "6Lc5J88sAAAAAIOek12vzyodIYopz-yo_bf1Ja5Q"),
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

