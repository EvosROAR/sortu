# Firebase setup (Sortu)

## 1. Buat / pakai project Firebase

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Buat project baru **atau** pakai project yang sama dengan PocketLedger
3. Tambah **Web app**, salin config-nya

## 2. Aktifkan Auth + Firestore

- **Authentication** → Sign-in method → **Email/Password** → Enable  
- **Firestore Database** → Create database (production atau test)  
- Tab **Rules** → paste isi `firestore.rules` di root Sortu → Publish

## 3. Isi `.env`

```bash
cd D:\Projects\sortu
copy .env.example .env
```

Isi semua `EXPO_PUBLIC_FIREBASE_*` dari Project Settings → Your apps.

Kalau mau cepat dan PocketLedger sudah punya `.env`, bisa copy:

```bash
copy D:\Projects\money-tracker\.env D:\Projects\sortu\.env
```

(Pastikan Auth Email/Password & rules Sortu sudah aktif di project itu.)

## 4. Restart Expo

```bash
npm start
```

Lalu tekan `w` / Expo Go. Harus muncul layar **Masuk / Daftar**.

## Perilaku sync (setelah hardening)

| Situasi | Yang terjadi |
|---------|----------------|
| Login, cloud kosong, lokal ada data | Upload lokal → cloud |
| Login, cloud ada, lokal kosong | Ambil cloud |
| Login, keduanya beda | **Dialog pilih**: Pakai cloud / Pakai data ini / Pakai lokal dulu |
| Login, keduanya sama | Lanjut tanpa overwrite |
| Ganti akun | Ledger per-uid terpisah di perangkat |
| Mode guest | Storage `sortu-ledger:guest` (lokal saja) |
| Tanpa `.env` | Otomatis mode lokal |

Dokumen cloud: `users/{uid}/app/sortu`  
Local keys: `sortu-ledger:guest` / `sortu-ledger:uid:{uid}`

## Catatan keamanan sebelum payment

- Server key Midtrans **jangan** masuk Expo client  
- Hardening sync ini wajib sebelum menghubungkan potongan saldo ke payment webhook
