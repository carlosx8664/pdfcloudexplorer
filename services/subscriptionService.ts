
import { db, hasFirebaseConfig } from './firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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
        plan: data.subscription?.plan || (data.pro ? 'pro' : 'free'),
        status: data.subscription?.status || 'active',
        expiresAt: data.subscription?.expiresAt?.toDate() || null,
        paymentReference: data.subscription?.paymentReference,
        amount: data.subscription?.amount,
        currency: data.subscription?.currency
      };
    }
    
    // Create FREE subscription record for new user
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
    }, { merge: true });
    
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

export function isPro(subscription: Subscription): boolean {
  return subscription.plan === 'pro' && subscription.status === 'active';
}
