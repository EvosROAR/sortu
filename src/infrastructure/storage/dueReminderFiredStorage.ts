import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = 'sortu-due-fired:';

function dayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export async function wasDueReminderFiredToday(
  pocketId: string,
  offset: number,
): Promise<boolean> {
  const key = `${PREFIX}${pocketId}-h${offset}:${dayKey()}`;
  return (await AsyncStorage.getItem(key)) === '1';
}

export async function markDueReminderFiredToday(
  pocketId: string,
  offset: number,
): Promise<void> {
  const key = `${PREFIX}${pocketId}-h${offset}:${dayKey()}`;
  await AsyncStorage.setItem(key, '1');
}

/** Reset penanda hari ini — dipanggil saat toggle pengingat dimatikan. */
export async function clearDueReminderFiredToday(): Promise<void> {
  const today = dayKey();
  const keys = await AsyncStorage.getAllKeys();
  const toRemove = keys.filter((k) => k.startsWith(PREFIX) && k.endsWith(`:${today}`));
  if (toRemove.length > 0) {
    await AsyncStorage.multiRemove(toRemove);
  }
}

const SYNC_FP_KEY = 'sortu-reminder-sync-fp';

export async function getReminderSyncFingerprint(): Promise<string | null> {
  return AsyncStorage.getItem(SYNC_FP_KEY);
}

export async function setReminderSyncFingerprint(fp: string): Promise<void> {
  if (!fp) {
    await AsyncStorage.removeItem(SYNC_FP_KEY);
    return;
  }
  await AsyncStorage.setItem(SYNC_FP_KEY, fp);
}
