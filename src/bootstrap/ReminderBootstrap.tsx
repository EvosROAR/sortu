import { useEffect } from 'react';
import { Platform } from 'react-native';

import {
  cancelAllDueReminders,
  syncDueReminders,
} from '@/application/DueReminderService';
import { useSortuStore } from '@/store/sortuStore';

/** Sinkronkan notifikasi H-3 / H-1 saat kantong berubah (native saja). */
export function ReminderBootstrap() {
  const isHydrated = useSortuStore((s) => s.isHydrated);
  const pockets = useSortuStore((s) => s.pockets);
  const remindersEnabled = useSortuStore((s) => s.remindersEnabled);

  useEffect(() => {
    if (!isHydrated || Platform.OS === 'web') return;

    let cancelled = false;
    (async () => {
      try {
        if (remindersEnabled) {
          await syncDueReminders(pockets);
        } else {
          await cancelAllDueReminders();
        }
      } catch {
        // permission ditolak / not supported — diam saja
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, pockets, remindersEnabled]);

  return null;
}
