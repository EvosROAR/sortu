# Build APK Sortu (EAS)

Sortu pakai **Expo Application Services (EAS)** untuk build APK yang bisa di-install di HP Android tanpa Expo Go.

## Prasyarat

1. Akun gratis [expo.dev](https://expo.dev)
2. Node.js ≥ 20.19 (disarankan LTS terbaru)
3. File `.env` sudah terisi (Firebase)

## Setup (sekali saja)

```bash
cd D:\Projects\sortu
npm install -g eas-cli
eas login
eas init
```

`eas init` akan:
- Menghubungkan project ke akun Expo
- Menambahkan `projectId` di `app.json` (jangan dihapus)

## Build APK (testing / sideload)

```bash
npm run build:android
```

Atau langsung:

```bash
eas build --platform android --profile preview
```

- Profile **preview** → output **APK** (mudah di-share & install)
- Build jalan di cloud Expo (~10–20 menit)
- Selesai → link download muncul di terminal & di [expo.dev](https://expo.dev)

## Install di HP

1. Download APK dari link EAS
2. Transfer ke HP (atau buka link langsung di HP)
3. Aktifkan **Install from unknown sources** untuk browser/file manager
4. Tap APK → Install

## Build production (Play Store)

```bash
eas build --platform android --profile production
```

Output **AAB** (Android App Bundle) — format yang di-upload ke Google Play Console.

## Catatan

| Item | Nilai |
|------|-------|
| Package Android | `com.sortu.app` |
| Versi app | `0.1.0` (di `app.json`) |
| Icon & splash | `assets/icon.png`, `assets/splash-icon.png` |

Kalau build gagal karena `.env`, pastikan variabel `EXPO_PUBLIC_FIREBASE_*` sudah ada sebelum build, atau set di **EAS Secrets**:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_API_KEY --value "..."
```

(Ulangi untuk semua key Firebase.)

## Troubleshooting

- **Node outdated** — update Node ke ≥ 20.19.4
- **eas: command not found** — `npm install -g eas-cli`
- **Project not configured** — jalankan `eas init` dulu
