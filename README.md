# KZRIZUSMO FF - Split Project

Struktur:

- `index.html` - struktur HTML utama
- `css/base.css` - CSS utama yang sebelumnya berada di blok `<style>` pertama
- `css/overrides.css` - seluruh blok CSS lanjutan, urutannya dipertahankan
- `js/app.js` - seluruh JavaScript internal, urutannya dipertahankan
- `zusmo-asset/` - tempat asset lokal asli
- `ASSETS_REQUIRED.txt` - daftar asset lokal yang direferensikan project

Catatan penting:
- URL relatif di CSS otomatis disesuaikan dari `zusmo-asset/...` menjadi `../zusmo-asset/...` karena file CSS sekarang berada di folder `css/`.
- URL asset di HTML dan JavaScript tidak perlu diubah karena tetap resolve terhadap halaman `index.html`.
- Library eksternal (Font Awesome, Google Fonts, html2canvas, EmailJS, QRCodeJS) tetap berada pada posisi/order aslinya di HTML.
- Asset binary asli tidak ada dalam upload `index.html`, jadi folder asset hanya disiapkan dan tidak diisi file palsu.

Jumlah blok asal: 11 CSS internal, 2 JavaScript internal.
Jumlah referensi asset lokal terdeteksi: 87.
