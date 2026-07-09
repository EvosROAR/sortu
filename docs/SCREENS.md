# Sortu — Screen Map (MVP)

Wireframe teks — belum UI final.

---

## 1. Home

```
┌─────────────────────────────┐
│ Sortu              [+] [⚙]  │
│                             │
│ Belum dialokasi             │
│ Rp 350.000                  │
│ [Alokasikan]                │
│                             │
│ Kantong                     │
│ ┌─────────────────────────┐ │
│ │ ⚡ Listrik               │ │
│ │ ████████░░  Rp180/200rb │ │
│ │ Jatuh tempo 20 Jul      │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ▶ Netflix               │ │
│ │ ██████░░░░  Rp90/120rb  │ │
│ │ Jatuh tempo 12 Jul      │ │
│ └─────────────────────────┘ │
│                             │
│ [ + Kantong baru ]          │
└─────────────────────────────┘
```

Tab bawah (opsional MVP): Home | Riwayat | Profil

---

## 2. Detail Kantong

```
┌─────────────────────────────┐
│ ←  Netflix                  │
│                             │
│ Rp 90.000 / Rp 120.000      │
│ ████████░░░░  75%           │
│ Jatuh tempo: 12 Jul 2026    │
│                             │
│ [ Isi kantong ]  [ Bayar ]  │
│                             │
│ Riwayat                     │
│ • 1 Jul  Alokasi +40.000  │
│ • 28 Jun Alokasi +50.000  │
│ • 12 Jun Bayar   −120.000 │
└─────────────────────────────┘
```

**Bayar (fase 1):** modal konfirmasi → kurangi saldo ke 0 atau ke nominal tagihan → catat sebagai “dibayar”.

---

## 3. Tambah / Edit Kantong

- Nama
- Icon (pilih preset)
- Target bulanan (Rp)
- Tanggal jatuh tempo (1–28 / akhir bulan)
- Catatan opsional (no. pelanggan, email Netflix, dll.)

---

## 4. Alokasi

```
Dari:  Belum dialokasi (Rp350.000)
Ke:    [ pilih kantong ]
Nominal: Rp ______
[ Pindahkan ]
```

Juga dukung: kantong A → kantong B.

---

## 5. Pemasukan

```
Sumber: Gaji / Lainnya
Nominal: Rp ______
Tanggal: ___
→ masuk ke “Belum dialokasi”
```

---

## 6. Riwayat (global)

Filter: Semua | per kantong  
Tipe: Alokasi | Pemasukan | Bayar

---

## Prioritas bangun

1. Model data + Home list (mock lokal dulu)
2. CRUD kantong
3. Pemasukan + alokasi
4. Bayar manual + riwayat
5. Firebase sync
6. Reminder
