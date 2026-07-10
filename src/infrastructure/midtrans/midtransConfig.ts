const clientKey = process.env.EXPO_PUBLIC_MIDTRANS_CLIENT_KEY?.trim() ?? '';
const apiBaseUrl = process.env.EXPO_PUBLIC_MIDTRANS_API_URL?.trim().replace(/\/$/, '') ?? '';

/** Sandbox Snap script (production pakai app.midtrans.com). */
export const MIDTRANS_SNAP_SCRIPT_URL =
  process.env.EXPO_PUBLIC_MIDTRANS_PRODUCTION === 'true'
    ? 'https://app.midtrans.com/snap/snap.js'
    : 'https://app.sandbox.midtrans.com/snap/snap.js';

export const isMidtransConfigured = (): boolean => Boolean(clientKey && apiBaseUrl);

export const getMidtransClientKey = (): string => clientKey;

export const getMidtransApiUrl = (): string => apiBaseUrl;

/** Midtrans Snap minimal charge (IDR). */
export const MIDTRANS_MIN_AMOUNT = 10_000;
