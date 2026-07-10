# Midtrans + Vercel API — Sortu

Backend payment pakai **Vercel** (gratis, tanpa Firebase Blaze / NPWP). Server Key **hanya** di Vercel.

Panduan deploy API: **`docs/VERCEL_SETUP.md`**

## Ringkas

### App (`.env`)

```env
EXPO_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
EXPO_PUBLIC_MIDTRANS_API_URL=https://sortu-api-xxx.vercel.app
```

### Vercel (Environment Variables)

| Nama | Isi |
|------|-----|
| `MIDTRANS_SERVER_KEY` | Server Key sandbox (`SB-Mid-server-...`) |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON service account Firebase (1 baris) |
| `MIDTRANS_PRODUCTION` | `false` (sandbox) |

### Webhook Midtrans Sandbox

**Settings → Configuration → Payment Notification URL**

```
https://sortu-api-xxx.vercel.app/api/midtrans-webhook
```

## Tes di app

1. Login (bukan guest)
2. Kantong saldo ≥ Rp10.000
3. Detail kantong → **Bayar via Midtrans (sandbox)**
4. Sukses → saldo turun + riwayat `Midtrans · order_...`

## Arsitektur

```
Sortu app (Client Key)
  → POST /api/create-snap + Firebase ID token
Vercel (Server Key + verify token)
  → Midtrans Snap
Midtrans → POST /api/midtrans-webhook
App onSuccess → markPaid
```

## Catatan keamanan

- Server Key **jangan** di `.env` Expo / GitHub
- Sandbox: ledger di-update lewat callback Snap (latihan)
- Production nanti: hardening webhook → update ledger server-side

## Alternatif: Firebase Functions

Folder `functions/` tetap ada kalau nanti upgrade Blaze. Untuk sekarang pakai **Vercel**.
