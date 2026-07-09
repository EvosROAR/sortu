import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { SortuCloudData } from '@/domain/entities/Auth';
import { getFirestoreDb } from '@/infrastructure/firebase/config';
import { LedgerSnapshot } from '@/infrastructure/storage/ledgerStorage';

function sortuDoc(uid: string) {
  return doc(getFirestoreDb(), 'users', uid, 'app', 'sortu');
}

export const sortuSyncService = {
  async pull(uid: string): Promise<LedgerSnapshot | null> {
    const snap = await getDoc(sortuDoc(uid));
    if (!snap.exists()) return null;
    const data = snap.data() as SortuCloudData;
    return {
      unallocated: Number(data.unallocated) || 0,
      pockets: Array.isArray(data.pockets) ? (data.pockets as LedgerSnapshot['pockets']) : [],
      events: Array.isArray(data.events) ? (data.events as LedgerSnapshot['events']) : [],
      remindersEnabled: data.remindersEnabled !== false,
      updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : new Date().toISOString(),
    };
  },

  async push(uid: string, local: LedgerSnapshot): Promise<void> {
    await setDoc(
      sortuDoc(uid),
      {
        unallocated: local.unallocated,
        pockets: local.pockets,
        events: local.events.slice(0, 500),
        remindersEnabled: local.remindersEnabled,
        updatedAt: local.updatedAt || new Date().toISOString(),
        savedAt: serverTimestamp(),
      },
      { merge: true },
    );
  },
};
