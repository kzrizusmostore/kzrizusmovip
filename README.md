# KZRIZUSMO FF - versi terpisah

Struktur hasil pemisahan:

- `index.html` - struktur halaman
- `css/style.css` - stylesheet utama (posisi cascade awal dipertahankan)
- `css/overrides.css` - patch/override stylesheet yang semula berada setelah library eksternal
- `js/app.js` - seluruh JavaScript inline utama
- `zusmo-asset/` - folder untuk asset lokal yang direferensikan proyek

Catatan penting:

1. Library CDN yang sudah dipakai project (Font Awesome, Google Fonts, html2canvas, EmailJS, QRCode.js) tetap dipanggil dari `index.html` agar urutan load tidak berubah.
2. URL asset relatif di CSS otomatis disesuaikan karena file CSS sekarang berada di folder `css/`.
3. Folder `zusmo-asset/` dibuat, tetapi file asset aslinya tidak ada di upload HTML ini. Salin asset asli proyek ke folder tersebut jika memang digunakan.
4. Untuk hasil paling konsisten, jalankan lewat local/static web server, bukan hanya `file://`. Contoh: `python -m http.server 8080` dari folder project.
5. Atribut wiring seperti `onclick` yang sudah ada di HTML dipertahankan agar kompatibilitas perilaku lama tidak berubah; fungsi yang dipanggilnya sekarang berasal dari `js/app.js`.

Jumlah blok yang dipisah: 11 blok `<style>` dan 2 blok `<script>` inline.
