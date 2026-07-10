/** Pocket = amplop / kantong alokasi uang. */
export type Pocket = {
  id: string;
  name: string;
  emoji: string;
  /** Saldo terkumpul di kantong (IDR). */
  currentAmount: number;
  /** Target bulanan (IDR). */
  targetAmount: number;
  /** Hari jatuh tempo 1–28, atau null. */
  dueDay: number | null;
  /**
   * Tanggal jatuh tempo (YYYY-MM-DD) yang sudah dilunasi.
   * Banner/reminder disembunyikan sampai siklus berikutnya.
   */
  paidThroughDue?: string | null;
  note?: string;
  createdAt: string;
  updatedAt: string;
};

export type MoneyEventType = 'income' | 'allocation' | 'transfer' | 'payment';

/** Riwayat pergerakan uang (bukan bank transfer sungguhan di MVP). */
export type MoneyEvent = {
  id: string;
  type: MoneyEventType;
  amount: number;
  /** Kantong terkait; null = “belum dialokasi”. */
  pocketId: string | null;
  /** Untuk transfer: kantong tujuan. */
  toPocketId?: string | null;
  note?: string;
  createdAt: string;
};

export type CreatePocketInput = {
  name: string;
  emoji: string;
  targetAmount: number;
  dueDay: number | null;
  note?: string;
};

export type UpdatePocketInput = Partial<CreatePocketInput> & {
  id: string;
};
