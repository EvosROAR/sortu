import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { AuthUser } from '@/domain/entities/Auth';
import { getFirebaseAuth, getFirestoreDb, isFirebaseConfigured } from '@/infrastructure/firebase/config';

function toAuthUser(user: FirebaseUser): AuthUser {
  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName ?? user.email?.split('@')[0] ?? 'User',
  };
}

async function ensureProfile(user: FirebaseUser, displayName?: string): Promise<AuthUser> {
  const db = getFirestoreDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const name = displayName?.trim() || user.displayName || user.email?.split('@')[0] || 'User';

  if (!snap.exists()) {
    await setDoc(ref, {
      email: user.email ?? '',
      displayName: name,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      app: 'sortu',
    });
  }

  if (displayName?.trim() && user.displayName !== displayName.trim()) {
    await updateProfile(user, { displayName: displayName.trim() });
  }

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: user.displayName || name,
  };
}

export const authService = {
  isConfigured: isFirebaseConfigured,

  async login(email: string, password: string): Promise<AuthUser> {
    const result = await signInWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim(),
      password,
    );
    return ensureProfile(result.user);
  },

  async register(email: string, password: string, displayName: string): Promise<AuthUser> {
    const result = await createUserWithEmailAndPassword(
      getFirebaseAuth(),
      email.trim(),
      password,
    );
    await updateProfile(result.user, { displayName: displayName.trim() || 'User' });
    return ensureProfile(result.user, displayName);
  },

  async logout(): Promise<void> {
    await signOut(getFirebaseAuth());
  },

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    if (!isFirebaseConfigured()) {
      callback(null);
      return () => undefined;
    }
    return onAuthStateChanged(getFirebaseAuth(), async (firebaseUser) => {
      if (!firebaseUser) {
        callback(null);
        return;
      }
      try {
        callback(await ensureProfile(firebaseUser));
      } catch {
        callback(toAuthUser(firebaseUser));
      }
    });
  },
};
