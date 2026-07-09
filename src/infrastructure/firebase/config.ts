import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  Auth,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from 'firebase/auth';
import { enableIndexedDbPersistence, getFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let offlinePersistenceAttempted = false;

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const getFirebaseApp = (): FirebaseApp => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase belum dikonfigurasi. Salin .env.example ke .env dan isi kredensial Firebase.',
    );
  }
  if (!app) {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return app;
};

export const getFirebaseAuth = (): Auth => {
  if (!auth) {
    const firebaseApp = getFirebaseApp();
    if (Platform.OS === 'web') {
      auth = getAuth(firebaseApp);
    } else {
      try {
        auth = initializeAuth(firebaseApp, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch (e) {
        const code = (e as { code?: string }).code;
        if (code === 'auth/already-initialized') {
          auth = getAuth(firebaseApp);
        } else {
          throw e;
        }
      }
    }
  }
  return auth;
};

export const getFirestoreDb = (): Firestore => {
  if (!db) {
    db = getFirestore(getFirebaseApp());
    void enableFirestoreOffline();
  }
  return db;
};

export const enableFirestoreOffline = async (): Promise<void> => {
  if (offlinePersistenceAttempted || Platform.OS !== 'web') return;
  offlinePersistenceAttempted = true;
  try {
    await enableIndexedDbPersistence(db);
  } catch {
    // multi-tab / unsupported
  }
};
