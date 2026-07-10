# Sortu

**Sortir uangmu ke kantong — biar tiap rupiah ada jatahnya.**

Aplikasi envelope budgeting untuk anak muda Indonesia: bagi gaji ke kantong (listrik, Netflix, game, dll.), pantau progress, dan siap bayar tanpa hitung manual.

> Bukan bank / e-wallet. Sortu membantu **alokasi & tracking**. Uang tetap di rekening/e-wallet kamu.

---

## Positioning

| Bukan | Ya |
|-------|-----|
| Pencatat pengeluaran generik | **Kantong / amplop digital** |
| Auto-transfer bank (MVP) | Reminder + “tandai bayar” + riwayat |
| Ganti Jenius/DANA | Pelengkap: lebih fokus langganan & tagihan |

**Tagline:** Setiap rupiah ada kantongnya.

---

## Nama brand

| | |
|--|--|
| **Nama** | Sortu *(dari “sortir uang”)* |
| **Kenapa bukan Kantongku** | Nama mirip sudah dipakai beberapa app/finance |
| **Package ID (rencana)** | `com.sortu.app` |
| **Bahasa default** | Indonesia |

Alternatif cadangan: Amplopin, Pecis.

---

## MVP (fase 1)

1. Auth sederhana (email) — atau demo tanpa login dulu
2. Buat / edit / hapus **kantong** (nama, icon, target, jatuh tempo)
3. Catat **pemasukan** (gaji / top-up tercatat)
4. **Alokasi & pindah** antar kantong
5. Progress bar per kantong (`terkumpul / target`)
6. Reminder H-3 / H-1 (opsional di MVP)
7. Aksi **Bayar** → kurangi saldo kantong + tandai lunas (manual konfirmasi)
8. **Riwayat** per kantong

### Belum di MVP

- Auto TF ke bank / bayar Netflix otomatis
- Menyimpan dana user seperti e-wallet
- Payment gateway (Midtrans) → **fase 2**
- AI, scan struk, multi-user keluarga

---

## Layar MVP

```
Home          → ringkasan + daftar kantong + sisa belum dialokasi
Kantong Detail→ progress, riwayat, tombol Bayar / Isi
Tambah/Edit   → form kantong
Alokasi       → pindah dari “belum dialokasi” atau antar kantong
Pemasukan     → catat gaji / top-up
Riwayat       → filter per kantong
```

---

## Stack (selaras PocketLedger)

| Layer | Choice |
|-------|--------|
| App | Expo + React Native + TypeScript |
| State | Zustand |
| Backend (nanti) | Firebase Auth + Firestore |
| i18n | Indonesia dulu |

Fondasi & pola kode bisa diwarisi dari `D:\Projects\money-tracker` (PocketLedger), tapi **produk & brand terpisah**.

---

## Struktur folder

```
sortu/
├── app/                    # entry (Expo)
├── src/
│   ├── domain/             # entities: Pocket, Allocation, PaymentMark
│   ├── application/        # use cases
│   ├── infrastructure/     # firebase / local storage
│   ├── presentation/       # screens & components
│   ├── store/
│   └── lib/
├── docs/
│   ├── PRODUCT.md          # brief produk
│   └── SCREENS.md          # wireframe teks
├── package.json
└── README.md
```

---

## Roadmap singkat

| Fase | Isi | Estimasi kasar |
|------|-----|----------------|
| 2 – Reminder | H-3 / H-1 + alarm jam 09:00 | ✅ |
| 3 – Firebase | Auth + sync Firestore | ✅ |
| 3b – Backup | Ekspor & impor JSON | ✅ |
| 4 – Payment | Midtrans sandbox dari layar kantong | ✅ (butuh setup `.env` + deploy functions) |
| 5 – Polish | Icon/splash, Play Store | belakangan |

---

## Status sekarang

- MVP lokal: kantong, alokasi, bayar, riwayat  
- **Pengingat jatuh tempo** — H-3 / H-1 / hari H jam **09:00** (alarm + catch-up)  
- **Backup JSON** — ekspor ke HP & impor dari menu Akun  
- **Firebase Auth + sync** (lihat `docs/FIREBASE_SETUP.md`)
- **Midtrans sandbox** — bayar dari kantong via Vercel API (lihat `docs/VERCEL_SETUP.md`)

### Build APK stabil

```bash
npm run build:android
```

Install APK preview di emulator/HP. Butuh izin **Notifikasi** + **Alarm & pengingat** (Android) untuk notif jam 9.

## Menjalankan

```bash
cd D:\Projects\sortu
npm install
copy .env.example .env   # lalu isi Firebase, atau copy dari money-tracker
npm start
```

Tanpa `.env` Firebase → app langsung **mode lokal**.  
Dengan `.env` → layar login/daftar (+ opsi lanjut tanpa akun).

**Coba alur:** Daftar → buat kantong → logout/login di device lain → data ikut.

---

## Catatan

Project ini sengaja dipisah dari PocketLedger agar:

1. Brand jelas untuk jual / store / portfolio  
2. Scope fokus envelope budgeting  
3. Tetap bisa reuse pola teknis dari PocketLedger  

Lihat juga: `docs/PRODUCT.md`, `docs/SCREENS.md`.
