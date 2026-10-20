# QR Studio

Generator dan pembaca QR code berbasis browser. QR dibuat dan dipindai di perangkat pengguna; aplikasi tidak mengirim konten QR ke server.

## Fitur

- Membuat QR untuk tautan HTTP/HTTPS, teks, dan jaringan Wi-Fi.
- Mengubah warna QR dan latar, lalu mengunduh sebagai PNG atau SVG.
- Memindai QR lewat kamera atau gambar yang dipilih.
- Antarmuka berbahasa Indonesia dan desain responsif.

## Menjalankan secara lokal

Membutuhkan Node.js 22 atau lebih baru.

```sh
npm ci
npm run dev
```

Buka alamat lokal yang ditampilkan Vite. Untuk membuat build produksi:

```sh
npm run check
npm run build
npm run preview
```

## Pemindaian dan dukungan browser

Pemindaian menggunakan `BarcodeDetector` bila tersedia dan otomatis memakai pustaka `jsQR` sebagai fallback di browser lain. Kamera memerlukan HTTPS (GitHub Pages sudah menggunakan HTTPS) dan izin dari pengguna.

## Privasi

Konten yang dimasukkan dan hasil scan diproses di browser. Kamera hanya diaktifkan setelah pengguna menekan tombol pindai. QR Wi-Fi menyimpan nama jaringan dan, jika digunakan, kata sandi di dalam gambar QR; bagikan dengan hati-hati.

Aplikasi memuat kode pihak ketiga yang dibundel saat proses build (termasuk pustaka QR dan Vite). Pernyataan privasi ini merujuk pada alur aplikasi: konten QR tidak dikirim ke layanan backend oleh kode aplikasi.

## Deployment

GitHub Actions menjalankan pemeriksaan sintaks dan build saat ada push ke `main`, lalu menerbitkan folder `dist` ke GitHub Pages. Jalankan workflow manual dari tab Actions untuk deploy sesuai konfigurasi repositori.
