import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import { Pocket } from '@/domain/entities/Pocket';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const PREFIX = 'sortu-due-';

function nextDueDate(dueDay: number, offsetDays = 0): Date {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  let candidate = new Date(y, m, dueDay, 9, 0, 0, 0);
  // reminder fire date = due date minus offsetDays
  candidate = new Date(candidate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  if (candidate.getTime() <= now.getTime()) {
    // next month
    candidate = new Date(y, m + 1, dueDay, 9, 0, 0, 0);
    candidate = new Date(candidate.getTime() - offsetDays * 24 * 60 * 60 * 1000);
  }
  return candidate;
}

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function cancelAllDueReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

/** Jadwalkan reminder H-3 dan H-1 untuk tiap kantong yang punya jatuh tempo. */
export async function syncDueReminders(pockets: Pocket[]): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelAllDueReminders();

  const withDue = pockets.filter((p) => p.dueDay != null && p.dueDay >= 1 && p.dueDay <= 28);
  if (withDue.length === 0) return;

  const granted = await requestReminderPermission();
  if (!granted) return;

  for (const pocket of withDue) {
    const dueDay = pocket.dueDay!;
    for (const offset of [3, 1] as const) {
      const when = nextDueDate(dueDay, offset);
      if (when.getTime() <= Date.now()) continue;

      const label =
        offset === 3
          ? `H-3: ${pocket.emoji} ${pocket.name} jatuh tempo tgl ${dueDay}`
          : `H-1: ${pocket.emoji} ${pocket.name} jatuh tempo besok (tgl ${dueDay})`;

      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${pocket.id}-h${offset}`,
        content: {
          title: 'Sortu — pengingat kantong',
          body: label,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
        },
      });
    }
  }
}

/** Kantong yang jatuh tempo dalam N hari (untuk banner di web / home). */
export function upcomingDuePockets(
  pockets: Pocket[],
  withinDays = 3,
): { pocket: Pocket; daysLeft: number }[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const result: { pocket: Pocket; daysLeft: number }[] = [];

  for (const pocket of pockets) {
    if (pocket.dueDay == null) continue;

    const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), pocket.dueDay);
    dueThisMonth.setHours(0, 0, 0, 0);

    let daysLeft = Math.round(
      (dueThisMonth.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
    );

    // Sudah lewat bulan ini → hitung ke due bulan depan, tapi tandai overdue sebagai 0
    // agar tetap muncul di banner kalau withinDays mencakup hari ini.
    if (daysLeft < 0) {
      // Tampilkan sebagai jatuh tempo hari ini (terlewat) bila |daysLeft| kecil,
      // atau hitung next month jika sudah jauh.
      if (daysLeft >= -3) {
        daysLeft = 0; // perlakukan sebagai "hari ini / terlambat"
      } else {
        const dueNext = new Date(today.getFullYear(), today.getMonth() + 1, pocket.dueDay);
        dueNext.setHours(0, 0, 0, 0);
        daysLeft = Math.round(
          (dueNext.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
        );
      }
    }

    if (daysLeft <= withinDays) {
      result.push({ pocket, daysLeft: Math.max(0, daysLeft) });
    }
  }

  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}
