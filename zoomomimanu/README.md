# 🏫 KELAS ONLINE - Panduan Lengkap

## Apa ini?
Aplikasi video call untuk belajar online seperti Zoom, khusus untuk sekolah.
- Siswa login hanya dengan **nama + kelas** (tanpa email!)
- Guru login dengan **username + password**
- Fitur: Video Call, Chat, Papan Tulis, Kirim & Jawab Tugas

---

## ⚡ CARA MENJALANKAN (Ikuti urutan ini!)

### LANGKAH 1 - Install Node.js
1. Buka https://nodejs.org
2. Download versi **LTS** (misalnya 20.x)
3. Install seperti biasa (next, next, finish)
4. Buka **Command Prompt** atau **Terminal**, ketik:
   ```
   node --version
   ```
   Jika muncul angka versi (contoh: v20.9.0), berarti berhasil ✅

### LANGKAH 2 - Buka Folder Proyek di VS Code
1. Buka VS Code
2. Klik **File > Open Folder**
3. Pilih folder **kelasonline** (folder ini)
4. Klik **Select Folder**

### LANGKAH 3 - Install Library
1. Di VS Code, buka **Terminal** (klik menu Terminal > New Terminal)
2. Ketik perintah ini:
   ```
   npm install
   ```
3. Tunggu sampai selesai (muncul tulisan "added xxx packages")

### LANGKAH 4 - Daftarkan Akun Guru
Sebelum bisa login sebagai guru, kita perlu daftarkan dulu.
1. Jalankan server dulu (lihat Langkah 5)
2. Buka browser, ketik alamat ini:
   ```
   http://localhost:3000
   ```
3. Untuk mendaftarkan guru, buka **Postman** atau gunakan cara berikut:

   **Cara mudah pakai browser/terminal:**
   Buka terminal baru dan ketik (ganti sesuai kebutuhan):
   ```
   curl -X POST http://localhost:3000/api/setup/guru \
     -H "Content-Type: application/json" \
     -d "{\"username\":\"kelas6a\",\"password\":\"guru123\",\"namaGuru\":\"Bu Sari\",\"kelas\":\"6A\",\"mataPelajaran\":\"Matematika\"}"
   ```

   **Atau pakai cara lebih mudah:** Buka file `data/database.json`, dan ubah bagian `guru` menjadi:
   ```json
   "guru": [
     {
       "id": "guru001",
       "username": "kelas6a",
       "passwordPlain": "guru123",
       "namaGuru": "Bu Sari",
       "kelas": "6A",
       "mataPelajaran": "Matematika"
     }
   ]
   ```

### LANGKAH 5 - Jalankan Aplikasi
Di terminal VS Code, ketik:
```
node server/index.js
```

Jika berhasil, akan muncul:
```
🚀 ====================================
   KELAS ONLINE SERVER BERJALAN!
   Buka browser: http://localhost:3000
====================================
```

### LANGKAH 6 - Buka di Browser
Ketik di browser: **http://localhost:3000**

---

## 👩‍🏫 CARA PAKAI SEBAGAI GURU

1. Buka http://localhost:3000
2. Klik tab **"Masuk Sebagai Guru"**
3. Masukkan username dan password (contoh: `kelas6a` / `guru123`)
4. Klik tombol **"Buat Ruang Baru"**
5. Salin **Kode Ruang** yang muncul (contoh: `6A-AB12`)
6. Bagikan kode itu ke siswa
7. Klik **"Masuk ke Video Call"**

Di dalam ruang kelas:
- 📹 **Video Call** - otomatis nyala
- 🎨 **Papan Tulis** - hanya guru yang bisa menggambar
- 📝 **Kirim Tugas** - isi soal, klik kirim, siswa langsung terima

---

## 🎒 CARA PAKAI SEBAGAI SISWA

1. Buka http://localhost:3000
2. Tab **"Masuk Sebagai Siswa"** sudah aktif
3. Isi **Nama** dan pilih **Kelas**
4. Klik **"Masuk ke Kelas"**
5. Masukkan **Kode Ruang** dari guru
6. Klik **"Bergabung"**

Di dalam ruang kelas:
- 📹 Video call otomatis
- 📝 Kalau ada tugas masuk, klik tab **"Tugas"**, isi jawaban, klik kirim

---

## 🖥️ AKSES DARI KOMPUTER LAIN (LAN/Wifi sekolah)

Agar siswa di komputer lain bisa mengakses:

1. Cari IP komputer guru:
   - Windows: buka CMD, ketik `ipconfig`, cari **IPv4 Address** (contoh: 192.168.1.5)
   - Mac/Linux: ketik `ifconfig` atau `ip addr`

2. Siswa membuka browser dan ketik:
   ```
   http://192.168.1.5:3000
   ```
   (ganti dengan IP komputer guru)

3. Pastikan firewall tidak memblokir port 3000

---

## ❓ TROUBLESHOOTING

**Server tidak bisa jalan:**
- Pastikan Node.js sudah terinstall (`node --version`)
- Pastikan sudah `npm install`
- Pastikan port 3000 tidak dipakai aplikasi lain

**Kamera tidak muncul:**
- Browser perlu izin akses kamera
- Klik ikon kunci/kamera di address bar, izinkan
- Coba browser Chrome atau Edge

**Siswa tidak bisa bergabung dari komputer lain:**
- Matikan Windows Firewall sementara untuk test
- Gunakan Chrome atau Edge (bukan IE)

**Video tidak muncul padahal kamera sudah izin:**
- WebRTC butuh HTTPS untuk production
- Untuk jaringan lokal (LAN), biasanya HTTP sudah cukup
- Jika tetap masalah, coba: `chrome://flags/#unsafely-treat-insecure-origin-as-secure`

---

## 📂 STRUKTUR FOLDER

```
kelasonline/
├── server/
│   └── index.js          ← Server utama (jangan ubah kalau belum paham)
├── public/
│   ├── css/
│   │   └── style.css     ← Tampilan/desain
│   └── pages/
│       ├── login.html        ← Halaman login
│       ├── guru-dashboard.html   ← Dashboard guru
│       ├── siswa-dashboard.html  ← Dashboard siswa
│       └── ruang-kelas.html      ← Ruang video call
├── data/
│   └── database.json     ← Database (bisa diedit manual)
├── package.json          ← Konfigurasi proyek
└── README.md             ← Panduan ini
```

---

## 🔧 MENAMBAH KELAS BARU

Buka file `public/pages/login.html`, cari bagian `<select id="kelas-siswa">` dan tambahkan:
```html
<option value="7A">Kelas 7A</option>
```

---

Dibuat dengan ❤️ untuk kemajuan pendidikan Indonesia 🇮🇩
