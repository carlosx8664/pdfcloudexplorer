import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// Try to import local config for development (will fail in production environments where file is missing)
let localFirebaseConfig = null;
try {
  // @ts-ignore: File might not exist in production
  const localConfigModule = await import('./config.local');
  localFirebaseConfig = localConfigModule.localFirebaseConfig;
  console.log('🔧 Using local Firebase config for development');
} catch (e) {
  // Local config doesn't exist, will use environment variables
}

// Load Firebase configuration from environment variables or local config
const firebaseConfig = localFirebaseConfig || {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
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
  console.warn('⚠️ Firebase environment variables not found. Auth features will be disabled in preview mode.');
  console.log('To enable Firebase, add these environment variables:');
  console.log('- VITE_FIREBASE_API_KEY');
  console.log('- VITE_FIREBASE_AUTH_DOMAIN');
  console.log('- VITE_FIREBASE_PROJECT_ID');
  console.log('- VITE_FIREBASE_STORAGE_BUCKET');
  console.log('- VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.log('- VITE_FIREBASE_APP_ID');
}

export { app, db, auth, hasFirebaseConfig };
export default app;