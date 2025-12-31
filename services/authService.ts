import { auth, db, hasFirebaseConfig } from './firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signOut,
  User,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { setDoc, doc, serverTimestamp, getDoc } from 'firebase/firestore';

function ensureAuth() {
  if (!hasFirebaseConfig || !auth) {
    throw new Error('Authentication is not available. This feature works in production only or with valid API keys.');
  }
  return auth;
}

export async function signUpWithEmail(email: string, password: string): Promise<User> {
  const authInstance = ensureAuth();
  try {
    const userCredential = await createUserWithEmailAndPassword(authInstance, email, password);
    const user = userCredential.user;
    
    // Set a default display name derived from email
    await updateProfile(user, {
      displayName: email.split('@')[0]
    });

    // Create FREE subscription record in Firestore for new user with 0 credits
    if (db) {
      try {
        const userRef = doc(db, 'users', user.email || user.uid);
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
          email: user.email,
          uid: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        console.log('✅ Created FREE subscription for new user');
      } catch (firestoreError) {
        console.error('⚠️ Failed to create Firestore record:', firestoreError);
      }
    }

    return user;
  } catch (error: any) {
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email is already registered. Please sign in instead.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password should be at least 6 characters.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    }
    throw new Error('Failed to create account. Please try again.');
  }
}

export async function signInWithEmail(email: string, password: string): Promise<User> {
  const authInstance = ensureAuth();
  try {
    const userCredential = await signInWithEmailAndPassword(authInstance, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email.');
    } else if (error.code === 'auth/wrong-password') {
      throw new Error('Incorrect password.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid email or password.');
    }
    throw new Error('Failed to sign in. Please try again.');
  }
}

export async function signInWithGoogle(): Promise<User> {
  const authInstance = ensureAuth();
  const provider = new GoogleAuthProvider();
  
  try {
    const result = await signInWithPopup(authInstance, provider);
    const user = result.user;
    
    // Create FREE subscription if first time Google sign-in
    if (db) {
      try {
        const userRef = doc(db, 'users', user.email || user.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
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
            email: user.email,
            uid: user.uid,
            displayName: user.displayName,
            photoURL: user.photoURL,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          console.log('✅ Created FREE subscription for new Google user');
        } else {
          // Just update metadata if user exists
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            updatedAt: serverTimestamp()
          }, { merge: true });
          console.log('✅ Synced Google user to Firestore');
        }
      } catch (firestoreError) {
        console.error('⚠️ Failed to sync to Firestore:', firestoreError);
      }
    }
    
    return user;
  } catch (error: any) {
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in cancelled');
    }
    throw new Error('Failed to sign in with Google');
  }
}

export async function logout(): Promise<void> {
  if (hasFirebaseConfig && auth) {
    await signOut(auth);
  }
}