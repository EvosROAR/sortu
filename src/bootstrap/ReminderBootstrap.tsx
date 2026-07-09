import { useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import {
  cancelAllDueReminders,
  dueReminderFingerprint,
  registerDueReminderDeliveryListener,
  runDueReminderCatchUp,
  syncDueRemindersIfNeeded,
} from '@/application/DueReminderService';
import { useSortuStore } from '@/store/sortuStore';

/**
 * Jadwal jam 09:00 saat toggle / jatuh tempo berubah.
 * Catch-up hanya setelah jam 9 — tidak saat toggle pagi.
 */
export function ReminderBootstrap() {
  const isHydrated = useSortuStore((s) => s.isHydrated);
  const pockets = useSortuStore((s) => s.pockets);
  const remindersEnabled = useSortuStore((s) => s.remindersEnabled);
  const dueScheduleKey = useMemo(() => dueReminderFingerprint(pockets), [pockets]);
  const pocketsRef = useRef(pockets);
  const remindersRef = useRef(remindersEnabled);
  const prevEnabledRef = useRef(remindersEnabled);
  pocketsRef.current = pockets;
  remindersRef.current = remindersEnabled;

  useEffect(() => registerDueReminderDeliveryListener(), []);

  useEffect(() => {
    if (!isHydrated || Platform.OS === 'web') return;

    let cancelled = false;

    (async () => {
      const enabled = remindersRef.current;
      const justTurnedOn = enabled && !prevEnabledRef.current;
      prevEnabledRef.current = enabled;

      try {
        if (!enabled) {
          await cancelAllDueReminders();
          return;
        }

        // Hanya jadwalkan alarm — jangan catch-up di sini (fix notif jam 8:58)
        await syncDueRemindersIfNeeded(pocketsRef.current, justTurnedOn);
      } catch (e) {
        if (__DEV__) {
          console.warn('[Sortu] reminder sync gagal:', e);
        }
      }
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [isHydrated, dueScheduleKey, remindersEnabled]);

  // Catch-up: buka app / kembali dari background, hanya setelah jam 09:00
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !remindersRef.current) return;
      void runDueReminderCatchUp(pocketsRef.current);
    });

    return () => sub.remove();
  }, []);

  return null;
}
