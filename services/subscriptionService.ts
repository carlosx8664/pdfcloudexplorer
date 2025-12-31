import { db, hasFirebaseConfig } from './firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { initializeProCredits } from './aiCreditService';

export interface Subscription {
  plan: 'free' | 'pro';
  status: 'active' | 'expired' | 'cancelled';
  expiresAt: Date | null;
  paymentReference?: string;
  amount?: number;
  currency?: string;
}

function ensureDb() {
  if (!hasFirebaseConfig || !db) {
    console.warn('Firestore not available, returning default subscription');
    return null;
  }
  return db;
}

export async function getUserSubscription(userId: string): Promise<Subscription> {
  const dbInstance = ensureDb();
  
  if (!dbInstance) {
    return { plan: 'free', status: 'active', expiresAt: null };
  }

  try {
    const userRef = doc(dbInstance, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const data = userSnap.data();
      return {
        plan: data.subscription?.plan || 'free',
        status: data.subscription?.status || 'active',
        expiresAt: data.subscription?.expiresAt?.toDate() || null,
        paymentReference: data.subscription?.paymentReference,
        amount: data.subscription?.amount,
        currency: data.subscription?.currency
      };
    }
    
    // User exists in Auth but not in Firestore - create FREE subscription
    console.log('⚠️ Creating default FREE subscription for existing user');
    await setDoc(userRef, {
      subscription: {
        plan: 'free',
        status: 'active',
        expiresAt: null
      },
      aiCredits: {
        total: 0,
        used: 0,
        remaining: 0,
        resetAt: null
      },
      email: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return {
      plan: 'free',
      status: 'active',
      expiresAt: null
    };
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return {
      plan: 'free',
      status: 'active',
      expiresAt: null
    };
  }
}

export async function upgradeUserToPro(
  userId: string, 
  paymentReference: string,
  amount: number,
  currency: string
) {
  const dbInstance = ensureDb();
  if (!dbInstance) {
    throw new Error("Database not initialized. Cannot upgrade user.");
  }

  try {
    const userRef = doc(dbInstance, 'users', userId);
    await setDoc(userRef, {
      subscription: {
        plan: 'pro',
        status: 'active',
        expiresAt: null, // Lifetime for now
        paymentReference,
        amount,
        currency,
        upgradedAt: serverTimestamp()
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // Initialize AI credits for the new PRO user
    await initializeProCredits(userId);
    
    return true;
  } catch (error) {
    console.error('Error upgrading user:', error);
    throw error;
  }
}

export function isPro(subscription: Subscription): boolean {
  return subscription.plan === 'pro' && subscription.status === 'active';
}