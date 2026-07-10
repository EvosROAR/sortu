import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { ActivityAction, startActivityAsync } from 'expo-intent-launcher';
import * as Notifications from 'expo-notifications';

import { MoneyEvent, Pocket } from '@/domain/entities/Pocket';
import {
  clearDueReminderFiredToday,
  getReminderSyncFingerprint,
  markDueReminderFiredToday,
  setReminderSyncFingerprint,
  wasDueReminderFiredToday,
} from '@/infrastructure/storage/dueReminderFiredStorage';

const CHANNEL_ID = 'sortu-due-reminders';
const PREFIX = 'sortu-due-';
const OFFSETS = [3, 1, 0] as const;
export type DueReminderOffset = (typeof OFFSETS)[number];

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function atNineAm(day: Date): Date {
  const d = new Date(day);
  d.setHours(9, 0, 0, 0);
  return d;
}

function nearestDueDate(dueDay: number, from = new Date()): Date {
  const today = startOfDay(from);
  let due = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (due < today) {
    due = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }
  return due;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Tanggal jatuh tempo yang sedang aktif (termasuk grace H+0…H+3). */
export function activeDueDate(dueDay: number, from = new Date()): Date {
  const today = startOfDay(from);
  const dueThisMonth = startOfDay(new Date(today.getFullYear(), today.getMonth(), dueDay));
  const daysLeft = Math.round((dueThisMonth.getTime() - today.getTime()) / DAY_MS);

  if (daysLeft < 0) {
    if (daysLeft >= -3) return dueThisMonth;
    return startOfDay(new Date(today.getFullYear(), today.getMonth() + 1, dueDay));
  }
  return dueThisMonth;
}

export function formatDueDateOnly(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseDueDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return startOfDay(new Date(value));
  return startOfDay(new Date(y, m - 1, d));
}

/** True kalau kantong sudah dilunasi untuk siklus jatuh tempo aktif. */
export function isPocketDueSettled(pocket: Pocket, from = new Date()): boolean {
  if (pocket.dueDay == null || !pocket.paidThroughDue) return false;
  const active = activeDueDate(pocket.dueDay, from);
  const paid = parseDueDateOnly(pocket.paidThroughDue);
  return paid.getTime() >= active.getTime();
}

/**
 * Isi paidThroughDue dari riwayat payment (untuk data lama sebelum field ini ada).
 */
export function backfillPaidThroughDue(pockets: Pocket[], events: MoneyEvent[]): Pocket[] {
  return pockets.map((pocket) => {
    if (pocket.dueDay == null || pocket.paidThroughDue) return pocket;

    const active = activeDueDate(pocket.dueDay);
    const windowStart = new Date(active);
    windowStart.setDate(windowStart.getDate() - 14);
    const windowEnd = new Date(active);
    windowEnd.setDate(windowEnd.getDate() + 3);

    const hasPayment = events.some((e) => {
      if (e.type !== 'payment' || e.pocketId !== pocket.id) return false;
      const day = startOfDay(new Date(e.createdAt));
      return (
        day.getTime() >= startOfDay(windowStart).getTime() &&
        day.getTime() <= startOfDay(windowEnd).getTime()
      );
    });

    if (!hasPayment) return pocket;
    return { ...pocket, paidThroughDue: formatDueDateOnly(active) };
  });
}

/** Sisa hari sampai jatuh tempo (0 = hari H). */
export function daysUntilDue(dueDay: number, from = new Date()): number {
  const today = startOfDay(from);
  const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), dueDay);
  let daysLeft = Math.round(
    (startOfDay(dueThisMonth).getTime() - today.getTime()) / DAY_MS,
  );

  if (daysLeft < 0) {
    if (daysLeft >= -3) {
      daysLeft = 0;
    } else {
      const dueNext = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
      daysLeft = Math.round(
        (startOfDay(dueNext).getTime() - today.getTime()) / DAY_MS,
      );
    }
  }

  return Math.max(0, daysLeft);
}

function offsetForDaysLeft(daysLeft: number): DueReminderOffset | null {
  if (daysLeft === 3) return 3;
  if (daysLeft === 1) return 1;
  if (daysLeft === 0) return 0;
  return null;
}

/** Jam 09:00 di hari pengingat H-X — hanya kalau masih di masa depan. */
function futureNineAm(dueDay: number, offset: DueReminderOffset, now = new Date()): Date | null {
  const due = nearestDueDate(dueDay, now);
  const reminderDay = new Date(due);
  reminderDay.setDate(reminderDay.getDate() - offset);
  const when = atNineAm(reminderDay);
  return when.getTime() > now.getTime() ? when : null;
}

function isPastNineAm(now = new Date()): boolean {
  return now.getTime() >= atNineAm(startOfDay(now)).getTime();
}

function reminderLabel(pocket: Pocket, offset: number, dueDay: number): string {
  if (offset === 0) {
    return `Hari ini: ${pocket.emoji} ${pocket.name} jatuh tempo (tgl ${dueDay})`;
  }
  if (offset === 1) {
    return `H-1: ${pocket.emoji} ${pocket.name} jatuh tempo besok (tgl ${dueDay})`;
  }
  return `H-3: ${pocket.emoji} ${pocket.name} jatuh tempo tgl ${dueDay}`;
}

function notificationContent(pocket: Pocket, offset: number, dueDay: number) {
  return {
    title: 'Sortu — pengingat kantong',
    body: reminderLabel(pocket, offset, dueDay),
    ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
  };
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Pengingat jatuh tempo',
    description: 'Notifikasi H-3, H-1, dan hari jatuh tempo kantong',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 220, 180, 220],
    enableVibrate: true,
  });
}

export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
    android: {},
  });
  return status === 'granted';
}

export async function requestExactAlarmPermissionIfNeeded(): Promise<void> {
  if (Platform.OS !== 'android' || Platform.Version < 31) return;

  const packageName = Application.applicationId ?? 'com.sortu.app';
  try {
    await startActivityAsync(ActivityAction.REQUEST_SCHEDULE_EXACT_ALARM, {
      data: `package:${packageName}`,
    });
  } catch {
    await Linking.openSettings();
  }
}

async function ensureReminderReady(): Promise<boolean> {
  const granted = await requestReminderPermission();
  if (!granted) return false;
  await ensureAndroidChannel();
  return true;
}

async function cancelScheduledDueReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(PREFIX))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
}

export async function cancelAllDueReminders(): Promise<void> {
  await cancelScheduledDueReminders();
  await clearDueReminderFiredToday();
  await setReminderSyncFingerprint('');
}

function parseReminderIdentifier(id: string): { pocketId: string; offset: number } | null {
  if (!id.startsWith(PREFIX)) return null;
  const rest = id.slice(PREFIX.length);
  const base = rest.endsWith('-catchup') ? rest.slice(0, -'-catchup'.length) : rest;
  const hIdx = base.lastIndexOf('-h');
  if (hIdx < 0) return null;
  const offset = Number(base.slice(hIdx + 2));
  const pocketId = base.slice(0, hIdx);
  if (!pocketId || Number.isNaN(offset)) return null;
  return { pocketId, offset };
}

export function registerDueReminderDeliveryListener(): () => void {
  if (Platform.OS === 'web') return () => undefined;

  const sub = Notifications.addNotificationReceivedListener((notification) => {
    const id = notification.request.identifier;
    if (!id) return;
    const parsed = parseReminderIdentifier(id);
    if (!parsed) return;
    void markDueReminderFiredToday(parsed.pocketId, parsed.offset);
  });

  return () => sub.remove();
}

/**
 * Jadwalkan alarm jam 09:00 untuk H-3 / H-1 / H.
 * Dipanggil saat toggle nyala atau tanggal jatuh tempo berubah — BUKAN tiap buka app.
 */
export async function scheduleDueReminders(pockets: Pocket[]): Promise<void> {
  if (Platform.OS === 'web') return;

  await cancelScheduledDueReminders();

  const withDue = pockets.filter(
    (p) =>
      p.dueDay != null &&
      p.dueDay >= 1 &&
      p.dueDay <= 28 &&
      !isPocketDueSettled(p),
  );
  if (withDue.length === 0) {
    await setReminderSyncFingerprint(dueReminderFingerprint(pockets));
    return;
  }

  if (!(await ensureReminderReady())) return;

  const now = new Date();

  for (const pocket of withDue) {
    const dueDay = pocket.dueDay!;

    for (const offset of OFFSETS) {
      const when = futureNineAm(dueDay, offset, now);
      if (!when) continue;

      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${pocket.id}-h${offset}`,
        content: notificationContent(pocket, offset, dueDay),
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: when,
          ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
        },
      });
    }
  }

  await setReminderSyncFingerprint(dueReminderFingerprint(pockets));
}

/**
 * Catch-up: sudah lewat jam 09:00 di hari H-X tapi belum dapat notif.
 * Tidak membatalkan jadwal — aman dipanggil saat buka app / swipe balik.
 */
export async function runDueReminderCatchUp(pockets: Pocket[]): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!(await ensureReminderReady())) return;

  const now = new Date();
  if (!isPastNineAm(now)) return;

  const withDue = pockets.filter(
    (p) =>
      p.dueDay != null &&
      p.dueDay >= 1 &&
      p.dueDay <= 28 &&
      !isPocketDueSettled(p, now),
  );

  for (const pocket of withDue) {
    const dueDay = pocket.dueDay!;
    const offset = offsetForDaysLeft(daysUntilDue(dueDay, now));
    if (offset === null) continue;
    if (await wasDueReminderFiredToday(pocket.id, offset)) continue;

    await Notifications.scheduleNotificationAsync({
      identifier: `${PREFIX}${pocket.id}-h${offset}-catchup`,
      content: notificationContent(pocket, offset, dueDay),
      trigger: null,
    });
    await markDueReminderFiredToday(pocket.id, offset);
  }
}

export function dueReminderFingerprint(pockets: Pocket[]): string {
  return pockets
    .filter((p) => p.dueDay != null && p.dueDay >= 1 && p.dueDay <= 28)
    .map((p) => `${p.id}:${p.dueDay}:${p.paidThroughDue ?? ''}`)
    .sort()
    .join('|');
}

export async function syncDueRemindersIfNeeded(
  pockets: Pocket[],
  force = false,
): Promise<void> {
  const fp = dueReminderFingerprint(pockets);
  const lastFp = await getReminderSyncFingerprint();
  if (force || lastFp !== fp) {
    await scheduleDueReminders(pockets);
  }
}

export function upcomingDuePockets(
  pockets: Pocket[],
  withinDays = 3,
): { pocket: Pocket; daysLeft: number }[] {
  const result: { pocket: Pocket; daysLeft: number }[] = [];

  for (const pocket of pockets) {
    if (pocket.dueDay == null) continue;
    if (isPocketDueSettled(pocket)) continue;
    const daysLeft = daysUntilDue(pocket.dueDay);
    if (daysLeft <= withinDays) {
      result.push({ pocket, daysLeft });
    }
  }

  return result.sort((a, b) => a.daysLeft - b.daysLeft);
}
