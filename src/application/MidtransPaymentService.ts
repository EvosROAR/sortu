import { Platform } from 'react-native';

import {
  getMidtransApiUrl,
  getMidtransClientKey,
  isMidtransConfigured,
  MIDTRANS_SNAP_SCRIPT_URL,
} from '@/infrastructure/midtrans/midtransConfig';
import { isFirebaseConfigured } from '@/infrastructure/firebase/config';
import { authService } from '@/infrastructure/firebase/authService';

export type SnapPayResult =
  | { status: 'success'; orderId: string; raw: unknown }
  | { status: 'pending'; orderId: string; raw: unknown }
  | { status: 'error'; message: string; raw?: unknown }
  | { status: 'close' };

type SnapCallbacks = {
  onSuccess?: (result: unknown) => void;
  onPending?: (result: unknown) => void;
  onError?: (result: unknown) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, options: SnapCallbacks) => void;
    };
  }
}

let snapScriptPromise: Promise<void> | null = null;

function loadSnapScript(): Promise<void> {
  if (Platform.OS !== 'web') {
    return Promise.reject(new Error('Snap script hanya untuk web.'));
  }
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window tidak tersedia.'));
  }
  if (window.snap) return Promise.resolve();

  if (!snapScriptPromise) {
    snapScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${MIDTRANS_SNAP_SCRIPT_URL}"]`,
      );
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Gagal memuat Midtrans Snap.')));
        if (window.snap) resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = MIDTRANS_SNAP_SCRIPT_URL;
      script.setAttribute('data-client-key', getMidtransClientKey());
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Gagal memuat Midtrans Snap.'));
      document.body.appendChild(script);
    });
  }

  return snapScriptPromise;
}

export type CreateSnapResult = {
  snapToken: string;
  orderId: string;
};

export async function createSnapTransaction(input: {
  pocketId: string;
  pocketName: string;
  amount: number;
}): Promise<CreateSnapResult> {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase belum dikonfigurasi.');
  }
  if (!isMidtransConfigured()) {
    throw new Error(
      'Midtrans belum dikonfigurasi. Isi EXPO_PUBLIC_MIDTRANS_CLIENT_KEY dan EXPO_PUBLIC_MIDTRANS_API_URL di .env',
    );
  }

  const idToken = await authService.getIdToken();
  if (!idToken) {
    throw new Error('Login dulu untuk bayar via Midtrans.');
  }

  const response = await fetch(`${getMidtransApiUrl()}/api/create-snap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(input),
  });

  const data = (await response.json()) as {
    snapToken?: string;
    orderId?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error ?? 'Gagal membuat transaksi Midtrans.');
  }
  if (!data.snapToken || !data.orderId) {
    throw new Error('Respons Midtrans tidak valid.');
  }

  return { snapToken: data.snapToken, orderId: data.orderId };
}

function extractOrderId(raw: unknown, fallback: string): string {
  if (raw && typeof raw === 'object' && 'order_id' in raw) {
    const id = (raw as { order_id?: unknown }).order_id;
    if (typeof id === 'string' && id.trim()) return id;
  }
  return fallback;
}

export async function openSnapOnWeb(
  snapToken: string,
  orderId: string,
): Promise<SnapPayResult> {
  await loadSnapScript();
  if (!window.snap) {
    throw new Error('Midtrans Snap belum siap.');
  }

  return new Promise((resolve) => {
    window.snap!.pay(snapToken, {
      onSuccess: (result) => {
        resolve({
          status: 'success',
          orderId: extractOrderId(result, orderId),
          raw: result,
        });
      },
      onPending: (result) => {
        resolve({
          status: 'pending',
          orderId: extractOrderId(result, orderId),
          raw: result,
        });
      },
      onError: (result) => {
        resolve({
          status: 'error',
          message: 'Pembayaran gagal atau dibatalkan.',
          raw: result,
        });
      },
      onClose: () => {
        resolve({ status: 'close' });
      },
    });
  });
}

export function buildSnapWebViewHtml(snapToken: string, clientKey: string): string {
  const safeToken = snapToken.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeKey = clientKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    body { margin: 0; background: #0f1419; color: #e8eaed; font-family: system-ui, sans-serif; }
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; text-align: center; }
  </style>
</head>
<body>
  <div class="wrap">Membuka halaman bayar Midtrans…</div>
  <script src="${MIDTRANS_SNAP_SCRIPT_URL}" data-client-key="${safeKey}"></script>
  <script>
    function post(payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }
    }
    function startPay() {
      if (!window.snap) {
        post({ type: 'error', message: 'Snap belum dimuat' });
        return;
      }
      window.snap.pay('${safeToken}', {
        onSuccess: function(result) { post({ type: 'success', result: result }); },
        onPending: function(result) { post({ type: 'pending', result: result }); },
        onError: function(result) { post({ type: 'error', result: result }); },
        onClose: function() { post({ type: 'close' }); }
      });
    }
    if (document.readyState === 'complete') {
      setTimeout(startPay, 300);
    } else {
      window.addEventListener('load', function() { setTimeout(startPay, 300); });
    }
  </script>
</body>
</html>`;
}

export function parseSnapWebViewMessage(
  raw: string,
  fallbackOrderId: string,
): SnapPayResult {
  try {
    const parsed = JSON.parse(raw) as {
      type?: string;
      message?: string;
      result?: unknown;
    };

    switch (parsed.type) {
      case 'success':
        return {
          status: 'success',
          orderId: extractOrderId(parsed.result, fallbackOrderId),
          raw: parsed.result,
        };
      case 'pending':
        return {
          status: 'pending',
          orderId: extractOrderId(parsed.result, fallbackOrderId),
          raw: parsed.result,
        };
      case 'error':
        return {
          status: 'error',
          message: parsed.message ?? 'Pembayaran gagal.',
          raw: parsed.result,
        };
      case 'close':
        return { status: 'close' };
      default:
        return { status: 'error', message: 'Respons Snap tidak dikenali.' };
    }
  } catch {
    return { status: 'error', message: 'Respons Snap tidak valid.' };
  }
}
