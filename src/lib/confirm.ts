import { create } from 'zustand';

export type DialogButton = {
  label: string;
  role?: 'cancel' | 'confirm' | 'danger';
  onPress?: () => void;
};

type DialogState = {
  visible: boolean;
  title: string;
  message?: string;
  buttons: DialogButton[];
  show: (payload: {
    title: string;
    message?: string;
    buttons?: DialogButton[];
  }) => void;
  hide: () => void;
};

export const useDialogStore = create<DialogState>((set) => ({
  visible: false,
  title: '',
  message: undefined,
  buttons: [],
  show: ({ title, message, buttons }) =>
    set({
      visible: true,
      title,
      message,
      buttons: buttons?.length
        ? buttons
        : [{ label: 'OK', role: 'confirm' }],
    }),
  hide: () => set({ visible: false, title: '', message: undefined, buttons: [] }),
}));

export function confirmAction(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'OK',
) {
  useDialogStore.getState().show({
    title,
    message,
    buttons: [
      { label: 'Batal', role: 'cancel' },
      {
        label: confirmLabel,
        role: confirmLabel.toLowerCase().includes('hapus') ? 'danger' : 'confirm',
        onPress: onConfirm,
      },
    ],
  });
}

/** Dialog dengan 2 aksi + batal (untuk konflik sync). */
export function chooseAction(
  title: string,
  message: string,
  options: {
    primaryLabel: string;
    onPrimary: () => void;
    secondaryLabel: string;
    onSecondary: () => void;
    cancelLabel?: string;
    onCancel?: () => void;
  },
) {
  useDialogStore.getState().show({
    title,
    message,
    buttons: [
      {
        label: options.cancelLabel ?? 'Batal',
        role: 'cancel',
        onPress: options.onCancel,
      },
      {
        label: options.secondaryLabel,
        role: 'cancel',
        onPress: options.onSecondary,
      },
      {
        label: options.primaryLabel,
        role: 'confirm',
        onPress: options.onPrimary,
      },
    ],
  });
}

export function showMessage(title: string, message?: string) {
  useDialogStore.getState().show({
    title,
    message,
    buttons: [{ label: 'OK', role: 'confirm' }],
  });
}

export function digitsOnly(raw: string): string {
  return raw.replace(/[^\d]/g, '');
}

/** Format ribuan gaya ID: 10000 → "10.000" (hanya angka yang diterima). */
export function formatAmountInput(raw: string): string {
  const digits = digitsOnly(raw);
  if (!digits) return '';
  // hindari leading zeros berlebih kecuali "0"
  const normalized = digits.replace(/^0+(?=\d)/, '');
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseAmountInput(raw: string): number {
  const cleaned = digitsOnly(raw);
  if (!cleaned) return NaN;
  return Number(cleaned);
}
