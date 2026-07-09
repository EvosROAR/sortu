import { MoneyEvent } from '@/domain/entities/Pocket';

export const ALL_MONTHS = 'all';
export const ALL_POCKETS = 'all';
export const UNALLOCATED = 'unallocated';

export type MonthOption = {
  key: string;
  label: string;
};

export type PocketFilterOption = {
  key: string;
  label: string;
  emoji?: string;
};

export function monthKeyFromDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(key: string): string {
  const [y, m] = key.split('-').map(Number);
  if (!y || !m) return key;
  const d = new Date(y, m - 1, 1);
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
}

export function buildMonthOptions(events: MoneyEvent[]): MonthOption[] {
  const keys = [...new Set(events.map((e) => monthKeyFromDate(e.createdAt)))].sort((a, b) =>
    b.localeCompare(a),
  );
  return keys.map((key) => ({ key, label: formatMonthLabel(key) }));
}

export function buildPocketFilterOptions(
  pockets: { id: string; name: string; emoji: string }[],
): PocketFilterOption[] {
  return [
    { key: ALL_POCKETS, label: 'Semua kantong' },
    { key: UNALLOCATED, label: 'Pemasukan', emoji: '💰' },
    ...pockets.map((p) => ({ key: p.id, label: p.name, emoji: p.emoji })),
  ];
}

export function filterHistoryEvents(
  events: MoneyEvent[],
  monthKey: string,
  pocketKey: string,
): MoneyEvent[] {
  return events.filter((e) => {
    if (monthKey !== ALL_MONTHS && monthKeyFromDate(e.createdAt) !== monthKey) {
      return false;
    }

    if (pocketKey === ALL_POCKETS) return true;

    if (pocketKey === UNALLOCATED) {
      return e.type === 'income';
    }

    return e.pocketId === pocketKey || e.toPocketId === pocketKey;
  });
}
