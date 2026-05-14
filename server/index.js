// =====================================================
// SERVER UTAMA - ZOOMOMIMANU (FIXED)
// =====================================================

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  maxHttpBufferSize: 10 * 1024 * 1024  // 10MB untuk slide presentasi
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// =====================================================
// DATABASE IN-MEMORY
// KENAPA: Railway/Render tidak punya persistent file storage.
// fs.readFileSync akan CRASH saat file tidak ada → server mati
// → Socket.IO mati → video call & chat tidak bisa konek.
// Solusi: simpan data di memory (cukup untuk 1 sesi kelas).
// =====================================================
let db = {
  guru: [
    { id: 'guru-kelas1', username: 'Kelas 1', passwordPlain: 'guru123', namaGuru: 'Guru Kelas 1', kelas: 'Kelas 1', mataPelajaran: 'Umum' },
    { id: 'guru-kelas2', username: 'Kelas 2', passwordPlain: 'guru123', namaGuru: 'Guru Kelas 2', kelas: 'Kelas 2', mataPelajaran: 'Umum' },
    { id: 'guru-kelas3', username: 'Kelas 3', passwordPlain: 'guru123', namaGuru: 'Guru Kelas 3', kelas: 'Kelas 3', mataPelajaran: 'Umum' },
    { id: 'guru-kelas4', username: 'Kelas 4', passwordPlain: 'guru123', namaGuru: 'Guru Kelas 4', kelas: 'Kelas 4', mataPelajaran: 'Umum' },
    { id: 'guru-kelas5', username: 'Kelas 5', passwordPlain: 'guru123', namaGuru: 'Guru Kelas 5', kelas: 'Kelas 5', mataPelajaran: 'Umum' },
    { id: 'guru-kelas6', username: 'Kelas 6', passwordPlain: 'guru123', namaGuru: 'Guru Kelas 6', kelas: 'Kelas 6', mataPelajaran: 'Umum' }
  ],
  siswa: [],
  ruangan: [],
  tugas: []
};

// =====================================================
// API: WebRTC CONFIG
// =====================================================
app.get('/api/webrtc-config', (req, res) => {
  // Gunakan env variable jika ada, fallback ke STUN saja
  const turnUser = process.env.TURN_USERNAME;
  const turnPass = process.env.TURN_CREDENTIAL;

  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' }
  ];

  // Tambahkan TURN hanya jika credentials tersedia
  if (turnUser && turnPass) {
    iceServers.push(
      { urls: 'turn:a.relay.metered.ca:80', username: turnUser, credential: turnPass },
      { urls: 'turn:a.relay.metered.ca:80?transport=tcp', username: turnUser, credential: turnPass },
      { urls: 'turn:a.relay.metered.ca:443', username: turnUser, credential: turnPass },
      { urls: 'turn:a.relay.metered.ca:443?transport=tcp', username: turnUser, credential: turnPass }
    );
  }

  res.json({ iceServers });
});

// =====================================================
// ROUTE: HALAMAN HTML
// =====================================================
app.get('/',        (req, res) => res.sendFile(path.join(__dirname, '../public/pages/login.html')));
app.get('/test',    (req, res) => res.sendFile(path.join(__dirname, '../public/pages/test-webrtc.html')));
app.get('/guru',    (req, res) => res.sendFile(path.join(__dirname, '../public/pages/guru-dashboard.html')));
app.get('/siswa',   (req, res) => res.sendFile(path.join(__dirname, '../public/pages/siswa-dashboard.html')));
app.get('/ruang/:id', (req, res) => res.sendFile(path.join(__dirname, '../public/pages/ruang-kelas.html')));

// =====================================================
// API: LOGIN GURU
// =====================================================
app.post('/api/login/guru', (req, res) => {
  const { username, password } = req.body;
  // Case-insensitive: "kelas 1" == "Kelas 1"
  const guru = db.guru.find(g => g.username.toLowerCase() === (username || '').toLowerCase());
  if (!guru) return res.status(401).json({ sukses: false, pesan: 'Kelas tidak ditemukan' });
  if (password !== guru.passwordPlain) return res.status(401).json({ sukses: false, pesan: 'Password salah' });

  // Buat/ambil ruang otomatis untuk kelas ini
  const ruang = getOrBuatRuang(guru.kelas, guru.id, guru.namaGuru);

  res.json({
    sukses: true,
    data: { id: guru.id, namaGuru: guru.namaGuru, kelas: guru.kelas, mataPelajaran: guru.mataPelajaran, role: 'guru', ruang }
  });
});

// =====================================================
// API: LOGIN SISWA
// =====================================================
app.post('/api/login/siswa', (req, res) => {
  const { nama, kelas } = req.body;
  if (!nama || !kelas) return res.status(400).json({ sukses: false, pesan: 'Nama dan kelas wajib diisi' });

  let siswa = db.siswa.find(s => s.nama.toLowerCase() === nama.toLowerCase() && s.kelas === kelas);
  if (!siswa) {
    siswa = { id: uuidv4(), nama, kelas, bergabungPada: new Date().toISOString() };
    db.siswa.push(siswa);
  }

  // Cari ruang aktif untuk kelas siswa ini
  const ruang = db.ruangan.find(r => r.kelas.toLowerCase() === kelas.toLowerCase() && r.aktif) || null;

  res.json({ sukses: true, data: { ...siswa, role: 'siswa', ruang } });
});

// =====================================================
// API: RUANG OTOMATIS PER KELAS
// Saat guru login, ruang dibuat otomatis berdasarkan kelas.
// Tidak perlu buat manual lagi.
// =====================================================
function getOrBuatRuang(kelas, guruId, namaGuru) {
  let ruang = db.ruangan.find(r => r.kelas === kelas && r.aktif);
  if (!ruang) {
    const kodeRuang = kelas.replace(/\s/g, '').toUpperCase();
    ruang = {
      id: 'ruang-' + kelas.replace(/\s/g, '-').toLowerCase(),
      kode: kodeRuang,
      guruId, namaGuru, kelas,
      judul: kelas,
      aktif: true,
      dibuatPada: new Date().toISOString(),
      peserta: []
    };
    db.ruangan.push(ruang);
  }
  return ruang;
}

// =====================================================
// API: BUAT RUANG KELAS (tetap ada untuk kompatibilitas)
// =====================================================
app.post('/api/ruang/buat', (req, res) => {
  const { guruId, namaGuru, kelas, judul } = req.body;

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
  res.json({ sukses: true, data: ruang });
});

// =====================================================
// API: TUTUP RUANG
// =====================================================
app.post('/api/ruang/tutup', (req, res) => {
  const { ruangId } = req.body;
  const ruang = db.ruangan.find(r => r.id === ruangId);
  if (ruang) ruang.aktif = false;
  res.json({ sukses: true });
});

// =====================================================
// API: DAFTAR RUANG AKTIF PER KELAS
// =====================================================
app.get('/api/ruang/aktif/:kelas', (req, res) => {
  const kelas = decodeURIComponent(req.params.kelas);
  const ruangAktif = db.ruangan.filter(r =>
    r.kelas.toLowerCase() === kelas.toLowerCase() && r.aktif
  );
  res.json({ sukses: true, data: ruangAktif });
});

// =====================================================
// API: TUGAS — FIX: dua endpoint aktif
// HTML lama pakai /api/tugas/buat
// Server lama hanya punya /api/tugas/kirim → 404 → tugas gagal
// =====================================================
function handleBuatTugas(req, res) {
  const { ruangId, guruId, namaGuru, judul, soal, kelas } = req.body;
  if (!judul || !soal) return res.status(400).json({ sukses: false, pesan: 'Judul dan soal wajib diisi' });

  const tugas = {
    id: uuidv4(),
    ruangId, guruId, namaGuru, judul, soal,
    kelas: kelas || '',
    dibuatPada: new Date().toISOString(),
    jawaban: []
  };

  db.tugas.push(tugas);
  io.to(ruangId).emit('tugas-baru', tugas);
  res.json({ sukses: true, tugas });
}

app.post('/api/tugas/buat', handleBuatTugas);   // dipanggil ruang-kelas.html
app.post('/api/tugas/kirim', handleBuatTugas);  // endpoint lama, tetap aktif

// =====================================================
// API: JAWABAN SISWA
// =====================================================
app.post('/api/tugas/jawab', (req, res) => {
  const { tugasId, siswaId, namaSiswa, jawaban } = req.body;
  const idx = db.tugas.findIndex(t => t.id === tugasId);
  if (idx === -1) return res.status(404).json({ sukses: false, pesan: 'Tugas tidak ditemukan' });

  const jawabanBaru = { id: uuidv4(), siswaId, namaSiswa, jawaban, dikirimPada: new Date().toISOString() };
  db.tugas[idx].jawaban.push(jawabanBaru);

  io.to(db.tugas[idx].ruangId).emit('jawaban-baru', { tugasId, jawaban: jawabanBaru });
  res.json({ sukses: true, data: jawabanBaru });
});

// =====================================================
// API: LIHAT TUGAS DI RUANG
// =====================================================
app.get('/api/tugas/ruang/:ruangId', (req, res) => {
  const tugas = db.tugas.filter(t => t.ruangId === req.params.ruangId);
  res.json({ sukses: true, data: tugas });
});

// =====================================================
// API: DAFTARKAN GURU BARU
// =====================================================
app.post('/api/setup/guru', (req, res) => {
  const { username, password, namaGuru, kelas, mataPelajaran } = req.body;
  if (db.guru.find(g => g.username === username))
    return res.status(400).json({ sukses: false, pesan: 'Username sudah ada' });

  const guru = { id: uuidv4(), username, passwordPlain: password, namaGuru, kelas: kelas || '', mataPelajaran: mataPelajaran || '' };
  db.guru.push(guru);
  res.json({ sukses: true, pesan: 'Guru berhasil didaftarkan', data: { username, namaGuru } });
});

// =====================================================
// SOCKET.IO — REAL-TIME
// =====================================================
const penggunaSedangOnline = {};
const presentasiAktif = {}; // simpan slide terakhir per ruang

io.on('connection', (socket) => {
  console.log(`✅ Terhubung: ${socket.id}`);

  // ---- BERGABUNG RUANG ----
  socket.on('bergabung-ruang', ({ ruangId, userId, namaUser, role }) => {
    // ── DEDUP GUARD ──────────────────────────────────────────────────────────
    // Cegah pemrosesan ganda untuk socket yang sama di ruang yang sama.
    // Jika client mengirim bergabung-ruang >1x (mis. transport upgrade
    // polling→ws, atau client bug), server akan broadcast pengguna-bergabung
    // berkali-kali → semua client bereaksi → ping-pong cascade.
    const sudahAda = penggunaSedangOnline[socket.id];
    if (sudahAda && sudahAda.ruangId === ruangId) {
      console.log(`⚠️  [dedup] ${namaUser} sudah di ruang ${ruangId}, diabaikan`);
      return;
    }
    // ─────────────────────────────────────────────────────────────────────────

    socket.join(ruangId);
    penggunaSedangOnline[socket.id] = { ruangId, userId, namaUser, role };

    // Beritahu peserta lain ada yang masuk
    socket.to(ruangId).emit('pengguna-bergabung', { socketId: socket.id, userId, namaUser, role });

    // Kirim daftar online ke pendatang baru — TANPA diri sendiri
    // (mencegah client memproses dirinya sendiri dari daftar)
    const penggunaRuang = Object.entries(penggunaSedangOnline)
      .filter(([sid, v]) => v.ruangId === ruangId && sid !== socket.id)
      .map(([socketId, v]) => ({ socketId, ...v }));
    socket.emit('daftar-pengguna-online', penggunaRuang);

    // Kalau guru sudah share presentasi, langsung kirim ke pendatang baru
    if (presentasiAktif[ruangId]) {
      socket.emit('presentasi-halaman', presentasiAktif[ruangId]);
    }

    console.log(`👤 ${namaUser} (${role}) → ruang ${ruangId}`);
  });

  // ---- WebRTC SIGNALING ----
  socket.on('webrtc-offer', ({ tujuanSocketId, offer }) => {
    io.to(tujuanSocketId).emit('webrtc-offer', { dariSocketId: socket.id, offer });
  });
  socket.on('webrtc-answer', ({ tujuanSocketId, answer }) => {
    io.to(tujuanSocketId).emit('webrtc-answer', { dariSocketId: socket.id, answer });
  });
  socket.on('webrtc-ice-candidate', ({ tujuanSocketId, candidate }) => {
    io.to(tujuanSocketId).emit('webrtc-ice-candidate', { dariSocketId: socket.id, candidate });
  });

  // ---- CHAT ----
  socket.on('kirim-chat', ({ ruangId, namaUser, pesan, role }) => {
    // io.to → broadcast ke SEMUA termasuk pengirim (bukan hanya socket.to)
    io.to(ruangId).emit('pesan-chat', {
      namaUser, pesan, role,
      waktu: new Date().toLocaleTimeString('id-ID')
    });
  });

  // ---- PRESENTASI (FIX: event ini tidak ada di server lama) ----
  socket.on('presentasi-halaman', ({ ruangId, imageData, halaman, totalHalaman, namaFile }) => {
    const payload = { imageData, halaman, totalHalaman, namaFile };
    presentasiAktif[ruangId] = payload; // simpan untuk pendatang baru
    socket.to(ruangId).emit('presentasi-halaman', payload);
  });

  socket.on('presentasi-selesai', ({ ruangId }) => {
    delete presentasiAktif[ruangId];
    socket.to(ruangId).emit('presentasi-selesai');
  });

  // ---- PAPAN TULIS ----
  socket.on('papan-tulis-gambar', ({ ruangId, data }) => {
    socket.to(ruangId).emit('papan-tulis-gambar', data);
  });
  socket.on('papan-tulis-bersihkan', ({ ruangId }) => {
    socket.to(ruangId).emit('papan-tulis-bersihkan');
  });

  // ---- KIRIM TUGAS VIA SOCKET (fallback dari HTML lama) ----
  socket.on('kirim-tugas', ({ ruangId, tugas }) => {
    if (!tugas) return;
    const tugasBaru = { ...tugas, id: tugas.id || require('crypto').randomUUID() };
    socket.to(ruangId).emit('tugas-baru', tugasBaru);
  });

  // ---- ANGKAT TANGAN ----
  socket.on('angkat-tangan', ({ ruangId, namaUser }) => {
    socket.to(ruangId).emit('siswa-angkat-tangan', { namaUser, socketId: socket.id });
  });

  // ---- TOGGLE VIDEO / AUDIO ----
  socket.on('toggle-video', ({ ruangId, status }) => {
    socket.to(ruangId).emit('pengguna-toggle-video', { socketId: socket.id, status });
  });
  socket.on('toggle-audio', ({ ruangId, status }) => {
    socket.to(ruangId).emit('pengguna-toggle-audio', { socketId: socket.id, status });
  });

  // ---- DISCONNECT ----
  socket.on('disconnect', () => {
    const info = penggunaSedangOnline[socket.id];
    if (info) {
      io.to(info.ruangId).emit('pengguna-keluar', { socketId: socket.id, namaUser: info.namaUser });
      delete penggunaSedangOnline[socket.id];
      console.log(`❌ ${info.namaUser} keluar dari ruang ${info.ruangId}`);
    }
  });
});

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`
🦒 ====================================
   ZOOMOMIMANU BERJALAN!
   http://localhost:${PORT}
   PORT: ${PORT}
====================================
  `);
});
