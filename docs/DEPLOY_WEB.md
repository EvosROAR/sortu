# Deploy web Sortu (Firebase Hosting)

Sortu web di-build dengan `expo export` lalu di-host di **Firebase Hosting** (site terpisah dari money-tracker).

## URL live

Setelah deploy: **https://sortu-app.web.app** (atau `https://sortu-app.firebaseapp.com`)

## Setup sekali (manual)

### 1. Buat site Hosting di Firebase

```bash
cd D:\Projects\sortu
firebase hosting:sites:create sortu-app --project money-tracker-2396f
firebase target:apply hosting sortu sortu-app --project money-tracker-2396f
```

(Sudah dikonfigurasi di `.firebaserc` — cukup jalankan perintah create site jika belum ada.)

### 2. Authorized domains (Firebase Auth)

Firebase Console → **Authentication** → **Settings** → **Authorized domains** → tambahkan:

- `sortu-app.web.app`
- `sortu-app.firebaseapp.com`

### 3. GitHub Actions (auto-deploy tiap push ke `main`)

Di repo GitHub **EvosROAR/sortu** → **Settings** → **Secrets and variables** → **Actions**, tambahkan:

| Secret | Isi |
|--------|-----|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | dari `.env` |
| `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | dari `.env` |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | dari `.env` |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | dari `.env` |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | dari `.env` |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | dari `.env` |
| `FIREBASE_TOKEN` | dari `firebase login:ci` (lihat bawah) |

**Firebase token (sekali saja):**

```powershell
cd D:\Projects\sortu
firebase login:ci
```

Copy token yang muncul, lalu:

```powershell
gh secret set FIREBASE_TOKEN --body "PASTE_TOKEN" --repo EvosROAR/sortu
```

Atau jalankan script otomatis untuk `EXPO_PUBLIC_*`:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/setup-github-secrets.ps1
```

**Service account (alternatif lama):** tidak dipakai — workflow memakai `FIREBASE_TOKEN`.

## Deploy manual (lokal)

```bash
cd D:\Projects\sortu
npm run build:web
firebase deploy --only hosting:sortu
```

## Catatan

- Folder `dist/` tidak di-commit (hasil build).
- Notifikasi native **tidak** jalan di web; backup pakai unduh browser.
- Android APK tetap lewat `npm run build:android` (EAS).
