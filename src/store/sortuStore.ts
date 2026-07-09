import { create } from 'zustand';

import { MoneyEvent, Pocket, CreatePocketInput, UpdatePocketInput } from '@/domain/entities/Pocket';
import { createId } from '@/lib/format';
import {
  emptyLedger,
  LedgerSnapshot,
  ledgerHasData,
} from '@/infrastructure/storage/ledgerStorage';

type SortuState = {
  scopeId: string;
  unallocated: number;
  pockets: Pocket[];
  events: MoneyEvent[];
  remindersEnabled: boolean;
  /** Scope ledger sudah diload dari disk. */
  isHydrated: boolean;
  /** Pull cloud awal selesai (atau tidak perlu sync). */
  syncReady: boolean;
  syncMessage: string | null;
  /** Increment untuk paksa ulang pull cloud. */
  syncRetryNonce: number;
  setScopeMeta: (scopeId: string, hydrated: boolean) => void;
  setSyncReady: (ready: boolean, message?: string | null) => void;
  requestSyncRetry: () => void;
  setRemindersEnabled: (v: boolean) => void;
  touchUpdatedAt: () => void;
  addIncome: (amount: number, note?: string) => void;
  allocate: (pocketId: string, amount: number) => { ok: true } | { ok: false; error: string };
  transfer: (
    fromPocketId: string,
    toPocketId: string,
    amount: number,
  ) => { ok: true } | { ok: false; error: string };
  markPaid: (
    pocketId: string,
    amount?: number,
    note?: string,
  ) => { ok: true } | { ok: false; error: string };
  addPocket: (input: CreatePocketInput) => Pocket;
  updatePocket: (input: UpdatePocketInput) => { ok: true } | { ok: false; error: string };
  deletePocket: (id: string) => { ok: true } | { ok: false; error: string };
  eventsForPocket: (pocketId: string) => MoneyEvent[];
  replaceLedger: (data: LedgerSnapshot) => void;
  resetLedger: () => void;
  getSnapshot: () => LedgerSnapshot;
  hasLocalData: () => boolean;
  updatedAt: string;
};

function nowIso() {
  return new Date().toISOString();
}

export const useSortuStore = create<SortuState>((set, get) => ({
  scopeId: 'pending',
  unallocated: 0,
  pockets: [],
  events: [],
  remindersEnabled: true,
  updatedAt: new Date(0).toISOString(),
  isHydrated: false,
  syncReady: false,
  syncMessage: null,
  syncRetryNonce: 0,

  setScopeMeta: (scopeId, hydrated) => set({ scopeId, isHydrated: hydrated }),
  setSyncReady: (syncReady, syncMessage = null) => set({ syncReady, syncMessage }),
  requestSyncRetry: () =>
    set((s) => ({
      syncRetryNonce: s.syncRetryNonce + 1,
      syncReady: false,
      syncMessage: 'Menyinkronkan…',
    })),
  setRemindersEnabled: (remindersEnabled) =>
    set({ remindersEnabled, updatedAt: nowIso() }),
  touchUpdatedAt: () => set({ updatedAt: nowIso() }),

  addIncome: (amount, note) => {
    if (!Number.isFinite(amount) || amount <= 0) return;
    const event: MoneyEvent = {
      id: createId(),
      type: 'income',
      amount,
      pocketId: null,
      note: note?.trim() || 'Pemasukan',
      createdAt: nowIso(),
    };
    set((s) => ({
      unallocated: s.unallocated + amount,
      events: [event, ...s.events],
      updatedAt: nowIso(),
    }));
  },

  allocate: (pocketId, amount) => {
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Nominal tidak valid' };
    }
    const { unallocated, pockets } = get();
    if (amount > unallocated) {
      return { ok: false, error: 'Saldo belum dialokasi tidak cukup' };
    }
    const pocket = pockets.find((p) => p.id === pocketId);
    if (!pocket) return { ok: false, error: 'Kantong tidak ditemukan' };

    const event: MoneyEvent = {
      id: createId(),
      type: 'allocation',
      amount,
      pocketId,
      note: `Alokasi ke ${pocket.name}`,
      createdAt: nowIso(),
    };

    set({
      unallocated: unallocated - amount,
      pockets: pockets.map((p) =>
        p.id === pocketId
          ? { ...p, currentAmount: p.currentAmount + amount, updatedAt: nowIso() }
          : p,
      ),
      events: [event, ...get().events],
      updatedAt: nowIso(),
    });
    return { ok: true };
  },

  transfer: (fromPocketId, toPocketId, amount) => {
    if (fromPocketId === toPocketId) {
      return { ok: false, error: 'Pilih kantong yang berbeda' };
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return { ok: false, error: 'Nominal tidak valid' };
    }
    const { pockets } = get();
    const from = pockets.find((p) => p.id === fromPocketId);
    const to = pockets.find((p) => p.id === toPocketId);
    if (!from || !to) return { ok: false, error: 'Kantong tidak ditemukan' };
    if (amount > from.currentAmount) {
      return { ok: false, error: 'Saldo kantong sumber tidak cukup' };
    }

    const event: MoneyEvent = {
      id: createId(),
      type: 'transfer',
      amount,
      pocketId: fromPocketId,
      toPocketId,
      note: `${from.name} → ${to.name}`,
      createdAt: nowIso(),
    };

    set({
      pockets: pockets.map((p) => {
        if (p.id === fromPocketId) {
          return { ...p, currentAmount: p.currentAmount - amount, updatedAt: nowIso() };
        }
        if (p.id === toPocketId) {
          return { ...p, currentAmount: p.currentAmount + amount, updatedAt: nowIso() };
        }
        return p;
      }),
      events: [event, ...get().events],
      updatedAt: nowIso(),
    });
    return { ok: true };
  },

  markPaid: (pocketId, amount, note) => {
    const pocket = get().pockets.find((p) => p.id === pocketId);
    if (!pocket) return { ok: false, error: 'Kantong tidak ditemukan' };
    const payAmount = amount ?? pocket.currentAmount;
    if (!Number.isFinite(payAmount) || payAmount <= 0) {
      return { ok: false, error: 'Tidak ada saldo untuk dibayar' };
    }
    if (payAmount > pocket.currentAmount) {
      return { ok: false, error: 'Saldo kantong tidak cukup' };
    }

    const event: MoneyEvent = {
      id: createId(),
      type: 'payment',
      amount: payAmount,
      pocketId,
      note: note?.trim() || `Bayar ${pocket.name}`,
      createdAt: nowIso(),
    };

    set({
      pockets: get().pockets.map((p) =>
        p.id === pocketId
          ? { ...p, currentAmount: p.currentAmount - payAmount, updatedAt: nowIso() }
          : p,
      ),
      events: [event, ...get().events],
      updatedAt: nowIso(),
    });
    return { ok: true };
  },

  addPocket: (input) => {
    const pocket: Pocket = {
      id: createId(),
      name: input.name.trim(),
      emoji: input.emoji,
      currentAmount: 0,
      targetAmount: Math.max(0, input.targetAmount),
      dueDay: input.dueDay,
      note: input.note?.trim() || undefined,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };
    set((s) => ({
      pockets: [pocket, ...s.pockets],
      updatedAt: nowIso(),
    }));
    return pocket;
  },

  updatePocket: (input) => {
    const exists = get().pockets.some((p) => p.id === input.id);
    if (!exists) return { ok: false, error: 'Kantong tidak ditemukan' };
    set({
      pockets: get().pockets.map((p) =>
        p.id === input.id
          ? {
              ...p,
              name: input.name?.trim() ?? p.name,
              emoji: input.emoji ?? p.emoji,
              targetAmount:
                input.targetAmount !== undefined
                  ? Math.max(0, input.targetAmount)
                  : p.targetAmount,
              dueDay: input.dueDay !== undefined ? input.dueDay : p.dueDay,
              note: input.note !== undefined ? input.note.trim() || undefined : p.note,
              updatedAt: nowIso(),
            }
          : p,
      ),
      updatedAt: nowIso(),
    });
    return { ok: true };
  },

  deletePocket: (id) => {
    const pocket = get().pockets.find((p) => p.id === id);
    if (!pocket) return { ok: false, error: 'Kantong tidak ditemukan' };
    set((s) => ({
      unallocated: s.unallocated + pocket.currentAmount,
      pockets: s.pockets.filter((p) => p.id !== id),
      events: [
        ...(pocket.currentAmount > 0
          ? [
              {
                id: createId(),
                type: 'transfer' as const,
                amount: pocket.currentAmount,
                pocketId: id,
                toPocketId: null,
                note: `Hapus ${pocket.name} — saldo dikembalikan`,
                createdAt: nowIso(),
              },
            ]
          : []),
        ...s.events,
      ],
      updatedAt: nowIso(),
    }));
    return { ok: true };
  },

  eventsForPocket: (pocketId) =>
    get().events.filter((e) => e.pocketId === pocketId || e.toPocketId === pocketId),

  replaceLedger: (data) =>
    set({
      unallocated: data.unallocated,
      pockets: data.pockets,
      events: data.events,
      remindersEnabled: data.remindersEnabled,
      updatedAt: data.updatedAt || nowIso(),
    }),

  resetLedger: () => set({ ...emptyLedger(), isHydrated: false, syncReady: false }),

  getSnapshot: () => {
    const s = get();
    return {
      unallocated: s.unallocated,
      pockets: s.pockets,
      events: s.events,
      remindersEnabled: s.remindersEnabled,
      updatedAt: s.updatedAt,
    };
  },

  hasLocalData: () => ledgerHasData(get()),
}));
