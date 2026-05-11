# 🦒 ZooMimanu — Panduan Deploy Online

Panduan ini menjelaskan cara membuat ZooMimanu bisa diakses oleh **guru di sekolah** dan **siswa di rumah** menggunakan jaringan berbeda (internet).

---

## 📋 Akun Default

| Peran  | Username | Password   |
|--------|----------|------------|
| Guru Kelas 1 | `kelas 1` | `guru123` |
| Guru Kelas 2 | `kelas 2` | `guru123` |
| Guru Kelas 3 | `kelas 3` | `guru123` |
| Guru Kelas 4 | `kelas 4` | `guru123` |
| Guru Kelas 5 | `kelas 5` | `guru123` |
| Guru Kelas 6 | `kelas 6` | `guru123` |

> **Siswa** cukup isi Nama + Pilih Kelas, tidak perlu password.

---

## 🚀 PILIHAN A: Deploy ke Railway (GRATIS, Permanen)

**Railway** adalah platform cloud gratis yang paling mudah untuk Node.js.

### Langkah-langkah:

**1. Buat akun GitHub (kalau belum punya)**
- Buka [github.com](https://github.com) → Register

**2. Upload project ke GitHub**
- Buka [github.com/new](https://github.com/new)
- Beri nama repo: `zoomomimanu`
- Klik **"Create repository"**
- Upload semua file ZooMimanu (drag & drop di browser)
- Klik **"Commit changes"**

**3. Deploy ke Railway**
- Buka [railway.app](https://railway.app)
- Login dengan akun GitHub
- Klik **"New Project"** → **"Deploy from GitHub repo"**
- Pilih repo `zoomomimanu`
- Tunggu sekitar 2-3 menit hingga deploy selesai

**4. Dapatkan URL**
- Di dashboard Railway, klik tab **"Settings"**
- Di bagian "Domains", klik **"Generate Domain"**
- URL kamu akan seperti: `https://zoomomimanu-production.up.railway.app`

**5. Bagikan URL**
- Guru buka URL tersebut di browser
- Siswa juga buka URL yang sama dari rumah ✅

---

## ⚡ PILIHAN B: Ngrok (Cepat, Tidak Perlu Deploy Cloud)

Cocok untuk tes cepat. Server tetap berjalan di komputer kamu.

**1. Install & jalankan server lokal**
```bash
npm install
npm start
```

**2. Install Ngrok**
- Buka [ngrok.com](https://ngrok.com) → Download → Install
- Daftar akun gratis → Salin auth token

**3. Jalankan Ngrok**
```bash
ngrok http 3000
```

**4. Bagikan URL**
- Ngrok akan memberi URL seperti: `https://abc123.ngrok-free.app`
- Guru & siswa buka URL tersebut ✅

> **Catatan:** URL ngrok gratis berubah setiap kali dijalankan ulang.

---

## 🌐 PILIHAN C: Cloudflare Tunnel (Gratis & URL Permanen)

URL tidak berubah, gratis selamanya.

**1. Install cloudflared**
- Windows: [Download .exe](https://github.com/cloudflare/cloudflared/releases)
- Mac: `brew install cloudflared`

**2. Login Cloudflare**
```bash
cloudflared tunnel login
```

**3. Buat tunnel permanen**
```bash
cloudflared tunnel create zoomomimanu
cloudflared tunnel route dns zoomomimanu belajar.namadomain.com
```

**4. Jalankan**
```bash
cloudflared tunnel run zoomomimanu
```

---

## 🔧 Menjalankan Server Lokal

```bash
# Masuk ke folder project
cd zoomomimanu

# Install dependencies (sekali saja)
npm install

# Jalankan server
npm start

# Buka browser: http://localhost:3000
```

---

## 📁 Struktur File

```
zoomomimanu/
├── server/
│   └── index.js          ← Server utama (Node.js + Socket.io)
├── public/
│   ├── css/
│   │   └── style.css     ← Tampilan modern
│   └── pages/
│       ├── login.html           ← Halaman login
│       ├── guru-dashboard.html  ← Dashboard guru
│       ├── siswa-dashboard.html ← Dashboard siswa
│       └── ruang-kelas.html     ← Ruang video call
├── data/
│   └── database.json     ← Database (file JSON)
├── package.json
├── Procfile              ← Untuk Railway/Heroku
└── CARA-DEPLOY.md        ← Panduan ini
```

---

## ⚠️ Catatan Penting

1. **WebRTC (Video Call)** membutuhkan **HTTPS**. Railway otomatis menyediakan HTTPS. Ngrok juga HTTPS. Jadi video call akan berfungsi setelah deploy.

2. **Database JSON** — data tersimpan di file. Jika deploy ulang ke Railway, data **tidak hilang** selama tidak dihapus manual.

3. **Password guru** bisa diubah langsung di file `data/database.json`.

---

## 💡 Tips Penggunaan

**Untuk Guru:**
1. Login → Buat Ruang Kelas
2. Salin kode ruang (misal: `KELAS5-AB12`)
3. Bagikan kode ke siswa via WhatsApp/grup
4. Klik "Masuk Video Call" untuk memulai sesi

**Untuk Siswa:**
1. Buka URL ZooMimanu
2. Isi nama + pilih kelas
3. Masukkan kode ruang dari guru
4. Klik Masuk → ikuti kelas! 🎉

---

*ZooMimanu — Belajar Lebih Seru, Dimanapun Kamu Berada 🦒*
