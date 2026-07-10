import admin from 'firebase-admin';

let initialized = false;

function initFirebaseAdmin(): void {
  if (initialized || admin.apps.length > 0) {
    initialized = true;
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON belum diset di Vercel.');
  }

  const serviceAccount = JSON.parse(raw) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
}

export async function verifyFirebaseIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
  initFirebaseAdmin();
  return admin.auth().verifyIdToken(idToken);
}
