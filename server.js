import express from 'express';
import pg from 'pg';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import 'dotenv/config'; // Memuat variabel dari file .env
import { spawn } from 'child_process';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';

const { Pool } = pg;
const app = express();
const port = 5000; // Menggunakan port 5000 agar tidak bentrok dengan React (3000)

// Middleware
app.use(cors()); // Mengizinkan frontend (port 3000) mengakses backend (port 5000)
app.use(express.json({ limit: '50mb' })); // Tingkatkan limit untuk upload gambar 360 (Base64)

// Konfigurasi Upload (Simpan sementara di folder uploads/)
const upload = multer({ dest: 'uploads/' });

// Konfigurasi Koneksi Database
const pool = new Pool({
  user: process.env.DB_USER || 'corefti',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'dbcorefti',
  password: process.env.DB_PASSWORD || 'c0r3ft1',
  port: process.env.DB_PORT || 5432,
});

// --- MIDDLEWARE: Cek Status User (Auto Logout) ---
app.use(async (req, res, next) => {
  // Skip validasi untuk endpoint publik (Login/Register/Public Assets)
  const publicPaths = ['/api/login', '/api/register', '/api/settings/maintenance'];
  if (publicPaths.some(path => req.path.startsWith(path)) || req.path === '/') {
    return next();
  }

  const userId = req.headers['x-user-id'];
  
  // Jika tidak ada ID (misal user belum login/tamu), biarkan lanjut (nanti dicek per-endpoint jika perlu)
  if (!userId) return next();

  try {
    const result = await pool.query('SELECT status FROM users WHERE id = $1', [userId]);
    
    // 1. Jika user tidak ditemukan (sudah dihapus Admin)
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Akun tidak ditemukan. Sesi berakhir.' });
    }

    // 2. Jika user statusnya tidak Aktif (misal Suspended)
    if (result.rows[0].status !== 'Aktif') {
      return res.status(401).json({ error: 'Akun dinonaktifkan. Sesi berakhir.' });
    }

    next();
  } catch (err) {
    console.error('Auth Middleware Error:', err);
    next(); // Lanjut saja jika DB error, jangan blokir total
  }
});

// Test Endpoint
app.get('/', (req, res) => {
  res.send('Backend API Silab FTI is running on port 5000');
});

// Endpoint untuk mengambil data users
app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    
    // Mapping data dari format Database ke format Frontend
    const users = result.rows.map(row => ({
      id: row.id,
      name: row.nama,
      email: row.email,
      username: row.username,
      role: row.role,
      identifier: row.identifier,
      status: row.status,
      lastLogin: row.last_login ? new Date(row.last_login).toLocaleString('id-ID') : '-',
      phone: row.telepon
    }));

    res.json(users);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: 'Gagal mengambil data user' });
  }
});

// Endpoint Get Single User (Profile)
app.get('/api/users/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.nama,
      email: row.email,
      username: row.username,
      role: row.role,
      identifier: row.identifier,
      phone: row.telepon || '',
      avatar: row.avatar_image ? `data:image/jpeg;base64,${row.avatar_image.toString('base64')}` : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil profil' });
  }
});

// Endpoint Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Login attempt for: ${email}`); // Debug log

    // 1. Cari user berdasarkan email ATAU username - Case Insensitive (ILIKE)
    const result = await pool.query('SELECT * FROM users WHERE email = $1 OR username ILIKE $1', [email]);
    
    if (result.rows.length === 0) {
      console.log('User not found in database'); // Debug log
      return res.status(401).json({ error: 'Email atau Username tidak ditemukan.' });
    }

    // 2. Bandingkan password (looping jika ada nama yang sama)
    let user = null;
    for (const candidate of result.rows) {
      // 2a. Cek jika password NULL (Reset Mode dari Admin)
      if (candidate.password === null) {
        return res.json({ success: false, resetRequired: true, email: candidate.email, name: candidate.nama });
      }

      // 2b. Normal Login Check
      const match = await bcrypt.compare(password, candidate.password);
      if (match) {
        user = candidate;
        break;
      }
    }

    if (user) {
      // Cek Status Akun (Hanya 'Aktif' yang boleh login)
      if (user.status !== 'Aktif') {
        return res.status(403).json({ error: 'Akun belum diaktifkan. Hubungi Admin Laboran (Ruang 227 atau 456).' });
      }

      // Cek kelengkapan profil (Opsional)
      // Dianggap tidak lengkap jika No HP kosong
      const isProfileIncomplete = !user.telepon;

      res.json({ success: true, id: user.id, role: user.role, name: user.nama, profileIncomplete: isProfileIncomplete });
    } else {
      res.status(401).json({ error: 'Password salah.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Endpoint Set Password Baru (Setelah Reset Admin)
app.post('/api/set-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password dan pastikan status aktif
    await pool.query('UPDATE users SET password = $1, status = $2 WHERE email = $3', [hashedPassword, 'Aktif', email]);

    res.json({ success: true, message: 'Password berhasil diperbarui. Silakan login.' });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Gagal memperbarui password.' });
  }
});

// Endpoint Register (Buat Akun Baru)
app.post('/api/register', async (req, res) => {
  const { fullName, nim, email, password, username } = req.body;

  try {
    // 1. Cek apakah email atau username sudah terdaftar
    const check = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Email atau Username sudah terdaftar.' });
    }

    // 2. Hash Password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Generate ID (Format: USER-Timestamp)
    const id = `USER-${Date.now()}`;

    // 4. Insert ke Database (Status default: Non-Aktif agar butuh ACC Admin)
    const query = `
      INSERT INTO users (id, nama, email, username, password, role, identifier, status)
      VALUES ($1, $2, $3, $4, $5, 'User', $6, 'Non-Aktif')
      RETURNING id, nama, email
    `;
    
    await pool.query(query, [id, fullName, email, username, hashedPassword, nim]);

    // Buat Notifikasi untuk Admin
    const notifId = `NOTIF-${Date.now()}`;
    await pool.query(
      "INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, NULL, $2, $3, 'info')",
      [notifId, 'Registrasi Pengguna Baru', `User ${fullName} (${email}) menunggu persetujuan.`]
    );

    res.json({ success: true, message: 'Registrasi berhasil. Tunggu persetujuan Admin.' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Gagal mendaftar. Silakan coba lagi.' });
  }
});

// Endpoint Update Status User (ACC / Block User)
app.put('/api/users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  try {
    await pool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ error: 'Gagal update status.' });
  }
});

// Endpoint Reset Password User (Admin Action -> Set NULL)
app.put('/api/users/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  try {
    // Set password menjadi NULL
    await pool.query('UPDATE users SET password = NULL WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Gagal mereset password.' });
  }
});

// Create User (Admin)
app.post('/api/users', async (req, res) => {
  const { name, email, username, role, identifier, status, phone } = req.body;
  try {
    const check = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Email atau Username sudah terdaftar.' });

    // Default password for admin-created users: "12345678"
    const hashedPassword = await bcrypt.hash("12345678", 10);
    const id = `USER-${Date.now()}`;

    await pool.query(
      "INSERT INTO users (id, nama, email, username, password, role, identifier, status, telepon) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)",
      [id, name, email, username, hashedPassword, role, identifier, status, phone]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Create user failed' });
  }
});

// Update User
app.put('/api/users/:id', async (req, res) => {
  const { name, email, username, identifier, phone, avatar, role } = req.body;
  try {
    let query = "UPDATE users SET nama=$1, email=$2, username=$3, identifier=$4, telepon=$5";
    let params = [name, email, username, identifier, phone];
    let paramIndex = 6;

    // Update Role jika dikirim (Hanya Admin yang bisa kirim ini dari frontend)
    if (role) {
      query += `, role=$${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    // Jika ada avatar baru (format base64 data URI)
    if (avatar && avatar.startsWith('data:image')) {
      const base64Data = avatar.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
      query += `, avatar_image=$${paramIndex}`;
      params.push(buffer);
      paramIndex++;
    }

    query += ` WHERE id=$${paramIndex}`;
    params.push(req.params.id);

    await pool.query(query, params);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Update user failed' });
  }
});

// Delete User
app.delete('/api/users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Delete user failed' });
  }
});

// --- ENDPOINTS STAFF (Data Internal & PIC) ---

// Get All Staff
app.get('/api/staff', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM staff ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    console.error('Get staff error:', err);
    res.status(500).json({ error: 'Gagal mengambil data staff.' });
  }
});

// Add New Staff
app.post('/api/staff', async (req, res) => {
  const { name, nim, email, phone, jabatan, status } = req.body;
  
  try {
    const id = `STF-${Date.now()}`;
    await pool.query(
      "INSERT INTO staff (id, nama, identifier, email, telepon, jabatan, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [id, name, nim, email, phone, jabatan, status]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Add staff error:', err);
    res.status(500).json({ error: 'Gagal menambah staff.' });
  }
});

// Update Staff
app.put('/api/staff/:id', async (req, res) => {
  const { id } = req.params;
  const { name, nim, email, phone, jabatan, status } = req.body;

  try {
    await pool.query(
      "UPDATE staff SET nama=$1, identifier=$2, email=$3, telepon=$4, jabatan=$5, status=$6 WHERE id=$7",
      [name, nim, email, phone, jabatan, status, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update staff error:', err);
    res.status(500).json({ error: 'Gagal update staff.' });
  }
});

// Delete Staff
app.delete('/api/staff/:id', async (req, res) => {
  try {
    await pool.query("DELETE FROM staff WHERE id = $1", [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete staff error:', err);
    res.status(500).json({ error: 'Gagal menghapus staff.' });
  }
});

// --- INVENTORY (Tabel: inventory) ---

app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory ORDER BY created_at DESC');
    const items = result.rows.map(row => ({
      id: row.id,
      ukswCode: row.uksw_code,
      name: row.nama,
      category: row.kategori,
      condition: row.kondisi,
      isAvailable: row.is_available,
      serialNumber: row.serial_number
    }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { id, ukswCode, name, category, condition, isAvailable, serialNumber } = req.body;
  try {
    await pool.query(
      'INSERT INTO inventory (id, uksw_code, nama, kategori, kondisi, is_available, serial_number) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [id, ukswCode, name, category, condition, isAvailable, serialNumber]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { ukswCode, name, category, condition, isAvailable, serialNumber } = req.body;
  try {
    await pool.query(
      'UPDATE inventory SET uksw_code=$1, nama=$2, kategori=$3, kondisi=$4, is_available=$5, serial_number=$6 WHERE id=$7',
      [ukswCode, name, category, condition, isAvailable, serialNumber, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM inventory WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'DB Error' });
  }
});

// --- ROOMS (Tabel: rooms) ---

app.get('/api/rooms', async (req, res) => {
  try {
    // Join dengan staff untuk dapat nama PIC
    const result = await pool.query(`
        SELECT r.*, s.nama as pic_name 
        FROM rooms r 
        LEFT JOIN staff s ON r.pic_id = s.id 
        ORDER BY r.name ASC
    `);
    const rooms = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.deskripsi,
      capacity: row.kapasitas,
      pic: row.pic_name || 'Unknown', 
      pic_id: row.pic_id,
      image: row.image_data ? `data:image/jpeg;base64,${row.image_data.toString('base64')}` : null,
      facilities: row.fasilitas || [],
      googleCalendarUrl: row.google_calendar_url
    }));
    res.json(rooms);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/rooms', async (req, res) => {
  const { id, name, category, description, capacity, pic, image, facilities, googleCalendarUrl } = req.body;
  try {
    // Cari ID Staff berdasarkan nama (karena frontend mengirim nama)
    let picId = null;
    const staffRes = await pool.query("SELECT id FROM staff WHERE nama = $1", [pic]);
    if (staffRes.rows.length > 0) picId = staffRes.rows[0].id;

    // Convert Base64 Image to Buffer
    let imageBuffer = null;
    if (image && image.startsWith('data:image')) {
        const base64Data = image.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
    }

    await pool.query(
      'INSERT INTO rooms (id, name, category, deskripsi, kapasitas, pic_id, image_data, fasilitas, google_calendar_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
      [id, name, category, description, capacity, picId, imageBuffer, facilities || [], googleCalendarUrl]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.put('/api/rooms/:id', async (req, res) => {
    const { name, category, description, capacity, pic, image, facilities, googleCalendarUrl } = req.body;
    try {
      let picId = null;
      const staffRes = await pool.query("SELECT id FROM staff WHERE nama = $1", [pic]);
      if (staffRes.rows.length > 0) picId = staffRes.rows[0].id;
  
      // Convert Base64 Image to Buffer
      let imageBuffer = null;
      if (image && image.startsWith('data:image')) {
          const base64Data = image.split(',')[1];
          imageBuffer = Buffer.from(base64Data, 'base64');
      }

      await pool.query(
        'UPDATE rooms SET name=$1, category=$2, deskripsi=$3, kapasitas=$4, pic_id=$5, image_data=$6, fasilitas=$7, google_calendar_url=$8 WHERE id=$9',
        [name, category, description, capacity, picId, imageBuffer, facilities || [], googleCalendarUrl, req.params.id]
      );
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'DB Error' });
    }
});

app.delete('/api/rooms/:id', async (req, res) => {
    try {
      await pool.query('DELETE FROM rooms WHERE id=$1', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'DB Error' });
    }
});

// --- BOOKINGS (Tabel: bookings & booking_schedules) ---

app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, u.nama as user_name, r.name as room_name, 
                   (SELECT string_agg(s.nama, ', ') FROM staff s WHERE s.id = ANY(b.tech_support_pic)) as tech_pic_name,
                   bs.schedule_date, bs.start_time, bs.end_time
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN rooms r ON b.room_id = r.id
            LEFT JOIN booking_schedules bs ON b.id = bs.booking_id
            ORDER BY b.created_at DESC
        `);
        
        const bookings = result.rows.map(row => ({
            id: row.id,
            roomId: row.room_id,
            userId: row.user_id,
            userName: row.user_name,
            responsiblePerson: row.penanggung_jawab,
            contactPerson: row.contact_person,
            purpose: row.keperluan,
            date: row.schedule_date ? new Date(row.schedule_date).toLocaleDateString('en-CA') : '',
            startTime: row.start_time ? row.start_time.substring(0, 5) : '',
            endTime: row.end_time ? row.end_time.substring(0, 5) : '',
            status: row.status,
            proposalFile: row.file_proposal ? `data:application/pdf;base64,${row.file_proposal.toString('base64')}` : null,
            techSupportPic: row.tech_support_pic || [], // Ensure array
            techSupportPicName: row.tech_pic_name, // Nama Staff untuk display
            techSupportNeeds: row.tech_support_needs,
            rejectionReason: row.rejection_reason
        }));
        res.json(bookings);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

app.post('/api/bookings', async (req, res) => {
    const { roomId, userId, responsiblePerson, contactPerson, purpose, proposalFile, schedules } = req.body;
    
    // 1. Validasi & Konversi File Proposal (Sebelum Transaksi DB)
    let proposalBuffer = null;
    if (proposalFile && proposalFile.startsWith('data:application/pdf')) {
        const base64Data = proposalFile.split(',')[1];
        proposalBuffer = Buffer.from(base64Data, 'base64');

        // Validasi Ukuran: Max 5MB
        if (proposalBuffer.length > 5 * 1024 * 1024) {
            return res.status(400).json({ error: 'Ukuran file proposal melebihi batas maksimum 5MB.' });
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const bookingId = `BOOK-${Date.now()}`;
        
        // 2. Cek Role User untuk Auto-Approve
        const userRes = await client.query('SELECT role FROM users WHERE id = $1', [userId]);
        const userRole = userRes.rows[0]?.role;
        
        // Jika Admin/Laboran -> 'Disetujui', User Biasa -> 'Pending'
        // Gunakan 'Pending' (Title Case) agar cocok dengan Enum di Frontend
        const initialStatus = (userRole === 'Admin' || userRole === 'Laboran') ? 'Disetujui' : 'Pending';

        // Insert Header Booking
        await client.query(
            `INSERT INTO bookings (id, room_id, user_id, penanggung_jawab, contact_person, keperluan, file_proposal, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [bookingId, roomId, userId, responsiblePerson, contactPerson, purpose, proposalBuffer, initialStatus]
        );

        // Insert Detail Jadwal
        if (schedules && Array.isArray(schedules)) {
            for (const sch of schedules) {
                await client.query(
                    `INSERT INTO booking_schedules (booking_id, schedule_date, start_time, end_time)
                     VALUES ($1, $2, $3, $4)`,
                    [bookingId, sch.date, sch.startTime, sch.endTime]
                );
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, id: bookingId });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Create booking error:', err);
        res.status(500).json({ error: 'Gagal membuat booking.' });
    } finally {
        client.release();
    }
});

app.put('/api/bookings/:id/status', async (req, res) => {
    const { status, techSupportPic, techSupportNeeds, rejectionReason } = req.body;
    try {
        if (status === 'APPROVED') {
             // Update status beserta data technical support
             await pool.query('UPDATE bookings SET status=$1, tech_support_pic=$2, tech_support_needs=$3, rejection_reason=NULL WHERE id=$4', 
                [status, techSupportPic, techSupportNeeds, req.params.id]);
        } else if (status === 'REJECTED') {
             await pool.query('UPDATE bookings SET status=$1, rejection_reason=$2 WHERE id=$3', 
                [status, rejectionReason, req.params.id]);
        } else {
             await pool.query('UPDATE bookings SET status=$1 WHERE id=$2', [status, req.params.id]);
        }

        // --- NOTIFIKASI OTOMATIS KE USER ---
        // Ambil data booking untuk tahu siapa pemiliknya
        const bookingRes = await pool.query('SELECT user_id, keperluan FROM bookings WHERE id = $1', [req.params.id]);
        if (bookingRes.rows.length > 0) {
            const { user_id, keperluan } = bookingRes.rows[0];
            const notifId = `NOTIF-${Date.now()}`;
            let title = '';
            let message = '';
            let type = 'info';

            if (status === 'APPROVED') {
                title = 'Peminjaman Disetujui';
                message = `Pengajuan "${keperluan}" telah disetujui.`;
                type = 'success';
            } else if (status === 'REJECTED') {
                title = 'Peminjaman Ditolak';
                message = `Pengajuan "${keperluan}" ditolak.${rejectionReason ? ' Alasan: ' + rejectionReason : ''}`;
                type = 'error';
            }

            if (title) {
                await pool.query(
                    "INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, $2, $3, $4, $5)",
                    [notifId, user_id, title, message, type]
                );
            }
        }
        // -----------------------------------

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Endpoint Update Data Teknis (Tanpa ubah status)
app.put('/api/bookings/:id/tech-support', async (req, res) => {
    const { techSupportPic, techSupportNeeds } = req.body;
    try {
        await pool.query('UPDATE bookings SET tech_support_pic=$1, tech_support_needs=$2 WHERE id=$3', 
            [techSupportPic, techSupportNeeds, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'DB Error' });
    }
});

// Endpoint Export Bookings to Excel
app.get('/api/bookings/export', async (req, res) => {
    try {
        // Query data lengkap dengan join
        const result = await pool.query(`
            SELECT b.id, r.name as room_name, u.nama as user_name, b.keperluan, 
                   b.penanggung_jawab, b.contact_person, b.status,
                   bs.schedule_date, bs.start_time, bs.end_time,
                   (SELECT string_agg(s.nama, ', ') FROM staff s WHERE s.id = ANY(b.tech_support_pic)) as tech_support_names,
                   b.tech_support_needs
            FROM bookings b
            JOIN rooms r ON b.room_id = r.id
            JOIN users u ON b.user_id = u.id
            LEFT JOIN booking_schedules bs ON b.id = bs.booking_id
            ORDER BY bs.schedule_date DESC, bs.start_time ASC
        `);

        // Setup Workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Peminjaman');

        // Define Columns
        worksheet.columns = [
            { header: 'No', key: 'no', width: 5 },
            { header: 'Tanggal', key: 'date', width: 15 },
            { header: 'Waktu', key: 'time', width: 15 },
            { header: 'Ruangan', key: 'room', width: 25 },
            { header: 'Kegiatan', key: 'activity', width: 30 },
            { header: 'Peminjam', key: 'user', width: 20 },
            { header: 'Penanggung Jawab', key: 'pic', width: 20 },
            { header: 'Kontak', key: 'contact', width: 15 },
            { header: 'Tech Support', key: 'tech', width: 25 },
            { header: 'Kebutuhan Alat', key: 'needs', width: 30 },
            { header: 'Status', key: 'status', width: 12 },
        ];

        // Add Data Rows
        result.rows.forEach((row, index) => {
            worksheet.addRow({
                no: index + 1,
                date: row.schedule_date ? new Date(row.schedule_date).toLocaleDateString('id-ID') : '-',
                time: row.start_time ? `${row.start_time.substring(0,5)} - ${row.end_time.substring(0,5)}` : '-',
                room: row.room_name,
                activity: row.keperluan,
                user: row.user_name,
                pic: row.penanggung_jawab,
                contact: row.contact_person,
                tech: row.tech_support_names || '-',
                needs: row.tech_support_needs || '-',
                status: row.status
            });
        });

        // Style Header
        worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } }; // Blue header

        // Send Response
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=Laporan_Jadwal_Lab.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('Export error:', err);
        res.status(500).json({ error: 'Gagal export excel' });
    }
});

// --- LOANS (Tabel: transactions & loans) ---

app.get('/api/loans', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, t.nama_peminjam, t.peminjam_identifier, t.petugas_pinjam, t.jaminan, t.tgl_pinjam, t.waktu_pinjam, i.nama as equipment_name
            FROM loans l
            JOIN transactions t ON l.transaction_id = t.id
            JOIN inventory i ON l.inventory_id = i.id
            ORDER BY t.created_at DESC
        `);
        
        const loans = result.rows.map(row => ({
            id: row.id,
            transactionId: row.transaction_id,
            equipmentId: row.inventory_id,
            equipmentName: row.equipment_name,
            borrowerName: `${row.nama_peminjam} (${row.peminjam_identifier})`,
            borrowOfficer: row.petugas_pinjam,
            returnOfficer: row.petugas_pengembalian,
            guarantee: row.jaminan,
            borrowDate: new Date(row.tgl_pinjam).toLocaleDateString('en-CA'),
            borrowTime: row.waktu_pinjam ? row.waktu_pinjam.substring(0, 5) : '',
            actualReturnDate: row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString('en-CA') : null,
            actualReturnTime: row.actual_return_time ? row.actual_return_time.substring(0, 5) : null,
            status: row.status
        }));
        res.json(loans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

app.post('/api/loans', async (req, res) => {
    const { equipmentIds, borrowerName, nim, guarantee, borrowDate, borrowTime, borrowOfficer } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const trxId = `TRX-${Date.now()}`;
        
        await client.query(
            'INSERT INTO transactions (id, peminjam_identifier, nama_peminjam, petugas_pinjam, jaminan, tgl_pinjam, waktu_pinjam) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [trxId, nim, borrowerName, borrowOfficer, guarantee, borrowDate, borrowTime]
        );

        for (const eqId of equipmentIds) {
            const loanId = `L-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await client.query(
                'INSERT INTO loans (id, transaction_id, inventory_id, status) VALUES ($1, $2, $3, $4)',
                [loanId, trxId, eqId, 'Dipinjam']
            );
            await client.query('UPDATE inventory SET is_available = FALSE WHERE id = $1', [eqId]);
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    } finally {
        client.release();
    }
});

app.put('/api/loans/return', async (req, res) => {
    const { loanIds, returnDate, returnTime, returnOfficer } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const loanId of loanIds) {
            const loanRes = await client.query('SELECT inventory_id FROM loans WHERE id = $1', [loanId]);
            if (loanRes.rows.length > 0) {
                const invId = loanRes.rows[0].inventory_id;
                await client.query(
                    'UPDATE loans SET status=$1, actual_return_date=$2, actual_return_time=$3, petugas_pengembalian=$4 WHERE id=$5',
                    ['Dikembalikan', returnDate, returnTime, returnOfficer, loanId]
                );
                await client.query('UPDATE inventory SET is_available = TRUE WHERE id = $1', [invId]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    } finally {
        client.release();
    }
});

app.delete('/api/loans/group', async (req, res) => {
    const { loanIds } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        for (const id of loanIds) {
             const loanRes = await client.query('SELECT inventory_id, status FROM loans WHERE id = $1', [id]);
             if (loanRes.rows.length > 0 && loanRes.rows[0].status === 'Dipinjam') {
                 await client.query('UPDATE inventory SET is_available = TRUE WHERE id = $1', [loanRes.rows[0].inventory_id]);
             }
             await client.query('DELETE FROM loans WHERE id = $1', [id]);
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'DB Error' });
    } finally {
        client.release();
    }
});

// --- GLOBAL SEARCH ---
app.get('/api/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json([]);
  
  const term = `%${q}%`;
  try {
    // Search Users
    const users = await pool.query(
      "SELECT id, nama as name, 'User' as type, 'users' as page, status FROM users WHERE nama ILIKE $1 OR email ILIKE $1 LIMIT 3", 
      [term]
    );
    
    // Search Rooms
    const rooms = await pool.query(
      `SELECT r.id, r.name, 'Room' as type, 'rooms' as page, 
       CASE WHEN EXISTS (
         SELECT 1 FROM bookings b 
         JOIN booking_schedules bs ON b.id = bs.booking_id 
         WHERE b.room_id = r.id AND b.status = 'APPROVED' 
         AND bs.schedule_date = CURRENT_DATE 
         AND CURRENT_TIME BETWEEN bs.start_time AND bs.end_time
       ) THEN 'Sedang Dipakai' ELSE 'Tersedia' END as status
       FROM rooms r WHERE r.name ILIKE $1 LIMIT 3`, 
      [term]
    );
    
    // Search Inventory
    const inventory = await pool.query(
      "SELECT id, nama as name, 'Inventory' as type, 'inventory' as page, CASE WHEN is_available THEN 'Tersedia' ELSE 'Dipinjam' END as status FROM inventory WHERE nama ILIKE $1 OR uksw_code ILIKE $1 LIMIT 3", 
      [term]
    );

    const results = [
        ...users.rows.map(r => ({ ...r, icon: 'User' })),
        ...rooms.rows.map(r => ({ ...r, icon: 'MapPin' })),
        ...inventory.rows.map(r => ({ ...r, icon: 'Box' }))
    ];
    
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// --- NOTIFICATIONS ---
app.get('/api/notifications', async (req, res) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.json([]);

    try {
        // Cek role user untuk menentukan akses notifikasi
        const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.json([]);
        
        const role = userRes.rows[0].role;
        
        let query = 'SELECT * FROM notifications WHERE user_id = $1';
        const params = [userId];
        
        // Jika Admin, ambil juga notifikasi global (user_id IS NULL)
        if (role && role.toLowerCase() === 'admin') {
            query = 'SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL';
        }
        
        query += ' ORDER BY created_at DESC LIMIT 20';
        
        const result = await pool.query(query, params);
        
        const notifs = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            message: row.message,
            type: row.type,
            timestamp: new Date(row.created_at).toLocaleString('id-ID'),
            isRead: row.is_read
        }));
        
        res.json(notifs);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Update failed' });
    }
});

// --- SYSTEM SETTINGS (Maintenance Mode) ---

app.get('/api/settings/maintenance', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode'");
    // Jika belum ada di DB, default false
    const enabled = result.rows.length > 0 && result.rows[0].value === 'true';
    res.json({ enabled });
  } catch (err) {
    console.error(err);
    res.json({ enabled: false });
  }
});

app.post('/api/settings/maintenance', async (req, res) => {
  const { enabled } = req.body;
  try {
    // Upsert (Update if exists, Insert if not)
    await pool.query(
      "INSERT INTO system_settings (key, value) VALUES ('maintenance_mode', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
      [String(enabled)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan pengaturan.' });
  }
});

app.get('/api/settings/announcement', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM system_settings WHERE key = 'global_announcement'");
    if (result.rows.length > 0) {
      res.json(JSON.parse(result.rows[0].value));
    } else {
      res.json({ active: false, message: '', type: 'info' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal mengambil pengumuman.' });
  }
});

app.post('/api/settings/announcement', async (req, res) => {
  const { active, message, type } = req.body;
  const value = JSON.stringify({ active, message, type });
  try {
    await pool.query(
      "INSERT INTO system_settings (key, value) VALUES ('global_announcement', $1) ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = CURRENT_TIMESTAMP",
      [value]
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gagal menyimpan pengumuman.' });
  }
});

// Endpoint Backup Database (Download SQL Dump)
app.get('/api/settings/backup', (req, res) => {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `backup-corefti-${date}.sql`;

  // Set Header agar browser mengenali ini sebagai file download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/sql');

  // Siapkan Environment Variables untuk pg_dump
  const env = {
    ...process.env,
    PGHOST: process.env.DB_HOST || 'localhost',
    PGPORT: process.env.DB_PORT || '5432',
    PGUSER: process.env.DB_USER || 'corefti',
    PGPASSWORD: process.env.DB_PASSWORD || 'c0r3ft1',
    PGDATABASE: process.env.DB_NAME || 'dbcorefti',
  };

  // Jalankan pg_dump dan pipe outputnya langsung ke response
  const dump = spawn('pg_dump', [], { env });

  dump.stdout.pipe(res);

  dump.stderr.on('data', (data) => {
    console.error(`pg_dump error: ${data}`);
  });

  dump.on('error', (err) => {
    console.error('Failed to start pg_dump:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal menjalankan backup. Pastikan pg_dump terinstall di server.' });
    }
  });
});

// Endpoint Restore Database (Upload SQL File)
app.post('/api/settings/restore', upload.single('backupFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang diupload.' });
  }

  const filePath = req.file.path;

  // Siapkan Environment Variables untuk psql
  const env = {
    ...process.env,
    PGHOST: process.env.DB_HOST || 'localhost',
    PGPORT: process.env.DB_PORT || '5432',
    PGUSER: process.env.DB_USER || 'corefti',
    PGPASSWORD: process.env.DB_PASSWORD || 'c0r3ft1',
    PGDATABASE: process.env.DB_NAME || 'dbcorefti',
  };

  // Jalankan psql untuk restore
  // Command: psql -U user -d dbname -f file.sql
  const psql = spawn('psql', ['-f', filePath], { env });

  psql.on('error', (err) => {
    console.error('Failed to start psql:', err);
    try { fs.unlinkSync(filePath); } catch (e) {}
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal menjalankan restore. Pastikan PostgreSQL (psql) terinstall dan ada di PATH system.' });
    }
  });

  let stderr = '';
  psql.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  psql.on('close', (code) => {
    // Hapus file temporary setelah selesai
    try { fs.unlinkSync(filePath); } catch (e) {}

    if (res.headersSent) return;

    if (code === 0) {
      res.json({ success: true, message: 'Database berhasil direstore.' });
    } else {
      console.error('Restore failed:', stderr);
      res.status(500).json({ error: 'Gagal merestore database. Cek console server untuk detail.', details: stderr });
    }
  });
});

// Endpoint Read Error Log
app.get('/api/settings/error-log', (req, res) => {
  const logPath = path.join(process.cwd(), 'server.log'); // Mencari file server.log di root folder
  
  if (fs.existsSync(logPath)) {
    try {
      const logContent = fs.readFileSync(logPath, 'utf8');
      res.json({ log: logContent });
    } catch (err) {
      res.status(500).json({ error: 'Gagal membaca file log.' });
    }
  } else {
    res.json({ log: 'File log (server.log) tidak ditemukan di root folder. Pastikan server dijalankan dengan logging ke file.' });
  }
});

// Jalankan Server
app.listen(port, () => {
  console.log(`Backend server berjalan di http://localhost:${port}`);
});
