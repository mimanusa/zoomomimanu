// =====================================================
// SERVER UTAMA - ZOOMOMIMANU
// Platform Belajar Daring Sekolah
// =====================================================
// Jalankan dengan: node server/index.js
// Deploy ke Railway: https://railway.app
// =====================================================

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// ---- MIDDLEWARE ----
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// =====================================================
// API: KONFIGURASI WebRTC (STUN + TURN server)
// Diperlukan agar video call bisa menembus jaringan
// berbeda (sekolah <-> rumah)
// =====================================================
app.get('/api/webrtc-config', (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  });
});

// ---- HELPER: Baca & Tulis Database ----
const DB_PATH = path.join(__dirname, '../data/database.json');

function bacaDB() {
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  return JSON.parse(raw);
}

function tulisDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// =====================================================
// ROUTE: HALAMAN HTML
// =====================================================
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/login.html'));
});

app.get('/guru', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/guru-dashboard.html'));
});

app.get('/siswa', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/siswa-dashboard.html'));
});

app.get('/ruang/:id', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/pages/ruang-kelas.html'));
});

// =====================================================
// API: LOGIN GURU
// =====================================================
app.post('/api/login/guru', async (req, res) => {
  const { username, password } = req.body;
  const db = bacaDB();
  
  const guru = db.guru.find(g => g.username === username);
  if (!guru) {
    return res.status(401).json({ sukses: false, pesan: 'Username tidak ditemukan' });
  }

  const cocok = password === guru.passwordPlain;
  if (!cocok) {
    return res.status(401).json({ sukses: false, pesan: 'Password salah' });
  }

  res.json({
    sukses: true,
    data: {
      id: guru.id,
      namaGuru: guru.namaGuru,
      kelas: guru.kelas,
      mataPelajaran: guru.mataPelajaran,
      role: 'guru'
    }
  });
});

// =====================================================
// API: LOGIN SISWA (hanya nama + kelas)
// =====================================================
app.post('/api/login/siswa', (req, res) => {
  const { nama, kelas } = req.body;
  if (!nama || !kelas) {
    return res.status(400).json({ sukses: false, pesan: 'Nama dan kelas wajib diisi' });
  }

  const db = bacaDB();
  
  let siswa = db.siswa.find(s => 
    s.nama.toLowerCase() === nama.toLowerCase() && s.kelas === kelas
  );

  if (!siswa) {
    siswa = { id: uuidv4(), nama, kelas, bergabungPada: new Date().toISOString() };
    db.siswa.push(siswa);
    tulisDB(db);
  }

  res.json({
    sukses: true,
    data: { ...siswa, role: 'siswa' }
  });
});

// =====================================================
// API: BUAT RUANG KELAS (oleh guru)
// =====================================================
app.post('/api/ruang/buat', (req, res) => {
  const { guruId, namaGuru, kelas, judul } = req.body;
  const db = bacaDB();
  
  const kodeRuang = kelas.replace(/\s/g, '').toUpperCase() + '-' + 
    Math.random().toString(36).substring(2, 6).toUpperCase();

  const ruang = {
    id: uuidv4(),
    kode: kodeRuang,
    guruId,
    namaGuru,
    kelas,
    judul: judul || `Kelas ${kelas}`,
    aktif: true,
    dibuatPada: new Date().toISOString(),
    peserta: []
  };

  db.ruangan.push(ruang);
  tulisDB(db);

  res.json({ sukses: true, data: ruang });
});

// =====================================================
// API: DAFTAR RUANG AKTIF
// =====================================================
app.get('/api/ruang/aktif/:kelas', (req, res) => {
  const { kelas } = req.params;
  const db = bacaDB();
  
  const ruangAktif = db.ruangan.filter(r => 
    r.kelas === kelas && r.aktif
  );

  res.json({ sukses: true, data: ruangAktif });
});

// =====================================================
// API: KIRIM TUGAS (oleh guru)
// =====================================================
app.post('/api/tugas/kirim', (req, res) => {
  const { ruangId, guruId, namaGuru, judul, soal, kelas } = req.body;
  const db = bacaDB();

  const tugas = {
    id: uuidv4(),
    ruangId,
    guruId,
    namaGuru,
    judul,
    soal,
    kelas,
    dibuatPada: new Date().toISOString(),
    jawaban: []
  };

  db.tugas.push(tugas);
  tulisDB(db);

  io.to(ruangId).emit('tugas-baru', tugas);

  res.json({ sukses: true, data: tugas });
});

// =====================================================
// API: KIRIM JAWABAN (oleh siswa)
// =====================================================
app.post('/api/tugas/jawab', (req, res) => {
  const { tugasId, siswaId, namaSiswa, jawaban } = req.body;
  const db = bacaDB();

  const tugasIndex = db.tugas.findIndex(t => t.id === tugasId);
  if (tugasIndex === -1) {
    return res.status(404).json({ sukses: false, pesan: 'Tugas tidak ditemukan' });
  }

  const jawabanBaru = {
    id: uuidv4(),
    siswaId,
    namaSiswa,
    jawaban,
    dikirimPada: new Date().toISOString()
  };

  db.tugas[tugasIndex].jawaban.push(jawabanBaru);
  tulisDB(db);

  const ruangId = db.tugas[tugasIndex].ruangId;
  io.to(ruangId).emit('jawaban-baru', {
    tugasId,
    jawaban: jawabanBaru
  });

  res.json({ sukses: true, data: jawabanBaru });
});

// =====================================================
// API: LIHAT SEMUA TUGAS DI RUANG
// =====================================================
app.get('/api/tugas/ruang/:ruangId', (req, res) => {
  const { ruangId } = req.params;
  const db = bacaDB();
  const tugas = db.tugas.filter(t => t.ruangId === ruangId);
  res.json({ sukses: true, data: tugas });
});

// =====================================================
// DAFTARKAN GURU (Setup Awal)
// =====================================================
app.post('/api/setup/guru', (req, res) => {
  const { username, password, namaGuru, kelas, mataPelajaran } = req.body;
  const db = bacaDB();

  if (db.guru.find(g => g.username === username)) {
    return res.status(400).json({ sukses: false, pesan: 'Username sudah ada' });
  }

  const guru = {
    id: uuidv4(),
    username,
    passwordPlain: password,
    namaGuru,
    kelas,
    mataPelajaran
  };

  db.guru.push(guru);
  tulisDB(db);

  res.json({ sukses: true, pesan: 'Guru berhasil didaftarkan', data: { username, namaGuru, kelas } });
});

// =====================================================
// SOCKET.IO - VIDEO CALL & INTERAKSI REAL-TIME
// =====================================================

const penggunaSedangOnline = {};

io.on('connection', (socket) => {
  console.log(`✅ Pengguna terhubung: ${socket.id}`);

  socket.on('bergabung-ruang', ({ ruangId, userId, namaUser, role }) => {
    socket.join(ruangId);
    penggunaSedangOnline[socket.id] = { ruangId, userId, namaUser, role };

    socket.to(ruangId).emit('pengguna-bergabung', {
      socketId: socket.id,
      userId,
      namaUser,
      role
    });

    const penggunaRuang = Object.entries(penggunaSedangOnline)
      .filter(([, v]) => v.ruangId === ruangId)
      .map(([socketId, v]) => ({ socketId, ...v }));

    socket.emit('daftar-pengguna-online', penggunaRuang);
    console.log(`👤 ${namaUser} (${role}) bergabung ke ruang ${ruangId}`);
  });

  socket.on('webrtc-offer', ({ tujuanSocketId, offer }) => {
    io.to(tujuanSocketId).emit('webrtc-offer', { dariSocketId: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ tujuanSocketId, answer }) => {
    io.to(tujuanSocketId).emit('webrtc-answer', { dariSocketId: socket.id, answer });
  });

  socket.on('webrtc-ice-candidate', ({ tujuanSocketId, candidate }) => {
    io.to(tujuanSocketId).emit('webrtc-ice-candidate', { dariSocketId: socket.id, candidate });
  });

  socket.on('kirim-chat', ({ ruangId, namaUser, pesan, role }) => {
    io.to(ruangId).emit('pesan-chat', {
      namaUser,
      pesan,
      role,
      waktu: new Date().toLocaleTimeString('id-ID')
    });
  });

  socket.on('papan-tulis-gambar', ({ ruangId, data }) => {
    socket.to(ruangId).emit('papan-tulis-gambar', data);
  });

  socket.on('papan-tulis-bersihkan', ({ ruangId }) => {
    socket.to(ruangId).emit('papan-tulis-bersihkan');
  });

  socket.on('angkat-tangan', ({ ruangId, namaUser }) => {
    socket.to(ruangId).emit('siswa-angkat-tangan', { namaUser, socketId: socket.id });
  });

  socket.on('toggle-video', ({ ruangId, status }) => {
    socket.to(ruangId).emit('pengguna-toggle-video', { socketId: socket.id, status });
  });

  socket.on('toggle-audio', ({ ruangId, status }) => {
    socket.to(ruangId).emit('pengguna-toggle-audio', { socketId: socket.id, status });
  });

  socket.on('disconnect', () => {
    const info = penggunaSedangOnline[socket.id];
    if (info) {
      io.to(info.ruangId).emit('pengguna-keluar', {
        socketId: socket.id,
        namaUser: info.namaUser
      });
      delete penggunaSedangOnline[socket.id];
      console.log(`❌ ${info.namaUser} meninggalkan ruang ${info.ruangId}`);
    }
  });
});

// =====================================================
// JALANKAN SERVER
// =====================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🦒 ====================================
   ZOOMOMIMANU BERJALAN!
   Buka browser: http://localhost:${PORT}
   PORT: ${PORT}
====================================
  `);
});
