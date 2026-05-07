# Penjelasan Sumber Metrik AKI

Dokumen ini menjelaskan asal-usul setiap metrik yang muncul di aplikasi AKI, termasuk dari mana inputnya diambil dan rumus yang dipakai di backend/frontend.

## Ringkas Alur Data

Urutan hitung utamanya seperti ini:

1. Input program, produk, CAPEX, dan parameter O&M diisi di frontend.
2. Data dikirim ke engine kalkulasi di `aki_engine.py`.
3. Engine menghitung revenue, COGS, O&M, laba rugi, FCF, NPV, MIRR, dan payback.
4. Hasilnya dipakai lagi oleh frontend untuk tampilan ringkasan dan PDF.

Referensi kode utama:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)
- [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)
- [`aki_pdf_gen.py`](./aki_pdf_gen.py)

## Dari Mana Tiap Metrik Didapat

### 1. Revenue

Revenue berasal dari daftar produk yang dipilih user.

Sumber input:
- `monthly_price` / harga bulanan per produk
- `otc_price` / biaya one-time charge
- `qty`
- jumlah bulan aktif berdasarkan masa kontrak dan `start_month`

Rumus di engine:
- Revenue tahunan = OTC tahun pertama + recurring revenue bulanan x jumlah bulan aktif
- Dilihat di [`aki_engine.py`](./aki_engine.py) pada bagian `Revenue projection (Sheet 2. Rev)`

### 2. COGS

COGS di aplikasi ini berasal dari `Direct Cost / COGS` pada sheet `Dir`.

Aturan sumbernya:
- Untuk OTC instalasi, COGS = 75% dari OTC revenue
- Untuk recurring cost:
  - Jika produk HSI, recurring COGS = 0
  - Jika non-HSI dan punya EVP, recurring COGS = `harga bulanan x (1 - EVP)`
  - Jika non-HSI tapi EVP tidak tersedia, fallback ke 70%

Sumber logika:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)
- Catatan tampilan di [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)

Istilah penting:
- `EVP` dipakai sebagai margin produk.
- Di kode, recurring COGS dihitung dari `1 - EVP`.

### 3. O&M / OPEX

O&M atau OPEX berasal dari persentase biaya operasional bulanan terhadap revenue.

Rumus:
- `O&M = om_pct x monthly revenue x active months`

Default:
- `om_pct = 12%`

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)
- UI input di [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)

### 4. Gross Profit

Gross Profit dihitung dari:
- `Revenue - COGS`

Jadi gross profit bukan input langsung, tetapi hasil turunan dari revenue dan COGS.

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 5. EBITDA

EBITDA dihitung dari:
- `Gross Profit - OPEX / O&M`

Artinya EBITDA adalah laba sebelum depresiasi, bunga, dan pajak.

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 6. EBIT

EBIT dihitung dari:
- `EBITDA - Depresiasi`

Depresiasi berasal dari CAPEX investasi.

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 7. Net Income

Net Income dihitung dari:
- `EBIT - Pajak`

Pajak yang dipakai di template:
- `TAX_RATE = 22%`

Di kode, pajak dihitung hanya jika EBIT positif:
- `tax = max(0, EBIT) x 22%`

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 8. BOP Lakwas

BOP Lakwas adalah komponen tambahan dari CAPEX.

Rumusnya:
- `BOP Lakwas = 0.4% x (Material + Jasa)`

Di kode:
- `BOP_LAKWAS_PCT = 0.004`

Jadi asalnya bukan dari revenue atau laba rugi, melainkan dari total CAPEX material + jasa.

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)
- [`aki_pdf_gen.py`](./aki_pdf_gen.py)

### 9. CAPEX Total / Total Investasi

CAPEX dasar berasal dari:
- Material dari TIF
- Jasa dari TIF

Lalu ditambah:
- `BOP Lakwas`

Rumus:
- `Total Investasi = Material + Jasa + BOP Lakwas`

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)

### 10. Depresiasi

Depresiasi dihitung dari total investasi dibagi umur aset.

Rumus:
- `Monthly depreciation = capex_total / (lifetime_years x 12)`
- Depresiasi tahunan per tahun dihitung sesuai jumlah bulan aktif pada tahun itu

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 11. Working Capital

Working capital dipakai di FCF dan dihitung dari:
- `AR = (Revenue / 365) x 60`
- `AP = (COGS / 365) x 60`
- `WC = AR - AP`

Nilai hari yang dipakai di kode:
- `AR_DAYS = 60`
- `AP_DAYS = 60`

Sumber:
- [`aki_engine.py`](./aki_engine.py)

### 12. Free Cash Flow / FCF

FCF dihitung dari:
- `EBIT setelah pajak + Depresiasi + perubahan WC - CAPEX`

Di frontend versi preview, WC change masih nol untuk simplifikasi.

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 13. NPV

NPV dihitung dari present value FCF dengan diskonto WACC.

Rumus:
- `NPV = sum(FCF_t / (1 + WACC)^t)`

Di template ini:
- `WACC = 11.35%`

Jadi NPV berasal dari rangkaian FCF, bukan input langsung.

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)
- Tampilan label di [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)
- PDF di [`aki_pdf_gen.py`](./aki_pdf_gen.py)

### 14. WACC

WACC bukan dihitung dinamis di aplikasi ini. Nilainya dikunci dari template:
- `WACC = 0.1135` atau `11.35%`

Dipakai untuk:
- diskonto NPV
- MIRR sebagai finance rate dan reinvest rate

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

### 15. MIRR

MIRR dihitung dari cashflow aktual, bukan dari revenue langsung.

Di engine:
- cashflow negatif didiskonto dengan `finance_rate = WACC`
- cashflow positif dikompound dengan `reinvest_rate = WACC`

Lalu MIRR dihitung dari rasio future value cash inflow terhadap present value cash outflow.

Catatan penting:
- Di codebase ini, MIRR dipakai sebagai pengganti IRR untuk verdict kelayakan.
- Minimum yang dipakai: `WACC + 2% = 13.35%`

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)
- Label di [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)

### 16. Payback Period

Payback Period dihitung dari akumulasi FCF sampai cumulative cashflow jadi nol atau positif.

Artinya:
- dicari tahun/bulan saat modal kembali
- kalau belum kembali sampai horizon 5 tahun, hasilnya `null` / belum balik modal

Sumber:
- [`aki_engine.py`](./aki_engine.py)
- [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)
- Tampilan di [`aki-frontend/src/pages/HalamanInput.jsx`](./aki-frontend/src/pages/HalamanInput.jsx)

## Ringkasan Asal Metrik

- `COGS` dari produk: OTC cost 75% + recurring cost berbasis HSI/EVP/fallback
- `O&M` dari persentase revenue bulanan
- `Gross Profit` dari Revenue - COGS
- `EBITDA` dari Gross Profit - OPEX
- `EBIT` dari EBITDA - Depresiasi
- `Net Income` dari EBIT - Pajak
- `BOP Lakwas` dari 0.4% x total CAPEX material + jasa
- `NPV` dari FCF yang didiskonto memakai WACC 11.35%
- `MIRR` dari cashflow aktual dengan finance/reinvest rate = WACC
- `Payback Period` dari akumulasi FCF sampai balik modal

## Catatan Implementasi

Ada dua jalur kalkulasi yang perlu dijaga konsisten:

1. Backend Python di [`aki_engine.py`](./aki_engine.py)
2. Frontend preview di [`aki-frontend/src/utils/calc.js`](./aki-frontend/src/utils/calc.js)

Kalau ingin mengubah rumus bisnis, sebaiknya update keduanya sekaligus supaya:
- hasil preview sama dengan hasil final
- PDF sama dengan hasil aplikasi
- tidak terjadi beda angka antara UI dan backend

