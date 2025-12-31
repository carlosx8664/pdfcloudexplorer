import { doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface AiCredits {
  total: number;
  used: number;
  remaining: number;
  resetAt: Date | null;
}

const PRO_CREDITS_PER_MONTH = 10;

function ensureDb() {
  if (!db) {
    // Fail silently if DB not initialized (e.g. preview mode without config)
    return null;
  }
  return db;
}

export async function getAiCredits(userEmail: string): Promise<AiCredits> {
  const dbInstance = ensureDb();
  if (!dbInstance) {
    return { total: 0, used: 0, remaining: 0, resetAt: null };
  }

  try {
    const userRef = doc(dbInstance, 'users', userEmail);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { total: 0, used: 0, remaining: 0, resetAt: null };
    }

    const data = userSnap.data();
    // Default structure for existing users who might not have the field yet
    const credits = data.aiCredits || { total: 0, used: 0, remaining: 0, resetAt: null };

    // Check if credits need to be reset (monthly)
    const now = new Date();
    // Handle Firestore Timestamp conversion
    const resetAt = credits.resetAt?.toDate ? credits.resetAt.toDate() : (credits.resetAt ? new Date(credits.resetAt) : null);
    
    const isPro = data.subscription?.plan === 'pro';

    // If user is PRO and (never initialized OR past reset date), reset/init credits
    if (isPro && (!resetAt || now > resetAt)) {
      const newTotal = PRO_CREDITS_PER_MONTH;
      
      const nextResetDate = new Date();
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);
      
      const resetCredits = {
        total: newTotal,
        used: 0,
        remaining: newTotal,
        resetAt: nextResetDate
      };
      
      await updateDoc(userRef, {
        aiCredits: resetCredits,
        updatedAt: serverTimestamp()
      });
      
      return resetCredits;
    }

    return {
      total: credits.total || 0,
      used: credits.used || 0,
      remaining: credits.remaining || 0,
      resetAt: resetAt
    };
  } catch (error) {
    console.error('Error fetching AI credits:', error);
    return { total: 0, used: 0, remaining: 0, resetAt: null };
  }
}

export async function useAiCredit(userEmail: string): Promise<boolean> {
  const dbInstance = ensureDb();
  if (!dbInstance) {
    // Allow if no DB (dev mode without firebase)
    return true; 
  }

  try {
    // Fetch latest to ensure validity and handle auto-resets
    const credits = await getAiCredits(userEmail);

    if (credits.remaining <= 0) {
      throw new Error('No AI credits remaining. Credits reset monthly for PRO users.');
    }

    const userRef = doc(dbInstance, 'users', userEmail);
    await updateDoc(userRef, {
      'aiCredits.used': credits.used + 1,
      'aiCredits.remaining': credits.remaining - 1,
      updatedAt: serverTimestamp()
    });

    console.log(`✅ AI credit used. Remaining: ${credits.remaining - 1}/${credits.total}`);
    return true;
  } catch (error) {
    console.error('Error using AI credit:', error);
    throw error;
  }
}

export async function initializeProCredits(userEmail: string): Promise<void> {
  const dbInstance = ensureDb();
  if (!dbInstance) return;

  try {
    const userRef = doc(dbInstance, 'users', userEmail);
    const resetDate = new Date();
    resetDate.setMonth(resetDate.getMonth() + 1);

    await updateDoc(userRef, {
      aiCredits: {
        total: PRO_CREDITS_PER_MONTH,
        used: 0,
        remaining: PRO_CREDITS_PER_MONTH,
        resetAt: resetDate
      },
      updatedAt: serverTimestamp()
    });

    console.log(`✅ Initialized ${PRO_CREDITS_PER_MONTH} AI credits for PRO user`);
  } catch (error) {
    console.error('Error initializing credits:', error);
  }
}