import express from 'express';
import { pool } from '../config/database.js';
import { verifyRole } from '../middleware/auth.js';

const router = express.Router();

// --- SISTEM UPLOAD VIA HP (QR CODE) ---
// Menggunakan In-Memory Map untuk menyimpan sesi upload sementara.
// (Catatan: Untuk skala enterprise/banyak server, lebih baik gunakan Redis atau Database)
const uploadSessions = new Map();

// 1. Generate Sesi Upload Baru (Dipanggil dari Komputer)
router.post('/upload-session', async (req, res) => {
  const sessionId = `QR-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  uploadSessions.set(sessionId, { status: 'pending', fileBase64: null, fileName: null });
  
  // Hapus sesi otomatis setelah 15 menit jika tidak digunakan untuk menghemat memori
  setTimeout(() => uploadSessions.delete(sessionId), 15 * 60 * 1000);
  
  res.json({ success: true, sessionId });
});

// 2. Menerima File dari HP (Dipanggil dari Browser HP)
router.post('/upload-session/:id', async (req, res) => {
  const { id } = req.params;
  const { fileBase64, fileName } = req.body;
  
  if (!uploadSessions.has(id)) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan atau sudah kadaluarsa' });
  }

  uploadSessions.set(id, { status: 'completed', fileBase64, fileName });
  res.json({ success: true });
});

// 3. Polling Status Sesi (Dipanggil berkala oleh Komputer)
router.get('/upload-session/:id', async (req, res) => {
  const { id } = req.params;
  
  if (!uploadSessions.has(id)) {
    return res.status(404).json({ error: 'Sesi tidak ditemukan' });
  }

  const sessionData = uploadSessions.get(id);
  res.json({ success: true, data: sessionData });
  
  // Jika sudah 'completed', kita hapus dari memori agar bersih
  if (sessionData.status === 'completed') {
    uploadSessions.delete(id);
  }
});

// --- SISTEM SURAT AKTIF KULIAH ---

// 4. Endpoint Submit Pengajuan (Bisa diakses oleh Mahasiswa)
router.post('/active-student', async (req, res) => {
  const { name, nim, email, transcriptBase64, transcriptName } = req.body;
  
  try {
    const id = `REQ-${Date.now()}`;
    await pool.query(
      `INSERT INTO active_student_requests (id, name, nim, email, transcript_base64, transcript_name, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
      [id, name, nim, email, transcriptBase64, transcriptName]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Insert active student request error:', err);
    res.status(500).json({ error: 'Gagal menyimpan pengajuan.' });
  }
});

// 5. Endpoint Ambil Semua Pengajuan (Hanya Admin / TU)
// Mengizinkan Admin Utama, Admin TU, dan User TU untuk melihat daftar pengajuan
router.get('/active-student', verifyRole(['Admin', 'Admin TU', 'User TU']), async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM active_student_requests ORDER BY created_at DESC`);
    
    // Konversi snake_case DB ke camelCase untuk Frontend
    const formattedData = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      nim: row.nim,
      email: row.email,
      status: row.status,
      transcriptBase64: row.transcript_base64,
      transcriptName: row.transcript_name,
      signatureBase64: row.signature_base64,
      stampBase64: row.stamp_base64,
      createdAt: row.created_at
    }));
    
    res.json({ success: true, data: formattedData });
  } catch (err) {
    console.error('Get active student requests error:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengajuan.' });
  }
});

// 6. Endpoint Verifikasi Pengajuan
router.put('/active-student/:id/verify', verifyRole(['Admin', 'Admin TU']), async (req, res) => {
  const { id } = req.params;
  const { signatureBase64, stampBase64 } = req.body;
  
  try {
    await pool.query(
      `UPDATE active_student_requests SET status = 'verified', signature_base64 = $1, stamp_base64 = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3`,
      [signatureBase64, stampBase64, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Verify request error:', err);
    res.status(500).json({ error: 'Gagal memverifikasi pengajuan.' });
  }
});

// 7. Endpoint Kirim Email (Simulasi)
router.post('/active-student/:id/send-email', verifyRole(['Admin', 'Admin TU']), async (req, res) => {
  const { id } = req.params;
  
  try {
    // TODO: Implementasi NodeMailer di sini jika server sudah memiliki SMTP
    // Untuk sekarang, kita hanya mengubah status surat menjadi 'sent'
    await pool.query(
      `UPDATE active_student_requests SET status = 'sent', updated_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [id]
    );
    res.json({ success: true, message: 'Email berhasil dikirim' });
  } catch (err) {
    console.error('Send email error:', err);
    res.status(500).json({ error: 'Gagal mengirim email.' });
  }
});

// 8. Endpoint Ringkasan TU (Untuk Dashboard)
router.get('/active-student/summary', verifyRole(['Admin', 'Admin TU', 'User TU']), async (req, res) => {
  try {
    const result = await pool.query(`SELECT status, COUNT(*) as count FROM active_student_requests GROUP BY status`);
    
    const summary = {
      pending: 0,
      verified: 0,
      sent: 0,
      total: 0
    };
    
    result.rows.forEach(row => {
      if (row.status === 'pending') summary.pending = parseInt(row.count, 10);
      if (row.status === 'verified') summary.verified = parseInt(row.count, 10);
      if (row.status === 'sent') summary.sent = parseInt(row.count, 10);
      summary.total += parseInt(row.count, 10);
    });
    
    res.json({ success: true, data: summary });
  } catch (err) {
    console.error('Get TU summary error:', err);
    res.status(500).json({ error: 'Gagal mengambil data ringkasan TU.' });
  }
});

export default router;