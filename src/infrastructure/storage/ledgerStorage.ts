import AsyncStorage from '@react-native-async-storage/async-storage';

import { MoneyEvent, Pocket } from '@/domain/entities/Pocket';

export type LedgerSnapshot = {
  unallocated: number;
  pockets: Pocket[];
  events: MoneyEvent[];
  remindersEnabled: boolean;
  updatedAt: string;
};

const LEGACY_KEY = 'sortu-v1';
const PREFIX = 'sortu-ledger:';

export function ledgerScopeId(uid: string | null, guestMode: boolean): string {
  if (uid) return `uid:${uid}`;
  if (guestMode) return 'guest';
  return 'pending';
}

export function storageKeyForScope(scope: string): string {
  return `${PREFIX}${scope}`;
}

export function emptyLedger(): LedgerSnapshot {
  return {
    unallocated: 0,
    pockets: [],
    events: [],
    remindersEnabled: true,
    updatedAt: new Date(0).toISOString(),
  };
}

export function ledgerHasData(data: Pick<LedgerSnapshot, 'unallocated' | 'pockets' | 'events'>): boolean {
  return data.pockets.length > 0 || data.events.length > 0 || data.unallocated > 0;
}

export function ledgerFingerprint(data: Pick<LedgerSnapshot, 'unallocated' | 'pockets' | 'events' | 'remindersEnabled'>): string {
  return JSON.stringify({
    unallocated: data.unallocated,
    remindersEnabled: data.remindersEnabled,
    pockets: data.pockets,
    events: data.events,
  });
}

/** Parse zustand-persist blob or raw snapshot. */
function parseStored(raw: string | null): LedgerSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    // zustand persist shape: { state: {...}, version }
    const state =
      parsed &&
      typeof parsed === 'object' &&
      'state' in parsed &&
      (parsed as { state: unknown }).state &&
      typeof (parsed as { state: unknown }).state === 'object'
        ? ((parsed as { state: Record<string, unknown> }).state)
        : (parsed as Record<string, unknown>);

    return {
      unallocated: Number(state.unallocated) || 0,
      pockets: Array.isArray(state.pockets) ? (state.pockets as Pocket[]) : [],
      events: Array.isArray(state.events) ? (state.events as MoneyEvent[]) : [],
      remindersEnabled: state.remindersEnabled !== false,
      updatedAt:
        typeof state.updatedAt === 'string' ? state.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function loadLedger(scope: string): Promise<LedgerSnapshot> {
  if (scope === 'pending') return emptyLedger();

  const key = storageKeyForScope(scope);
  let raw = await AsyncStorage.getItem(key);

  // Migrasi sekali dari storage lama (sortu-v1) → guest
  if (!raw && scope === 'guest') {
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const migrated = parseStored(legacy);
      if (migrated) {
        await saveLedger(scope, migrated);
        await AsyncStorage.removeItem(LEGACY_KEY);
        return migrated;
      }
    }
  }

  return parseStored(raw) ?? emptyLedger();
}

export async function saveLedger(scope: string, data: LedgerSnapshot): Promise<void> {
  if (scope === 'pending') return;
  const payload: LedgerSnapshot = {
    ...data,
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
  await AsyncStorage.setItem(storageKeyForScope(scope), JSON.stringify(payload));
}
