import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  signInWithEmail as emailSignIn, 
  signUpWithEmail as emailSignUp, 
  signInWithGoogle as googleSignIn,
  logout 
} from '../services/authService';
import { getAiCredits, AiCredits } from '../services/aiCreditService';

// Declare google as a global variable provided by the Google Identity Services script
declare const google: any;

export type GoogleUser = {
  id: string;
  email: string;
  name: string;
  picture?: string;
};

interface GoogleAuthContextValue {
  user: GoogleUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  aiCredits: AiCredits | null;
  initializeGsi: (containerId: string) => void;
  signIn: () => void;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  refreshCredits: () => Promise<void>;
}

const GoogleAuthContext = createContext<GoogleAuthContextValue | undefined>(undefined);

// Simple JWT payload decoder without external libraries
function decodeJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export const GoogleAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<GoogleUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [aiCredits, setAiCredits] = useState<AiCredits | null>(null);

  // Load credits when user logs in
  useEffect(() => {
    if (user?.email) {
      getAiCredits(user.email).then(setAiCredits);
    } else {
      setAiCredits(null);
    }
  }, [user]);

  const refreshCredits = useCallback(async () => {
    if (user?.email) {
      const credits = await getAiCredits(user.email);
      setAiCredits(credits);
    }
  }, [user]);

  // This handles the GSI One Tap or Button response (if used)
  const handleCredentialResponse = useCallback((response: any) => {
    const payload = decodeJwt(response.credential);
    if (payload) {
      setUser({
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
      });
      // Note: GSI button doesn't automatically trigger the Firestore sync unless we use the token to auth with Firebase.
    }
  }, []);

  const initializeGsi = useCallback((containerId: string) => {
    // Check if the global google object is defined to avoid "Cannot find name 'google'" error
    if (typeof google === 'undefined') {
      console.warn('Google GSI script not loaded yet');
      return;
    }

    try {
      google.accounts.id.initialize({
        client_id: process.env.GOOGLE_CLIENT_ID || 'REPLACE_WITH_YOUR_CLIENT_ID.apps.googleusercontent.com',
        callback: handleCredentialResponse,
      });
  
      const container = document.getElementById(containerId);
      if (container) {
        google.accounts.id.renderButton(container, {
          theme: 'outline',
          size: 'large',
          width: 280,
        });
      }
    } catch (e) {
      console.error('Error initializing GSI:', e);
    }
  }, [handleCredentialResponse]);

  // Updated to use Firebase Auth via authService for Firestore sync
  const signIn = useCallback(async () => {
    setIsLoading(true);
    try {
      const firebaseUser = await googleSignIn();
      
      setUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || undefined
      });
    } catch (error) {
      console.error('Google Sign In Error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleSignInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const firebaseUser = await emailSignIn(email, password);
      setUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || undefined
      });
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUpWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const firebaseUser = await emailSignUp(email, password);
      setUser({
        id: firebaseUser.uid,
        name: firebaseUser.displayName || email.split('@')[0],
        email: firebaseUser.email || '',
        picture: firebaseUser.photoURL || undefined
      });
    } catch (error: any) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = useCallback(async () => {
    // Safely check for the google global variable before calling disableAutoSelect
    if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
      try {
        google.accounts.id.disableAutoSelect();
      } catch (e) {
        // ignore
      }
    }
    // Also sign out from firebase
    await logout();
    
    setUser(null);
    setAiCredits(null);
  }, []);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    aiCredits,
    initializeGsi,
    signIn,
    signInWithEmail: handleSignInWithEmail,
    signUpWithEmail: handleSignUpWithEmail,
    signOut,
    refreshCredits,
  };

  return <GoogleAuthContext.Provider value={value}>{children}</GoogleAuthContext.Provider>;
};

export const useGoogleAuth = () => {
  const context = useContext(GoogleAuthContext);
  if (context === undefined) {
    throw new Error('useGoogleAuth must be used within a GoogleAuthProvider');
  }
  return context;
};