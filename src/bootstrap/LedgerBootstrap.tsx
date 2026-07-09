import { useEffect, useRef } from 'react';

import {
  ledgerScopeId,
  loadLedger,
  saveLedger,
} from '@/infrastructure/storage/ledgerStorage';
import { useAuthStore } from '@/store/authStore';
import { useSortuStore } from '@/store/sortuStore';

/**
 * Load/save ledger per scope:
 * - guest → sortu-ledger:guest
 * - uid:xxx → sortu-ledger:uid:xxx
 * Ganti akun = ganti scope (data tidak tercampur).
 */
export function LedgerBootstrap() {
  const user = useAuthStore((s) => s.user);
  const guestMode = useAuthStore((s) => s.guestMode);
  const isLoading = useAuthStore((s) => s.isLoading);
  const scopeId = ledgerScopeId(user?.uid ?? null, guestMode);
  const activeScope = useRef<string>('pending');
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const unallocated = useSortuStore((s) => s.unallocated);
  const pockets = useSortuStore((s) => s.pockets);
  const events = useSortuStore((s) => s.events);
  const remindersEnabled = useSortuStore((s) => s.remindersEnabled);
  const updatedAt = useSortuStore((s) => s.updatedAt);
  const isHydrated = useSortuStore((s) => s.isHydrated);
  const syncReady = useSortuStore((s) => s.syncReady);

  // Switch scope when auth settles
  useEffect(() => {
    if (isLoading) return;
    if (scopeId === 'pending') return;
    if (activeScope.current === scopeId && useSortuStore.getState().isHydrated) return;

    let cancelled = false;
    activeScope.current = scopeId;

    useSortuStore.getState().setScopeMeta(scopeId, false);
    useSortuStore.getState().setSyncReady(false, 'Memuat data…');

    (async () => {
      const ledger = await loadLedger(scopeId);
      if (cancelled || activeScope.current !== scopeId) return;
      useSortuStore.getState().replaceLedger(ledger);
      useSortuStore.getState().setScopeMeta(scopeId, true);
      // SyncBootstrap akan set syncReady; untuk guest langsung ready
      if (guestMode || !user) {
        useSortuStore.getState().setSyncReady(true, null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scopeId, isLoading, guestMode, user]);

  // Debounced persist to scoped storage (tunggu sync awal untuk akun login)
  useEffect(() => {
    if (!isHydrated) return;
    if (scopeId === 'pending') return;
    if (activeScope.current !== scopeId) return;
    if (user && !guestMode && !syncReady) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      void saveLedger(scopeId, {
        unallocated,
        pockets,
        events,
        remindersEnabled,
        updatedAt,
      });
    }, 400);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [
    scopeId,
    isHydrated,
    syncReady,
    user,
    guestMode,
    unallocated,
    pockets,
    events,
    remindersEnabled,
    updatedAt,
  ]);

  return null;
}
