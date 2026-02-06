import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';


// Safely resolve environment variables from multiple possible locations
const getEnvVar = (name: string): string | undefined => {
  try {
    // Check import.meta.env (Vite)
    if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
      return (import.meta as any).env[name];
    }
    // Check process.env (Node/Webpack/Define)
    if (typeof process !== 'undefined' && process.env) {
      return process.env[name];
    }
  } catch (e) {
    // Ignore errors in env access
  }
  return undefined;
};


const isDevMode = getEnvVar('DEV') === 'true' || 
                  getEnvVar('MODE') === 'development' || 
                  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));


// Try to import local config for development
let localFirebaseConfig = null;


// Use a self-invoking function to handle the conditional top-level await-like logic
if (isDevMode) {
  try {
    // Attempt dynamic import of local config
    // @ts-ignore - config.local only exists in development
    const localConfigModule = await import('./config.local').catch(() => null);
    if (localConfigModule && localConfigModule.localFirebaseConfig) {
      localFirebaseConfig = localConfigModule.localFirebaseConfig;
      console.log('🔧 Using local Firebase config for development');
    }
  } catch (e) {
    // Local config doesn't exist
  }
}


// Load Firebase configuration
const firebaseConfig = localFirebaseConfig || {
  apiKey: getEnvVar('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvVar('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvVar('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvVar('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnvVar('VITE_FIREBASE_APP_ID')
};


// Check if all required config values are present
const hasFirebaseConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.appId
);


let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;


if (hasFirebaseConfig) {
  try {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    console.log('✅ Firebase initialized successfully');
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
  }
} else {
  console.warn('⚠️ Firebase configuration is incomplete. Auth features will be limited.');
}


export { app, db, auth, hasFirebaseConfig };
export default app;
