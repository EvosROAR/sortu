import { useEffect, useRef } from 'react';

import { chooseAction, showMessage } from '@/lib/confirm';
import { isFirebaseConfigured } from '@/infrastructure/firebase/config';
import { sortuSyncService } from '@/infrastructure/firebase/sortuSyncService';
import {
  emptyLedger,
  ledgerFingerprint,
  ledgerHasData,
  LedgerSnapshot,
  loadLedger,
} from '@/infrastructure/storage/ledgerStorage';
import { useAuthStore } from '@/store/authStore';
import { useSortuStore } from '@/store/sortuStore';

function summarize(data: Pick<LedgerSnapshot, 'unallocated' | 'pockets' | 'events'>) {
  return `${data.pockets.length} kantong · ${data.events.length} riwayat · belum dialokasi Rp ${Math.round(data.unallocated).toLocaleString('id-ID')}`;
}

/**
 * Pull cloud dengan resolusi konflik (tidak silent overwrite).
 * Push hanya setelah syncReady.
 */
export function SyncBootstrap() {
  const user = useAuthStore((s) => s.user);
  const isHydrated = useSortuStore((s) => s.isHydrated);
  const syncReady = useSortuStore((s) => s.syncReady);
  const unallocated = useSortuStore((s) => s.unallocated);
  const pockets = useSortuStore((s) => s.pockets);
  const events = useSortuStore((s) => s.events);
  const remindersEnabled = useSortuStore((s) => s.remindersEnabled);
  const updatedAt = useSortuStore((s) => s.updatedAt);
  const syncRetryNonce = useSortuStore((s) => s.syncRetryNonce);

  const resolving = useRef(false);
  const pulledForUid = useRef<string | null>(null);
  const skipNextPush = useRef(false);
  /** Push cloud hanya setelah pull/resolusi awal berhasil — hindari timpa cloud saat gagal sync. */
  const pushAllowed = useRef(false);
  const lastRetryNonce = useRef(0);

  useEffect(() => {
    if (!user || !isHydrated || !isFirebaseConfigured()) {
      if (!user && isHydrated) {
        useSortuStore.getState().setSyncReady(true, null);
      }
      return;
    }
    if (pulledForUid.current === user.uid) {
      if (syncRetryNonce === lastRetryNonce.current) return;
      pulledForUid.current = null;
      resolving.current = false;
    }
    if (resolving.current) return;

    lastRetryNonce.current = syncRetryNonce;

    let cancelled = false;

    const finishWith = async (ledger: LedgerSnapshot, pushAfter: boolean) => {
      skipNextPush.current = true;
      pushAllowed.current = true;
      useSortuStore.getState().replaceLedger(ledger);
      if (pushAfter) {
        try {
          await sortuSyncService.push(user.uid, ledger);
        } catch {
          pushAllowed.current = false;
        }
      }
      pulledForUid.current = user.uid;
      resolving.current = false;
      useSortuStore.getState().setSyncReady(true, null);
    };

    const askConflict = (local: LedgerSnapshot, cloud: LedgerSnapshot) => {
      resolving.current = true;
      useSortuStore.getState().setSyncReady(false, 'Menunggu pilihan sync…');

      chooseAction(
        'Data berbeda ditemukan',
        `Perangkat ini dan cloud punya data Sortu yang beda.\n\n` +
          `Di perangkat ini:\n${summarize(local)}\n\n` +
          `Di cloud:\n${summarize(cloud)}\n\n` +
          `Pilih mana yang dipakai. Tidak digabung otomatis.`,
        {
          primaryLabel: 'Pakai cloud',
          onPrimary: () => {
            void finishWith(cloud, false);
          },
          secondaryLabel: 'Pakai data ini',
          onSecondary: () => {
            void finishWith({ ...local, updatedAt: new Date().toISOString() }, true);
          },
          cancelLabel: 'Pakai lokal dulu',
          onCancel: () => {
            // Sesi ini: lokal, tanpa overwrite cloud
            skipNextPush.current = true;
            pushAllowed.current = false;
            pulledForUid.current = user.uid;
            resolving.current = false;
            useSortuStore.getState().setSyncReady(true, 'Memakai data lokal (belum sync)');
          },
        },
      );
    };

    const askGuestImport = (guest: LedgerSnapshot) => {
      resolving.current = true;
      useSortuStore.getState().setSyncReady(false, 'Menunggu pilihan…');

      chooseAction(
        'Data mode tamu ditemukan',
        `Kamu punya data di mode tamu (belum login):\n${summarize(guest)}\n\n` +
          `Cloud akun ini masih kosong. Mau unggah data tamu ke akun email ini?`,
        {
          primaryLabel: 'Unggah ke akun',
          onPrimary: () => {
            void finishWith({ ...guest, updatedAt: new Date().toISOString() }, true);
          },
          secondaryLabel: 'Mulai kosong',
          onSecondary: () => {
            void finishWith(emptyLedger(), false);
          },
          cancelLabel: 'Nanti',
          onCancel: () => {
            skipNextPush.current = true;
            pushAllowed.current = false;
            pulledForUid.current = user.uid;
            resolving.current = false;
            useSortuStore.getState().setSyncReady(true, 'Data tamu belum diunggah');
          },
        },
      );
    };

    (async () => {
      pushAllowed.current = false;
      useSortuStore.getState().setSyncReady(false, 'Menyinkronkan…');
      try {
        const cloud = await sortuSyncService.pull(user.uid);
        if (cancelled) return;

        const local = useSortuStore.getState().getSnapshot();
        const cloudExists = !!cloud && ledgerHasData(cloud);
        const localExists = ledgerHasData(local);

        if (!cloudExists && !localExists) {
          const guest = await loadLedger('guest');
          if (cancelled) return;
          if (ledgerHasData(guest)) {
            askGuestImport(guest);
            return;
          }
          await finishWith(emptyLedger(), true);
          return;
        }

        if (!cloudExists && localExists) {
          await finishWith({ ...local, updatedAt: new Date().toISOString() }, true);
          if (!cancelled) showMessage('Sync', 'Data lokal diunggah ke cloud.');
          return;
        }

        if (cloudExists && !localExists) {
          await finishWith(cloud!, false);
          return;
        }

        const same =
          ledgerFingerprint(local) ===
          ledgerFingerprint({
            unallocated: cloud!.unallocated,
            pockets: cloud!.pockets,
            events: cloud!.events,
            remindersEnabled: cloud!.remindersEnabled,
          });

        if (same) {
          await finishWith(local, false);
          return;
        }

        askConflict(local, cloud!);
      } catch {
        if (cancelled) return;
        skipNextPush.current = true;
        pushAllowed.current = false;
        pulledForUid.current = user.uid;
        resolving.current = false;
        useSortuStore.getState().setSyncReady(
          true,
          'Gagal ambil cloud — cek internet & aturan Firestore',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, isHydrated, syncRetryNonce]);

  useEffect(() => {
    if (!user || !isHydrated || !syncReady || !isFirebaseConfigured()) return;
    if (pulledForUid.current !== user.uid) return;
    if (resolving.current) return;
    if (!pushAllowed.current) return;

    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    const msg = useSortuStore.getState().syncMessage;
    if (msg?.includes('belum sync')) return;

    const timer = setTimeout(() => {
      void sortuSyncService
        .push(user.uid, {
          unallocated,
          pockets,
          events,
          remindersEnabled,
          updatedAt,
        })
        .catch(() => undefined);
    }, 900);

    return () => clearTimeout(timer);
  }, [
    user,
    isHydrated,
    syncReady,
    unallocated,
    pockets,
    events,
    remindersEnabled,
    updatedAt,
  ]);

  useEffect(() => {
    if (!user) {
      pulledForUid.current = null;
      resolving.current = false;
      pushAllowed.current = false;
    }
  }, [user]);

  return null;
}
