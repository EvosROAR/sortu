# Deploy API Midtrans ke Vercel

Gratis, tanpa kartu kredit / NPWP / Firebase Blaze.

## 1. Daftar Vercel

1. https://vercel.com → sign up (bisa pakai GitHub)
2. **Add New Project** → import repo **EvosROAR/sortu**
3. Framework: **Other** (kita cuma deploy folder `api/`, bukan Expo web)

## 2. Service Account Firebase

1. Firebase Console → **Project Settings** → **Service accounts**
2. **Generate new private key** → download JSON
3. Buka file JSON, **copy seluruh isi** (1 baris juga boleh)

## 3. Environment Variables di Vercel

Project Sortu → **Settings → Environment Variables**

| Key | Value | Environment |
|-----|-------|-------------|
| `MIDTRANS_SERVER_KEY` | `SB-Mid-server-...` dari dashboard sandbox | Production + Preview |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Paste isi file JSON service account | Production + Preview |
| `MIDTRANS_PRODUCTION` | `false` | Production + Preview |

**Jangan** commit JSON service account ke GitHub.

## 4. Deploy

Klik **Deploy** (atau push ke `main` kalau auto-deploy aktif).

Setelah selesai, catat URL project, misalnya:

```
https://sortu-api.vercel.app
```

Tes health (harus 401, bukan 404):

```
POST https://sortu-api.vercel.app/api/create-snap
```

## 5. Isi `.env` Sortu (lokal)

```env
EXPO_PUBLIC_MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxx
EXPO_PUBLIC_MIDTRANS_API_URL=https://sortu-api.vercel.app
```

Restart Metro:

```powershell
npx expo start -c
```

## 6. Webhook Midtrans

Dashboard **sandbox**: https://dashboard.sandbox.midtrans.com/settings/configuration

**Payment Notification URL:**

```
https://sortu-api.vercel.app/api/midtrans-webhook
```

Save.

## 7. GitHub Actions (web live)

Tambahkan secret di GitHub repo:

- `EXPO_PUBLIC_MIDTRANS_CLIENT_KEY`
- `EXPO_PUBLIC_MIDTRANS_API_URL`

Workflow deploy web sudah membaca keduanya.

## Troubleshooting

| Gejala | Solusi |
|--------|--------|
| `404` pada `/api/create-snap` | Redeploy Vercel; pastikan folder `api/` ada di repo |
| `401 Login dulu` | Normal kalau tes tanpa token; di app harus login |
| `FIREBASE_SERVICE_ACCOUNT_JSON belum diset` | Cek env Vercel, redeploy |
| `MIDTRANS_SERVER_KEY belum diset` | Cek env Vercel, redeploy |
| CORS error | API sudah set `Access-Control-Allow-Origin: *` |

## Keamanan

- Server Key hanya di Vercel
- Setiap request create-snap verifikasi **Firebase ID token**
- Service account JSON hanya di Vercel env

## Perpanjang kartu (oot)

Kalau nanti mau upgrade Firebase Blaze: bawa **KTP** + **kartu lama** (kalau masih ada) ke bank. Isi form, biasanya kartu baru jadi dalam 1–2 minggu.
