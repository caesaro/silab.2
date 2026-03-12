﻿import express from 'express';
import pg from 'pg';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import 'dotenv/config'; // Memuat variabel dari file .env
import { spawn } from 'child_process';
import multer from 'multer';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import crypto from 'crypto';

const { Pool } = pg;
const app = express();
const port = 5000; // Menggunakan port 5000 agar tidak bentrok dengan React (3000)

// Trust Proxy: Agar Express bisa membaca IP asli user dari Nginx (X-Forwarded-For)
app.set('trust proxy', 1);

// --- Security Middlewares ---

// 1. Set various HTTP headers for security
app.use(helmet());

// 2. Enable CORS with specific origin
// Add more origins for development and production
const allowedOrigins = [
  'http://localhost:5173', 
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  'https://192.168.68.197:5173',
  'http://192.168.68.197:5173',
  'https://localhost:5173',
  'https://localhost:3000',
  'https://core.fti.uksw.edu',
]; // Tambahkan URL frontend production Anda di sini

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, or same-origin requests)
    // Also allow file:// for local development
    if (!origin || allowedOrigins.indexOf(origin) !== -1 || origin.startsWith('file://')) {
      callback(null, true);
    } else {
      console.log('CORS blocked origin:', origin);
      callback(null, true); // Allow all origins for development
    }
  }
}));

// 3. Body Parser
app.use(express.json({ limit: '50mb' })); // Tingkatkan limit untuk upload gambar 360 (Base64)

// Konfigurasi Upload (Simpan sementara di folder uploads/)
const upload = multer({ dest: 'uploads/' });

// Konfigurasi Koneksi Database - Sekarang menggunakan environment variables saja (tidak ada fallback)
// Validation function to check required environment variables
const validateDbConfig = () => {
  const requiredVars = ['DB_USER', 'DB_HOST', 'DB_NAME', 'DB_PASSWORD', 'DB_PORT'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    console.error(`âŒ Error: Variabel lingkungan database berikut belum diset: ${missing.join(', ')}`);
    console.error('ðŸ’¡ Silakan pastikan file .env sudah dikonfigurasi dengan benar.');
    process.exit(1);
  }
};

// Validasi konfigurasi database saat startup
validateDbConfig();

// Buat konfigurasi pool dengan keamanan tambahan
const dbConfig = {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT, 10),
  // SSL configuration - wajib untuk production/hosting tertentu
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  // Connection pool settings untuk keamanan dan performa
  max: 20, // max number of clients in the pool
  idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
  connectionTimeoutMillis: 5000, // how long to wait when connecting
};

// Logging konfigurasi database (dengan password tersembunyi)
console.log('ðŸ”„ Menghubungkan ke database...');
console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
console.log(`   Database: ${dbConfig.database}`);
console.log(`   User: ${dbConfig.user}`);
console.log(`   SSL: ${process.env.DB_SSL === 'true' ? 'Enabled' : 'Disabled'}`);

const pool = new Pool(dbConfig);

// Test koneksi database saat startup
pool.query('SELECT NOW()')
  .then(() => {
    console.log('âœ… Berhasil terhubung ke database PostgreSQL');
  })
  .catch((err) => {
    console.error('âŒ Gagal terhubung ke database:', err.message);
    process.exit(1);
  });

// --- DATABASE INDEXES (Optimizations) ---
const createIndexes = async () => {
  const indexes = [
    // Users table indexes
    'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)',
    'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
    'CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)',
    
    // Bookings table indexes
    'CREATE INDEX IF NOT EXISTS idx_bookings_room_id ON bookings(room_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id)',
    'CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)',
    
    // Booking schedules indexes
    'CREATE INDEX IF NOT EXISTS idx_booking_schedules_booking_id ON booking_schedules(booking_id)',
    'CREATE INDEX IF NOT EXISTS idx_booking_schedules_date ON booking_schedules(schedule_date)',
    
    // Inventory indexes
    'CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory(kategori)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_available ON inventory(is_available)',
    'CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(lokasi)',
    
    // Item movements indexes
    'CREATE INDEX IF NOT EXISTS idx_item_movements_inventory_id ON item_movements(inventory_id)',
    'CREATE INDEX IF NOT EXISTS idx_item_movements_date ON item_movements(movement_date)',
    
    // Rooms index
    'CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name)',
  ];

  try {
    for (const indexQuery of indexes) {
      await pool.query(indexQuery);
    }
    console.log('Database indexes created successfully');
  } catch (err) {
    console.error('Error creating indexes:', err);
  }
};

// Create indexes on server start
createIndexes();

// --- 4. Rate Limiting ---
// Mencegah serangan brute-force dengan membatasi jumlah request dari satu IP
// Ditingkatkan limitnya untuk mengakomodasi multiple device scenario
const apiLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 menit
	max: 200, // Ditingkatkan dari 100 ke 200 untuk mengakomodasi lebih banyak request
	standardHeaders: true, 
	legacyHeaders: false, 
  message: { error: 'Terlalu banyak request, silakan coba lagi setelah 15 menit.' }
});

// Terapkan rate limiter ke semua rute API
app.use('/api', apiLimiter);

// --- 5. Role-Based Access Control (RBAC) Middleware ---
const verifyRole = (allowedRoles) => (req, res, next) => {
  if (!req.user || !allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Akses ditolak. Anda tidak memiliki izin yang cukup.' });
  }
  next();
};

// --- MIDDLEWARE: Verifikasi Token JWT (Stateless - tidak perlu DB check) ---
const verifyToken = (req, res, next) => {
  // Path di sini tidak perlu '/api' karena middleware ini sudah di-mount pada '/api'.
  // req.path akan menjadi '/login', bukan '/api/login'.
  // Updated public paths to include sso-config (used on login page)
  const publicPaths = ['/login', '/register', '/set-password', '/settings/maintenance', '/logout', '/settings/sso-config'];
  if (publicPaths.some(path => req.path.startsWith(path)) || req.path === '/') {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <TOKEN>

  if (token == null) {
    return res.status(401).json({ error: 'Akses ditolak. Token tidak disediakan.' });
  }

  // Verify JWT token (stateless - no database check needed)
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token tidak valid atau kadaluarsa.' });
    }
    // Add user payload to request object
    req.user = user;
    next();
  });
};

// Terapkan middleware verifikasi token ke semua rute API
app.use('/api', verifyToken);

// Test Endpoint
app.get('/', (req, res) => {
  res.send('Backend API CORE.FTI is running on port 5000');
});

// Endpoint untuk mengambil data users
app.get('/api/users', verifyRole(['Admin', 'Laboran']), async (req, res) => {
  try {
    // Sort by last_login agar user yang baru aktif (Internal/SSO) muncul paling atas
    const result = await pool.query('SELECT * FROM users ORDER BY last_login DESC NULLS LAST, created_at DESC');
    
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
app.get('/api/users/:id', verifyRole(['Admin', 'Laboran', 'User']), async (req, res) => {
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
      status: row.status,
      lastLogin: row.last_login ? new Date(row.last_login).toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : null,
      memberSince: row.created_at ? new Date(row.created_at).toLocaleString('id-ID', { 
        month: 'long', 
        year: 'numeric' 
      }) : null,
      avatar: row.avatar_image ? `data:image/jpeg;base64,${row.avatar_image.toString('base64')}` : null
    });
  } catch (err) {
    res.status(500).json({ error: 'Gagal mengambil profil' });
  }
});

// Endpoint Get User Account Info (for Profile page)
app.get('/api/users/:id/account-info', verifyRole(['Admin', 'Laboran', 'User']), async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Get user data
    const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) return res.status(404).json({ error: 'User tidak ditemukan' });
    
    const user = userResult.rows[0];
    
    // Get unread notifications count
    const notifResult = await pool.query(
      'SELECT COUNT(*) as unread_count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
      [userId]
    );
    const unreadCount = parseInt(notifResult.rows[0]?.unread_count || '0');
    
    // Get user's booking count
    const bookingResult = await pool.query(
      'SELECT COUNT(*) as total_bookings FROM bookings WHERE user_id = $1',
      [userId]
    );
    const totalBookings = parseInt(bookingResult.rows[0]?.total_bookings || '0');
    
    // Get user's loan count
    const loanResult = await pool.query(
      `SELECT COUNT(DISTINCT l.id) as total_loans 
       FROM loans l 
       JOIN transactions t ON l.transaction_id = t.id 
       WHERE t.peminjam_identifier = $1`,
      [user.identifier]
    );
    const totalLoans = parseInt(loanResult.rows[0]?.total_loans || '0');
    
    res.json({
      status: user.status,
      lastLogin: user.last_login ? new Date(user.last_login).toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }) : 'Belum pernah login',
      memberSince: user.created_at ? new Date(user.created_at).toLocaleString('id-ID', { 
        month: 'long', 
        year: 'numeric' 
      }) : '-',
      passwordChanged: user.password_changed_at ? new Date(user.password_changed_at).toLocaleString('id-ID', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      }) : 'Belum pernah diubah',
      unreadNotifications: unreadCount,
      totalBookings: totalBookings,
      totalLoans: totalLoans
    });
  } catch (err) {
    console.error('Error fetching account info:', err);
    res.status(500).json({ error: 'Gagal mengambil informasi akun' });
  }
});

// Helper function to generate device name from user agent
const getDeviceInfo = (userAgent) => {
  if (!userAgent) return { deviceName: 'Unknown Device', deviceType: 'desktop' };
  
  const ua = userAgent.toLowerCase();
  let deviceName = 'Unknown Device';
  let deviceType = 'desktop';
  
  if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) {
    deviceType = 'mobile';
    if (ua.includes('android')) deviceName = 'Android Phone';
    else if (ua.includes('iphone')) deviceName = 'iPhone';
    else deviceName = 'Mobile Device';
  } else if (ua.includes('tablet') || ua.includes('ipad')) {
    deviceType = 'tablet';
    deviceName = 'Tablet';
  } else if (ua.includes('mac')) {
    deviceName = 'Mac';
  } else if (ua.includes('windows')) {
    deviceName = 'Windows PC';
  } else if (ua.includes('linux')) {
    deviceName = 'Linux PC';
  }
  
  return { deviceName, deviceType };
};

// Endpoint Login (Simplified - No token storage in DB)
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
      // Update last_login on each login
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

      // Cek Status Akun (Hanya 'Aktif' yang boleh login)
      if (user.status !== 'Aktif') {
        return res.status(403).json({ error: 'Akun belum diaktifkan. Hubungi Admin Laboran (Ruang 227 atau 456).' });
      }

      // Cek kelengkapan profil (Opsional)
      const isProfileIncomplete = !user.telepon;

      // Tentukan expiration token (8 jam untuk regular, 30 hari untuk remember me)
      // Kita tetap perlu rememberMe dari frontend untuk menentukan expiry
      const isRememberMe = req.body.rememberMe === true;
      const tokenExpiryHours = isRememberMe ? 30 * 24 : 8;

      // Buat JWT Token (tanpa simpan ke database)
      const tokenPayload = { 
        id: user.id, 
        role: user.role,
        jti: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
      };
      const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: `${tokenExpiryHours}h` });
      const expiresAt = new Date(Date.now() + tokenExpiryHours * 60 * 60 * 1000);

      res.json({ 
        success: true, 
        token,
        id: user.id, 
        role: user.role, 
        name: user.nama, 
        profileIncomplete: isProfileIncomplete,
        isRememberMe: isRememberMe,
        expiresAt: expiresAt.toISOString()
      });
    } else {
      res.status(401).json({ error: 'Password salah.' });
    }
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// **[BARU]** Endpoint Google SSO Login (Updated for Production Security)
app.post('/api/auth/google', async (req, res) => {
  const { accessToken, deviceId } = req.body;

  if (!accessToken) {
    return res.status(400).json({ error: 'Access Token diperlukan.' });
  }

  try {
    // 1. Ambil konfigurasi SSO
    const configRes = await pool.query('SELECT * FROM sso_config LIMIT 1');
    const config = configRes.rows[0];

    if (!config || !config.enabled) {
      return res.status(403).json({ error: 'SSO Login dinonaktifkan oleh administrator.' });
    }

    // 2. [SECURITY CHECK] Verifikasi Token & Client ID via TokenInfo
    // Ini penting untuk production agar token dari aplikasi lain tidak bisa dipakai login kesini
    const tokenInfoRes = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${accessToken}`);
    
    if (!tokenInfoRes.ok) {
      return res.status(401).json({ error: 'Token Google tidak valid atau kadaluarsa.' });
    }

    const tokenInfo = await tokenInfoRes.json();

    // Pastikan token ini diterbitkan KHUSUS untuk Client ID aplikasi kita
    if (tokenInfo.aud !== config.client_id) {
      console.error(`SSO Security Alert: Token audience mismatch. Expected ${config.client_id}, got ${tokenInfo.aud}`);
      return res.status(403).json({ error: 'Validasi keamanan gagal. Token tidak dikenali.' });
    }

    // 3. Ambil Info Detail User (Nama, Foto) via UserInfo
    const googleRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (!googleRes.ok) {
      return res.status(401).json({ error: 'Token Google tidak valid.' });
    }

    const googleUser = await googleRes.json();
    const { email, name, sub: googleId, picture } = googleUser;

    // **[BARU]** Sinkronisasi ke tabel sso_users (agar muncul di Manajemen User > Tab SSO)
    // Menggunakan ON CONFLICT (email) agar data terupdate jika user sudah ada
    const ssoId = `SSO-${Date.now()}`;
    await pool.query(
      `INSERT INTO sso_users (id, email, name, status, updated_at)
       VALUES ($1, $2, $3, 'Aktif', NOW())
       ON CONFLICT (email) DO UPDATE SET
       name = EXCLUDED.name, updated_at = NOW()`,
      [ssoId, email, name]
    );

    // 4. Validasi Domain (Support multiple domains, separated by comma)
    if (config.domain) {
      const allowedDomains = config.domain.split(',').map(d => d.trim());
      const isAllowed = allowedDomains.some(domain => email.endsWith(`@${domain}`));
      
      if (!isAllowed) {
        return res.status(403).json({ error: `Akses ditolak. Email harus menggunakan domain: ${allowedDomains.join(', ')}` });
      }
    }

    // 5. Cek apakah user sudah ada di database
    const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    let user = userCheck.rows[0];

    if (!user) {
      // --- AUTO REGISTER USER BARU ---
      const newId = `USER-${Date.now()}`;
      const username = email.split('@')[0]; // Gunakan bagian depan email sebagai username
      
      // Insert User Baru (Role: User, Status: Aktif)
      const insertQuery = `
        INSERT INTO users (id, nama, email, username, password, role, identifier, status, created_at)
        VALUES ($1, $2, $3, $4, NULL, 'User', $5, 'Aktif', NOW())
        RETURNING *
      `;
      // Identifier default menggunakan bagian depan email jika tidak ada info lain
      const newUserRes = await pool.query(insertQuery, [newId, name, email, username, username]);
      user = newUserRes.rows[0];

      // Buat Notifikasi untuk Admin (Info user baru via SSO)
      const notifId = `NOTIF-${Date.now()}`;
      await pool.query(
        "INSERT INTO notifications (id, user_id, title, message, type) VALUES ($1, NULL, $2, $3, 'info')",
        [notifId, 'User Baru via SSO', `User ${name} (${email}) telah mendaftar otomatis via Google SSO.`]
      );
    } else {
      // Jika user ada tapi status Non-Aktif
      if (user.status !== 'Aktif') {
        return res.status(403).json({ error: 'Akun Anda dinonaktifkan. Hubungi Admin.' });
      }
      // Update last login
      await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    }

    // 6. Generate Token JWT (Sama seperti login biasa)
    const tokenPayload = { 
      id: user.id, 
      role: user.role,
      jti: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
    };
    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    res.json({ success: true, token, id: user.id, role: user.role, name: user.nama, expiresAt: expiresAt.toISOString() });
  } catch (err) {
    console.error('SSO Login Error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan saat login dengan Google.' });
  }
});

// **[BARU]** Endpoint Refresh Token (for Remember Me auto-login)
app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken, deviceId } = req.body;

  if (!refreshToken || !deviceId) {
    return res.status(400).json({ error: 'Refresh token dan device ID diperlukan.' });
  }

  try {
    // Find the session with this refresh token and device ID
    const result = await pool.query(
      `SELECT ut.*, u.role, u.nama, u.status 
       FROM user_tokens ut 
       JOIN users u ON ut.user_id = u.id 
       WHERE ut.refresh_token = $1 AND ut.device_id = $2 AND ut.is_active = TRUE`,

       [refreshToken, deviceId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Sesi tidak valid atau telah kadaluarsa.' });
    }

    const session = result.rows[0];

    // Check if refresh token is still valid
    if (session.refresh_token_expires_at && new Date(session.refresh_token_expires_at) < new Date()) {
      return res.status(401).json({ error: 'Sesi telah kadaluarsa. Silakan login kembali.' });
    }

    // Check if user is still active
    if (session.status !== 'Aktif') {
      return res.status(403).json({ error: 'Akun sudah tidak aktif.' });
    }

    // Generate new access token
    const tokenPayload = { 
      id: session.user_id, 
      role: session.role,
      jti: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex')
    };
    const newToken = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });
    const newExpiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

    // Update token in database
    await pool.query(
      'UPDATE user_tokens SET token = $1, expires_at = $2, last_used_at = NOW() WHERE id = $3',
      [newToken, newExpiresAt, session.id]
    );

    res.json({
      success: true,
      token: newToken,
      expiresAt: newExpiresAt.toISOString()
    });
  } catch (err) {
    console.error('Token refresh error:', err);
    res.status(500).json({ error: 'Gagal memperbarui sesi.' });
  }
});

// **[BARU]** Endpoint Get User Sessions (List all active sessions)
app.get('/api/auth/sessions', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token tidak disediakan.' });
  }

  try {
    // Verify token and get user
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get all active sessions for this user
    const result = await pool.query(
      `SELECT id, device_id, device_name, device_type, ip_address, user_agent, is_remember_me, created_at, last_used_at, expires_at
       FROM user_tokens 
       WHERE user_id = $1 AND is_active = TRUE
       ORDER BY last_used_at DESC`,
      [decoded.id]
    );

    const sessions = result.rows.map(row => ({
      id: row.id,
      deviceId: row.device_id,
      deviceName: row.device_name,
      deviceType: row.device_type,
      ipAddress: row.ip_address,
      isRememberMe: row.is_remember_me,
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
      expiresAt: row.expires_at,
      isCurrentSession: row.token === token // Mark the current session
    }));

    res.json({ sessions });
  } catch (err) {
    console.error('Get sessions error:', err);
    res.status(500).json({ error: 'Gagal mengambil data sesi.' });
  }
});

// **[BARU]** Endpoint Revoke Specific Session
app.delete('/api/auth/sessions/:deviceId', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const { deviceId } = req.params;

  if (!token) {
    return res.status(401).json({ error: 'Token tidak disediakan.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if trying to revoke own session
    const sessionResult = await pool.query(
      'SELECT token FROM user_tokens WHERE device_id = $1 AND user_id = $2 AND is_active = TRUE',
      [deviceId, decoded.id]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesi tidak ditemukan.' });
    }

    // If trying to revoke current session, deny (user should use logout)
    if (sessionResult.rows[0].token === token) {
      return res.status(400).json({ error: 'Gunakan logout untuk mengakhiri sesi saat ini.' });
    }

    // Revoke the session
    await pool.query(
      'UPDATE user_tokens SET is_active = FALSE WHERE device_id = $1 AND user_id = $2',
      [deviceId, decoded.id]
    );

    res.json({ success: true, message: 'Sesi berhasil dicabut.' });
  } catch (err) {
    console.error('Revoke session error:', err);
    res.status(500).json({ error: 'Gagal mencabut sesi.' });
  }
});

// **[BARU]** Endpoint Logout from All Devices
app.post('/api/auth/logout-all', async (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token tidak disediakan.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Revoke all sessions except current one
    await pool.query(
      'UPDATE user_tokens SET is_active = FALSE WHERE user_id = $1 AND token != $2',
      [decoded.id, token]
    );

    res.json({ success: true, message: 'Semua sesi lain telah diakhiri.' });
  } catch (err) {
    console.error('Logout all error:', err);
    res.status(500).json({ error: 'Gagal mengakhiri semua sesi.' });
  }
});

// Endpoint Logout (Simplified - stateless, no DB operations needed)
app.post('/api/logout', async (req, res) => {
  // Since we're using stateless JWT, we just return success
  // The client should discard the token locally
  res.json({ success: true, message: 'Logout berhasil.' });
});

// Endpoint Set Password Baru (Setelah Reset Admin)
app.post('/api/set-password', async (req, res) => {
  const { email, newPassword } = req.body;

  try {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Update password, status aktif, dan password_changed_at
    await pool.query('UPDATE users SET password = $1, status = $2, password_changed_at = NOW() WHERE email = $3', [hashedPassword, 'Aktif', email]);

    res.json({ success: true, message: 'Password berhasil diperbarui. Silakan login.' });
  } catch (err) {
    console.error('Set password error:', err);
    res.status(500).json({ error: 'Gagal memperbarui password.' });
  }
});

// Endpoint Check User Existence (Untuk Lupa Password)
app.post('/api/check-user-exists', async (req, res) => {
  const { identifier } = req.body;
  try {
    const result = await pool.query('SELECT id, nama FROM users WHERE email = $1 OR username = $1', [identifier]);
    if (result.rows.length > 0) {
      res.json({ exists: true, name: result.rows[0].nama });
    } else {
      res.json({ exists: false });
    }
  } catch (err) {
    console.error('Check user exists error:', err);
    res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
});

// Endpoint Register (Buat Akun Baru)
app.post('/api/register', 
  // --- 6. Input Validation ---
  body('email', 'Format email tidak valid').isEmail().normalizeEmail(),
  body('password', 'Password minimal 8 karakter').isLength({ min: 8 }),
  body('fullName', 'Nama lengkap tidak boleh kosong').notEmpty().trim().escape(),
  body('username', 'Username tidak boleh kosong').notEmpty().trim().escape(),
  body('username', 'Username tidak boleh mengandung spasi').custom(value => !/\s/.test(value)),
  async (req, res) => {
  
  // Cek hasil validasi
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: errors.array()[0].msg });
  }
    
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
app.put('/api/users/:id/status', verifyRole(['Admin']), async (req, res) => {
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
app.put('/api/users/:id/reset-password', verifyRole(['Admin']), async (req, res) => {
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

// Create User (Admin) - Set password to NULL so user must create new password on first login
app.post('/api/users', verifyRole(['Admin']), async (req, res) => {
  const { name, email, username, role, identifier, status, phone } = req.body;
  try {
    const check = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (check.rows.length > 0) return res.status(400).json({ error: 'Email atau Username sudah terdaftar.' });

    // Set password to NULL so user must reset password like admin reset
    const id = `USER-${Date.now()}`;

    await pool.query(
      "INSERT INTO users (id, nama, email, username, password, role, identifier, status, telepon) VALUES ($1, $2, $3, $4, NULL, $5, $6, $7, $8)",
      [id, name, email, username, role, identifier, status, phone]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Create user failed' });
  }
});

// Update User
app.put('/api/users/:id', verifyRole(['Admin', 'User']), async (req, res) => {
  const { name, email, username, identifier, phone, avatar, role } = req.body;
  try {
    // Cek apakah username atau email sudah digunakan user lain
    const check = await pool.query(
      'SELECT id FROM users WHERE (username = $1 OR email = $2) AND id != $3',
      [username, email, req.params.id]
    );
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Username atau Email sudah digunakan user lain.' });
    }

    let query = "UPDATE users SET nama=$1, email=$2, username=$3, identifier=$4, telepon=$5";
    let params = [name, email, username, identifier, phone];
    let paramIndex = 6;

    // Update Role jika dikirim (Hanya Admin yang bisa kirim ini dari frontend)
    // Dan pastikan hanya admin yang bisa mengubah role
    if (role && req.user.role === 'Admin') {
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
app.delete('/api/users/:id', verifyRole(['Admin']), async (req, res) => {
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

// --- PKL STUDENTS (Tabel: pkl_students) ---

// Get All PKL Students
app.get('/api/pkl', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT p.*, s.nama as pembimbing_nama 
      FROM pkl_students p 
      LEFT JOIN staff s ON p.pembimbing_id = s.id
      ORDER BY p.created_at DESC
    `);
    
    const pklStudents = result.rows.map(row => ({
      id: row.id,
      nama: row.nama_siswa,
      sekolah: row.sekolah,
      Jurusan: row.jurusan,
      tanggalMulai: row.tanggal_mulai ? new Date(row.tanggal_mulai).toLocaleDateString('en-CA') : '',
      tanggalSelesai: row.tanggal_selesai ? new Date(row.tanggal_selesai).toLocaleDateString('en-CA') : '',
      status: row.status,
      suratPengajuan: row.surat_pengajuan ? `data:application/pdf;base64,${row.surat_pengajuan.toString('base64')}` : undefined,
      pembimbingId: row.pembimbing_id,
      pembimbingNama: row.pembimbing_nama,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    
    res.json(pklStudents);
  } catch (err) {
    console.error('Get PKL error:', err);
    res.status(500).json({ error: 'Gagal mengambil data PKL.' });
  }
});

// Add New PKL Student (Single or Batch)
app.post('/api/pkl', async (req, res) => {
  const { students } = req.body;
  
  // students bisa berupa array (batch) atau single object
  const studentList = Array.isArray(students) ? students : [students];
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const student of studentList) {
      const { nama, sekolah, Jurusan, tanggalMulai, tanggalSelesai, pembimbingId, suratPengajuan } = student;
      
      // Konversi file PDF jika ada
      let suratBuffer = null;
      if (suratPengajuan && suratPengajuan.startsWith('data:application/pdf')) {
        const base64Data = suratPengajuan.split(',')[1];
        suratBuffer = Buffer.from(base64Data, 'base64');
        
        // Validasi ukuran: Max 5MB
        if (suratBuffer.length > 5 * 1024 * 1024) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: 'Ukuran file surat pengajuan melebihi batas maksimum 5MB.' });
        }
      }
      
      const id = `PKL-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
      
      await client.query(
        `INSERT INTO pkl_students (id, nama_siswa, sekolah, Jurusan, tanggal_mulai, tanggal_selesai, pembimbing_id, surat_pengajuan, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Aktif')`,
        [id, nama, sekolah, Jurusan, tanggalMulai, tanggalSelesai, pembimbingId || null, suratBuffer]
      );
    }
    
    await client.query('COMMIT');
    res.json({ success: true, message: `${studentList.length} data PKL berhasil ditambahkan.` });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Add PKL error:', err);
    res.status(500).json({ error: 'Gagal menambah data PKL.' });
  } finally {
    client.release();
  }
});

// Update PKL Student
app.put('/api/pkl/:id', async (req, res) => {
  const { id } = req.params;
  const { nama, sekolah, Jurusan, tanggalMulai, tanggalSelesai, status, pembimbingId, suratPengajuan } = req.body;
  
  try {
    // Cek jika ada file baru
    let suratBuffer = null;
    if (suratPengajuan && suratPengajuan.startsWith('data:application/pdf')) {
      const base64Data = suratPengajuan.split(',')[1];
      suratBuffer = Buffer.from(base64Data, 'base64');
      
      // Validasi ukuran
      if (suratBuffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Ukuran file surat pengajuan melebihi batas maksimum 5MB.' });
      }
      
      // Update dengan file baru
      await pool.query(
        `UPDATE pkl_students SET nama_siswa=$1, sekolah=$2, Jurusan=$3, tanggal_mulai=$4, tanggal_selesai=$5, status=$6, pembimbing_id=$7, surat_pengajuan=$8, updated_at=CURRENT_TIMESTAMP WHERE id=$9`,
        [nama, sekolah, Jurusan, tanggalMulai, tanggalSelesai, status, pembimbingId || null, suratBuffer, id]
      );
    } else {
      // Update tanpa mengubah file
      await pool.query(
        `UPDATE pkl_students SET nama_siswa=$1, sekolah=$2, Jurusan=$3, tanggal_mulai=$4, tanggal_selesai=$5, status=$6, pembimbing_id=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8`,
        [nama, sekolah, Jurusan, tanggalMulai, tanggalSelesai, status, pembimbingId || null, id]
      );
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update PKL error:', err);
    res.status(500).json({ error: 'Gagal update data PKL.' });
  }
});

// Delete PKL Student
app.delete('/api/pkl/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM pkl_students WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete PKL error:', err);
    res.status(500).json({ error: 'Gagal menghapus data PKL.' });
  }
});

// --- CLASS SCHEDULES (Jadwal Kuliah) ---

// Get All Class Schedules
app.get('/api/class-schedules', async (req, res) => {
  try {
    const { semester, academicYear, roomId } = req.query;
    
    let query = 'SELECT cs.*, r.name as room_name FROM class_schedules cs LEFT JOIN rooms r ON cs.room_id = r.id';
    let params = [];
    let conditions = [];
    
    if (semester) {
      params.push(semester);
      conditions.push(`cs.semester = $${params.length}`);
    }
    
    if (academicYear) {
      params.push(academicYear);
      conditions.push(`cs.academic_year = $${params.length}`);
    }
    
    if (roomId) {
      params.push(roomId);
      conditions.push(`cs.room_id = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY cs.day_of_week, cs.start_time';
    
    const result = await pool.query(query, params);
    
    const schedules = result.rows.map(row => ({
      id: row.id,
      courseCode: row.course_code,
      courseName: row.course_name,
      classGroup: row.class_group,
      dayOfWeek: row.day_of_week,
      startTime: row.start_time ? row.start_time.substring(0, 5) : '',
      endTime: row.end_time ? row.end_time.substring(0, 5) : '',
      semester: row.semester,
      academicYear: row.academic_year,
      roomId: row.room_id,
      roomName: row.room_name,
      lecturerName: row.lecturer_name
    }));
    
    res.json(schedules);
  } catch (err) {
    console.error('Get class schedules error:', err);
    res.status(500).json({ error: 'Gagal mengambil jadwal kelas.' });
  }
});

// Add New Class Schedule
app.post('/api/class-schedules', async (req, res) => {
  const { courseCode, courseName, classGroup, dayOfWeek, startTime, endTime, semester, academicYear, roomId, lecturerName } = req.body;
  
  try {
    const id = `CLASS-${Date.now()}`;
    
    await pool.query(
      `INSERT INTO class_schedules (id, course_code, course_name, class_group, day_of_week, start_time, end_time, semester, academic_year, room_id, lecturer_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [id, courseCode, courseName, classGroup, dayOfWeek, startTime, endTime, semester, academicYear, roomId || null, lecturerName || null]
    );
    
    res.json({ success: true, id });
  } catch (err) {
    console.error('Add class schedule error:', err);
    res.status(500).json({ error: 'Gagal menambah jadwal kelas.' });
  }
});

// Update Class Schedule
app.put('/api/class-schedules/:id', async (req, res) => {
  const { id } = req.params;
  const { courseCode, courseName, classGroup, dayOfWeek, startTime, endTime, semester, academicYear, roomId, lecturerName } = req.body;
  
  try {
    await pool.query(
      `UPDATE class_schedules SET course_code = $1, course_name = $2, class_group = $3, day_of_week = $4, start_time = $5, end_time = $6, semester = $7, academic_year = $8, room_id = $9, lecturer_name = $10, updated_at = CURRENT_TIMESTAMP WHERE id = $11`,
      [courseCode, courseName, classGroup, dayOfWeek, startTime, endTime, semester, academicYear, roomId || null, lecturerName || null, id]
    );
    
    res.json({ success: true });
  } catch (err) {
    console.error('Update class schedule error:', err);
    res.status(500).json({ error: 'Gagal update jadwal kelas.' });
  }
});

// Delete Class Schedule
app.delete('/api/class-schedules/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM class_schedules WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete class schedule error:', err);
    res.status(500).json({ error: 'Gagal menghapus jadwal kelas.' });
  }
});

// Delete All Class Schedules by Semester (Reset)
app.delete('/api/class-schedules', async (req, res) => {
  const { semester, academicYear } = req.body;
  
  if (!semester || !academicYear) {
    return res.status(400).json({ error: 'Semester dan academic year wajib diisi.' });
  }
  
  try {
    await pool.query('DELETE FROM class_schedules WHERE semester = $1 AND academic_year = $2', [semester, academicYear]);
    res.json({ success: true, message: 'Semua jadwal kelas semester tersebut telah dihapus.' });
  } catch (err) {
    console.error('Delete all class schedules error:', err);
    res.status(500).json({ error: 'Gagal menghapus jadwal kelas.' });
  }
});

// --- INVENTORY

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
      serialNumber: row.serial_number,
      location: row.lokasi
    }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/inventory', async (req, res) => {
  const { id, ukswCode, name, category, condition, isAvailable, serialNumber, location } = req.body;
  try {
    await pool.query(
      'INSERT INTO inventory (id, uksw_code, nama, kategori, kondisi, is_available, serial_number, lokasi) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [id, ukswCode, name, category, condition, isAvailable, serialNumber, location || '']
    );
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.put('/api/inventory/:id', async (req, res) => {
  const { ukswCode, name, category, condition, isAvailable, serialNumber, location } = req.body;
  try {
    await pool.query(
      'UPDATE inventory SET uksw_code=$1, nama=$2, kategori=$3, kondisi=$4, is_available=$5, serial_number=$6, lokasi=$7 WHERE id=$8',
      [ukswCode, name, category, condition, isAvailable, serialNumber, location || '', req.params.id]
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


// --- ITEM MOVEMENTS (Tabel: item_movements) ---

app.get('/api/item-movements', async (req, res) => {
  try {
    const { inventoryId } = req.query;
    let query = `
      SELECT m.*, i.nama as inventory_name 
      FROM item_movements m 
      LEFT JOIN inventory i ON m.inventory_id = i.id
    `;
    let params = [];
    
    if (inventoryId) {
      query += ' WHERE m.inventory_id = $1';
      params.push(inventoryId);
    }
    
    query += ' ORDER BY m.created_at DESC';
    
    const result = await pool.query(query, params);
    const movements = result.rows.map(row => ({
      id: row.id,
      inventoryId: row.inventory_id,
      inventoryName: row.inventory_name,
      movementDate: row.movement_date ? new Date(row.movement_date).toLocaleDateString('en-CA') : '',
      movementType: row.movement_type,
      fromPerson: row.from_person,
      toPerson: row.to_person,
      movedBy: row.moved_by,
      quantity: row.quantity,
      fromLocation: row.from_location,
      toLocation: row.to_location,
      notes: row.notes,
      loanId: row.loan_id,
      createdAt: row.created_at
    }));
    res.json(movements);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.post('/api/item-movements', async (req, res) => {
  const { inventoryId, movementDate, movementType, fromPerson, toPerson, movedBy, quantity, fromLocation, toLocation, notes, loanId } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const id = `MOV-${Date.now()}`;
    
    // Insert movement record
    await client.query(
      `INSERT INTO item_movements (id, inventory_id, movement_date, movement_type, from_person, to_person, moved_by, quantity, from_location, to_location, notes, loan_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, inventoryId, movementDate, movementType, fromPerson, toPerson, movedBy, quantity || 1, fromLocation, toLocation, notes, loanId || null]
    );
    
    // Update inventory location to new location
    if (toLocation) {
      await client.query('UPDATE inventory SET lokasi = $1 WHERE id = $2', [toLocation, inventoryId]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true, id });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  } finally {
    client.release();
  }
});

app.delete('/api/item-movements/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM item_movements WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'DB Error' });
  }
});

// Undo Movement (Batalkan Perpindahan Terakhir)
app.post('/api/item-movements/:id/undo', async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Ambil data movement yang mau di-undo
    const moveRes = await client.query('SELECT * FROM item_movements WHERE id = $1', [id]);
    if (moveRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Data perpindahan tidak ditemukan.' });
    }
    const movement = moveRes.rows[0];

    // 2. Validasi: Jangan izinkan undo jika berasal dari Peminjaman (harus lewat menu Loans)
    if (movement.loan_id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Perpindahan ini terkait Peminjaman. Gunakan menu Peminjaman untuk membatalkan.' });
    }

    // 3. Validasi: Cek apakah ini movement terakhir untuk barang tersebut?
    const lastRes = await client.query(
      'SELECT id FROM item_movements WHERE inventory_id = $1 ORDER BY created_at DESC LIMIT 1',
      [movement.inventory_id]
    );

    if (lastRes.rows.length > 0 && lastRes.rows[0].id !== id) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Hanya perpindahan terakhir yang dapat dibatalkan demi konsistensi data.' });
    }

    // 4. Kembalikan lokasi barang ke 'from_location' & Hapus record
    await client.query('UPDATE inventory SET lokasi = $1 WHERE id = $2', [movement.from_location || '', movement.inventory_id]);
    await client.query('DELETE FROM item_movements WHERE id = $1', [id]);

    await client.query('COMMIT');
    res.json({ success: true, message: 'Perpindahan berhasil dibatalkan.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Undo movement error:', err);
    res.status(500).json({ error: 'Gagal membatalkan perpindahan.' });
  } finally {
    client.release();
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

// --- ROOM COMPUTERS (Spesifikasi) ---

// Get All Computers in a Room
app.get('/api/rooms/:id/computers', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM room_computers WHERE room_id = $1 ORDER BY pc_number ASC', [req.params.id]);
    const computers = result.rows.map(row => ({
      id: row.id,
      roomId: row.room_id,
      pcNumber: row.pc_number,
      cpu: row.cpu,
      gpuType: row.gpu_type,
      gpuModel: row.gpu_model,
      vram: row.vram,
      ram: row.ram,
      storage: row.storage,
      os: row.os,
      keyboard: row.keyboard,
      mouse: row.mouse,
      monitor: row.monitor,
      condition: row.condition
    }));
    res.json(computers);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

// Get Dominant Spec Summary for a Room
app.get('/api/rooms/:id/specs-summary', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM room_computers WHERE room_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.json(null);

    // Hitung frekuensi spesifikasi yang sama
    const counts = {};
    let maxCount = 0;
    let dominant = null;

    for (const pc of result.rows) {
        // Buat signature key dari spek (kecuali ID dan Nomor PC)
        const key = JSON.stringify({
            cpu: pc.cpu, gpu_type: pc.gpu_type, gpu_model: pc.gpu_model,
            vram: pc.vram, ram: pc.ram, storage: pc.storage,
            os: pc.os, keyboard: pc.keyboard, mouse: pc.mouse, monitor: pc.monitor
        });
        
        counts[key] = (counts[key] || 0) + 1;
        if (counts[key] > maxCount) {
            maxCount = counts[key];
            dominant = JSON.parse(key);
        }
    }
    
    res.json({ ...dominant, totalUnits: result.rows.length, dominantCount: maxCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

// Add/Update Computer
app.post('/api/computers', async (req, res) => {
  const { id, roomId, pcNumber, cpu, gpuType, gpuModel, vram, ram, storage, os, keyboard, mouse, monitor, condition } = req.body;
  try {
    // Upsert (Insert or Update)
    const query = `
      INSERT INTO room_computers (id, room_id, pc_number, cpu, gpu_type, gpu_model, vram, ram, storage, os, keyboard, mouse, monitor, condition)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      ON CONFLICT (id) DO UPDATE SET
      pc_number=$3, cpu=$4, gpu_type=$5, gpu_model=$6, vram=$7, ram=$8, storage=$9, os=$10, keyboard=$11, mouse=$12, monitor=$13, condition=$14
    `;
    await pool.query(query, [id, roomId, pcNumber, cpu, gpuType, gpuModel, vram, ram, storage, os, keyboard, mouse, monitor, condition || 'Baik']);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

// Delete All Computers in a Room (Reset)
app.delete('/api/rooms/:id/computers', async (req, res) => {
  try {
    await pool.query('DELETE FROM room_computers WHERE room_id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'DB Error' });
  }
});

app.delete('/api/computers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM room_computers WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'DB Error' });
  }
});

// --- SOFTWARE (Tabel: software) ---

// Get All Software
app.get('/api/software', async (req, res) => {
  try {
    const { roomId, category } = req.query;
    let query = `
      SELECT s.*, r.name as room_name 
      FROM software s 
      LEFT JOIN rooms r ON s.room_id = r.id
    `;
    let params = [];
    let conditions = [];
    
    if (roomId) {
      params.push(roomId);
      conditions.push(`s.room_id = $${params.length}`);
    }
    
    if (category) {
      params.push(category);
      conditions.push(`s.category = $${params.length}`);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY s.name ASC';
    
    const result = await pool.query(query, params);
    const software = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      version: row.version,
      licenseType: row.license_type,
      licenseKey: row.license_key,
      vendor: row.vendor,
      installDate: row.install_date ? new Date(row.install_date).toLocaleDateString('en-CA') : '',
      roomId: row.room_id,
      roomName: row.room_name,
      notes: row.notes,
      category: row.category
    }));
    res.json(software);
  } catch (err) {
    console.error('Get software error:', err);
    res.status(500).json({ error: 'Gagal mengambil data software.' });
  }
});

// Add New Software
app.post('/api/software', async (req, res) => {
  const { name, version, licenseType, licenseKey, vendor, installDate, roomId, notes, category } = req.body;
  try {
    const id = `SOFT-${Date.now()}`;
    await pool.query(
      `INSERT INTO software (id, name, version, license_type, license_key, vendor, install_date, room_id, notes, category) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, name, version, licenseType, licenseKey || null, vendor || null, installDate || null, roomId || null, notes || null, category || null]
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Add software error:', err);
    res.status(500).json({ error: 'Gagal menambah software.' });
  }
});

// Update Software
app.put('/api/software/:id', async (req, res) => {
  const { id } = req.params;
  const { name, version, licenseType, licenseKey, vendor, installDate, roomId, notes, category } = req.body;
  try {
    await pool.query(
      `UPDATE software SET name=$1, version=$2, license_type=$3, license_key=$4, vendor=$5, install_date=$6, room_id=$7, notes=$8, category=$9, updated_at=CURRENT_TIMESTAMP WHERE id=$10`,
      [name, version, licenseType, licenseKey || null, vendor || null, installDate || null, roomId || null, notes || null, category || null, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update software error:', err);
    res.status(500).json({ error: 'Gagal update software.' });
  }
});

// Delete Software
app.delete('/api/software/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM software WHERE id=$1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Gagal menghapus software.' });
  }
});

// --- BOOKINGS (Tabel: bookings & booking_schedules) ---

app.get('/api/bookings', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT b.*, u.nama as user_name, r.name as room_name, 
                   (SELECT string_agg(s.nama, ', ') FROM staff s WHERE s.id = ANY(b.tech_support_pic)) as tech_pic_name,
                   bs.schedule_date, bs.start_time, bs.end_time,
                   (SELECT json_agg(json_build_object('date', bs2.schedule_date, 'startTime', bs2.start_time, 'endTime', bs2.end_time) ORDER BY bs2.schedule_date)
                    FROM booking_schedules bs2 
                    WHERE bs2.booking_id = b.id) as all_schedules
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
            schedules: row.all_schedules || [], // All schedules as array
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
        // Gunakan 'Pending' (Title Case) agar cocok dengan tipe ENUM di DB
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
        // Frontend mengirim 'APPROVED' atau 'REJECTED', kita konversi ke nilai ENUM di DB
        // FIX: Cek juga value enum ('Disetujui'/'Ditolak') karena frontend mengirim value tersebut
        if (status === 'APPROVED' || status === 'Disetujui') {
             // Update status beserta data technical support
             await pool.query('UPDATE bookings SET status=$1, tech_support_pic=$2, tech_support_needs=$3, rejection_reason=NULL WHERE id=$4', 
                ['Disetujui', techSupportPic, techSupportNeeds, req.params.id]);
        } else if (status === 'REJECTED' || status === 'Ditolak') {
             await pool.query('UPDATE bookings SET status=$1, rejection_reason=$2 WHERE id=$3', 
                ['Ditolak', rejectionReason, req.params.id]);
        } else {
             // Untuk status lain seperti 'Dibatalkan' jika ada
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

            if (status === 'APPROVED' || status === 'Disetujui') { 
                title = 'Peminjaman Disetujui';
                message = `Pengajuan "${keperluan}" telah disetujui.`;
                type = 'success';
            } else if (status === 'REJECTED' || status === 'Ditolak') {
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

// DELETE Booking (Hapus permanen dari database)
app.delete('/api/bookings/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Hapus terlebih dahulu dari booking_schedules (child table)
        await client.query('DELETE FROM booking_schedules WHERE booking_id = $1', [id]);
        
        // 2. Hapus dari bookings (parent table)
        await client.query('DELETE FROM bookings WHERE id = $1', [id]);
        
        await client.query('COMMIT');
        res.json({ success: true, message: 'Booking berhasil dihapus dari database.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Delete booking error:', err);
        res.status(500).json({ error: 'Gagal menghapus booking.' });
    } finally {
        client.release();
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
    const { equipmentIds, borrowerName, nim, guarantee, borrowDate, borrowTime, borrowOfficer, location } = req.body;
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
            
            // Ambil lokasi lama sebelum update
            const invRes = await client.query('SELECT nama, lokasi FROM inventory WHERE id = $1', [eqId]);
            const invName = invRes.rows[0]?.nama || eqId;
            const fromLocation = invRes.rows[0]?.lokasi || '';
            
            // Update inventory is_available
            await client.query('UPDATE inventory SET is_available = FALSE WHERE id = $1', [eqId]);
            
            // Auto-create item_movement untuk peminjaman
            const movId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await client.query(
                `INSERT INTO item_movements (id, inventory_id, movement_date, movement_type, from_person, to_person, moved_by, quantity, from_location, to_location, loan_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [movId, eqId, borrowDate, 'Peminjaman', borrowOfficer, borrowerName, borrowOfficer, 1, fromLocation, location || fromLocation, loanId]
            );
            
            // Update lokasi inventory
            if (location) {
                await client.query('UPDATE inventory SET lokasi = $1 WHERE id = $2', [location, eqId]);
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
    // Ambil user ID dari token yang sudah diverifikasi oleh middleware
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'User ID tidak ditemukan dari token.' });

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

// Endpoint Mark All as Read
app.put('/api/notifications/read-all', async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    try {
        const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        const role = userRes.rows[0]?.role;

        let query = 'UPDATE notifications SET is_read = TRUE WHERE user_id = $1';
        const params = [userId];

        if (role === 'Admin') {
             query = 'UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id IS NULL';
        }

        await pool.query(query, params);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Update failed' });
    }
});

// Endpoint Delete All Notifications
app.delete('/api/notifications', async (req, res) => {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const userRes = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        const role = userRes.rows[0]?.role;

        // Hapus notifikasi milik user. Jika Admin, hapus juga notifikasi sistem (NULL)
        let query = 'DELETE FROM notifications WHERE user_id = $1' + (role === 'Admin' ? ' OR user_id IS NULL' : '');
        
        await pool.query(query, [userId]);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete notifications error:', err);
        res.status(500).json({ error: 'Gagal menghapus notifikasi.' });
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

// Endpoint Backup Database using pg_dump
app.get('/api/settings/backup', async (req, res) => {
  const date = new Date().toISOString().replace(/[:.]/g, '-');
const filename = `backup-corefti-${date}.sql`;

  // Set Header agar browser mengenali ini sebagai file download
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/sql');

  try {
    // Menggunakan pg_dump native via child_process
    // Pastikan pg_dump terinstall di server (apt install postgresql-client)
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const dump = spawn('pg_dump', [
      '-h', dbConfig.host,
      '-p', String(dbConfig.port),
      '-U', dbConfig.user,
      '--clean',      // Tambahkan perintah DROP TABLE sebelum CREATE
      '--if-exists',  // Tambahkan IF EXISTS pada perintah DROP
      '--no-owner',   // Skip ownership commands
      '--no-acl',     // Skip privileges
      dbConfig.database
    ], { env });

    // Pipe output langsung ke response stream
    dump.stdout.pipe(res);

    dump.stderr.on('data', (data) => {
      console.error(`pg_dump error: ${data}`);
    });

    dump.on('close', (code) => {
      if (code !== 0) {
        console.error(`pg_dump process exited with code ${code}`);
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Gagal melakukan backup database: ' + error.message });
    }
  }
});

// Endpoint Restore Database (Upload SQL File) - Native psql implementation
app.post('/api/settings/restore', upload.single('backupFile'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Tidak ada file yang diupload.' });
  }

  const filePath = req.file.path;

  try {
    // Menggunakan psql native via child_process untuk restore
    const env = { ...process.env, PGPASSWORD: dbConfig.password };
    
    const psql = spawn('psql', [
      '-h', dbConfig.host,
      '-p', String(dbConfig.port),
      '-U', dbConfig.user,
      '-d', dbConfig.database,
      '-f', filePath
    ], { env });

    let errorLog = '';
    psql.stderr.on('data', (data) => {
      errorLog += data.toString();
    });

    psql.on('close', (code) => {
      // Hapus file temporary setelah selesai
      try { fs.unlinkSync(filePath); } catch (e) {}

      if (code === 0) {
        res.json({ success: true, message: 'Database berhasil direstore.' });
      } else {
        console.error('Restore failed:', errorLog);
        res.status(500).json({ error: 'Gagal merestore database via psql. Cek log server.' });
      }
    });
  } catch (error) {
    console.error('Restore error:', error);
    try { fs.unlinkSync(filePath); } catch (e) {}
    res.status(500).json({ error: 'Gagal merestore database: ' + error.message });
  }
});

// Endpoint Read Error Log (Legacy - from file)
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

// --- ERROR LOGS API (Database-based) ---

// Get Error Logs with filtering
app.get('/api/error-logs', async (req, res) => {
  try {
    const { type, severity, resolved, startDate, endDate, limit = 100, offset = 0 } = req.query;
    
    let query = 'SELECT * FROM error_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (type) {
      query += ` AND error_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (severity) {
      query += ` AND severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (resolved !== undefined) {
      query += ` AND is_resolved = $${paramIndex}`;
      params.push(resolved === 'true');
      paramIndex++;
    }

    if (startDate) {
      query += ` AND created_at >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND created_at <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM error_logs WHERE 1=1';
    const countParams = [];
    let countIndex = 1;

    if (type) {
      countQuery += ` AND error_type = $${countIndex}`;
      countParams.push(type);
      countIndex++;
    }
    if (severity) {
      countQuery += ` AND severity = $${countIndex}`;
      countParams.push(severity);
      countIndex++;
    }
    if (resolved !== undefined) {
      countQuery += ` AND is_resolved = $${countIndex}`;
      countParams.push(resolved === 'true');
      countIndex++;
    }
    if (startDate) {
      countQuery += ` AND created_at >= $${countIndex}`;
      countParams.push(startDate);
      countIndex++;
    }
    if (endDate) {
      countQuery += ` AND created_at <= $${countIndex}`;
      countParams.push(endDate);
      countIndex++;
    }

    const countResult = await pool.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    const logs = result.rows.map(row => ({
      id: row.id,
      errorType: row.error_type,
      errorMessage: row.error_message,
      errorStack: row.error_stack,
      endpoint: row.endpoint,
      method: row.method,
      userId: row.user_id,
      userEmail: row.user_email,
      browserInfo: row.browser_info,
      ipAddress: row.ip_address,
      severity: row.severity,
      isResolved: row.is_resolved,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at
    }));

    res.json({ logs, total, limit: Number(limit), offset: Number(offset) });
  } catch (err) {
    console.error('Get error logs error:', err);
    res.status(500).json({ error: 'Gagal mengambil data error logs.' });
  }
});

// Create Error Log
app.post('/api/error-logs', async (req, res) => {
  try {
    const { 
      errorType, 
      errorMessage, 
      errorStack, 
      endpoint, 
      method, 
      userId, 
      userEmail, 
      severity = 'ERROR' 
    } = req.body;

    // Determine error type if not provided
    let errorTypeValue = errorType || 'UNKNOWN';
    if (!errorType && errorMessage) {
      const msg = errorMessage.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch') || msg.includes('connection')) {
        errorTypeValue = 'NETWORK';
      } else if (msg.includes('validation') || msg.includes('invalid') || msg.includes('required')) {
        errorTypeValue = 'VALIDATION';
      } else if (msg.includes('unauthorized') || msg.includes('forbidden') || msg.includes('token')) {
        errorTypeValue = 'AUTH';
      } else if (msg.includes('database') || msg.includes('db') || msg.includes('sql')) {
        errorTypeValue = 'DATABASE';
      } else if (msg.includes('api') || msg.includes('endpoint')) {
        errorTypeValue = 'API';
      }
    }

    // Determine severity
    let severityValue = severity;
    if (!severity && errorMessage) {
      const msg = errorMessage.toLowerCase();
      if (msg.includes('critical') || msg.includes('fatal')) {
        severityValue = 'CRITICAL';
      } else if (msg.includes('warning')) {
        severityValue = 'WARNING';
      }
    }

    const browserInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection.remoteAddress || 'Unknown';

    const query = `
      INSERT INTO error_logs 
        (error_type, error_message, error_stack, endpoint, method, user_id, user_email, browser_info, ip_address, severity)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `;

    const result = await pool.query(query, [
      errorTypeValue,
      errorMessage,
      errorStack || null,
      endpoint || null,
      method || null,
      userId || null,
      userEmail || null,
      browserInfo,
      ipAddress,
      severityValue
    ]);

    res.json({ success: true, id: result.rows[0].id });
  } catch (err) {
    console.error('Create error log error:', err);
    res.status(500).json({ error: 'Gagal menyimpan error log.' });
  }
});

// Resolve Error Log
app.put('/api/error-logs/:id/resolve', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id; // From JWT token

    await pool.query(
      'UPDATE error_logs SET is_resolved = TRUE, resolved_by = $1, resolved_at = NOW() WHERE id = $2',
      [userId, id]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('Resolve error log error:', err);
    res.status(500).json({ error: 'Gagal menyelesaikan error log.' });
  }
});

// Delete/Clear Error Logs
app.delete('/api/error-logs', async (req, res) => {
  try {
    const { resolved, olderThan } = req.body;

    let query = 'DELETE FROM error_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (resolved === true) {
      query += ` AND is_resolved = $${paramIndex}`;
      params.push(true);
      paramIndex++;
    }

    if (olderThan) {
      query += ` AND created_at < $${paramIndex}`;
      params.push(olderThan);
      paramIndex++;
    }

    const result = await pool.query(query, params);

    res.json({ success: true, deleted: result.rowCount });
  } catch (err) {
    console.error('Delete error logs error:', err);
    res.status(500).json({ error: 'Gagal menghapus error logs.' });
  }
});

// Get Error Log Statistics
app.get('/api/error-logs/stats', async (req, res) => {
  try {
    // Get counts by type
    const typeStats = await pool.query(`
      SELECT error_type, COUNT(*) as count 
      FROM error_logs 
      GROUP BY error_type 
      ORDER BY count DESC
    `);

    // Get counts by severity
    const severityStats = await pool.query(`
      SELECT severity, COUNT(*) as count 
      FROM error_logs 
      GROUP BY severity 
      ORDER BY count DESC
    `);

    // Get unresolved count
    const unresolvedResult = await pool.query(
      'SELECT COUNT(*) as count FROM error_logs WHERE is_resolved = FALSE'
    );

    // Get today's errors
    const todayResult = await pool.query(`
      SELECT COUNT(*) as count FROM error_logs 
      WHERE created_at >= CURRENT_DATE
    `);

    res.json({
      byType: typeStats.rows,
      bySeverity: severityStats.rows,
      unresolved: parseInt(unresolvedResult.rows[0].count),
      today: parseInt(todayResult.rows[0].count)
    });
  } catch (err) {
    console.error('Get error log stats error:', err);
    res.status(500).json({ error: 'Gagal mengambil statistik error logs.' });
  }
});

// --- DATABASE CONFIG API ---

// Get Database Config
app.get('/api/settings/db-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM db_config WHERE is_active = TRUE LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({ host: '', port: '', database_name: '', username: '', password: '' });
    }
    const config = result.rows[0];
    res.json({
      host: config.host,
      port: config.port,
      database: config.database_name,
      username: config.username,
      password: config.password
    });
  } catch (err) {
    console.error('Get DB config error:', err);
    res.status(500).json({ error: 'Gagal mengambil konfigurasi database.' });
  }
});

// Save Database Config
app.post('/api/settings/db-config', async (req, res) => {
  const { host, port, database, username, password } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Deactivate all existing configs
    await client.query('UPDATE db_config SET is_active = FALSE');
    
    // Insert new config
    await client.query(
      'INSERT INTO db_config (host, port, database_name, username, password, is_active) VALUES ($1, $2, $3, $4, $5, TRUE)',
      [host, port, database, username, password]
    );
    
    await client.query('COMMIT');
    res.json({ success: true, message: 'Konfigurasi database berhasil disimpan.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Save DB config error:', err);
    res.status(500).json({ error: 'Gagal menyimpan konfigurasi database.' });
  } finally {
    client.release();
  }
});

// Test Database Connection
app.post('/api/settings/db-config/test', async (req, res) => {
  const { host, port, database, username, password } = req.body;
  
  // Create a temporary pool to test connection
  const testPool = new Pool({
    host,
    port: parseInt(port),
    database,
    user: username,
    password,
    connectionTimeoutMillis: 5000
  });
  
  try {
    const result = await testPool.query('SELECT NOW()');
    await testPool.end();
    res.json({ success: true, message: 'Koneksi berhasil!' });
  } catch (err) {
    await testPool.end();
    console.error('Test DB connection error:', err);
    res.status(500).json({ error: 'Koneksi gagal. Periksa kembali parameter.' });
  }
});

// --- SSO CONFIG API ---

// Get SSO Config
app.get('/api/settings/sso-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sso_config LIMIT 1');
    if (result.rows.length === 0) {
      return res.json({ enabled: false, clientId: '', domain: '' });
    }
    const config = result.rows[0];
    res.json({
      enabled: config.enabled,
      clientId: config.client_id,
      domain: config.domain
    });
  } catch (err) {
    console.error('Get SSO config error:', err);
    res.status(500).json({ error: 'Gagal mengambil konfigurasi SSO.' });
  }
});

// Save SSO Config
app.post('/api/settings/sso-config', async (req, res) => {
  const { enabled, clientId, domain } = req.body;
  try {
    // Check if config exists
    const existing = await pool.query('SELECT id FROM sso_config LIMIT 1');
    
    if (existing.rows.length > 0) {
      // Update existing
      await pool.query(
        'UPDATE sso_config SET enabled = $1, client_id = $2, domain = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $4',
        [enabled, clientId, domain, existing.rows[0].id]
      );
    } else {
      // Insert new
      await pool.query(
        'INSERT INTO sso_config (enabled, client_id, domain) VALUES ($1, $2, $3)',
        [enabled, clientId, domain]
      );
    }
    
    res.json({ success: true, message: 'Konfigurasi SSO berhasil disimpan.' });
  } catch (err) {
    console.error('Save SSO config error:', err);
    res.status(500).json({ error: 'Gagal menyimpan konfigurasi SSO.' });
  }
});

// --- SSO USERS API (Pengguna SSO yang Diizinkan) ---

// Get All SSO Users
app.get('/api/sso-users', verifyRole(['Admin']), async (req, res) => {
  try {
    // Sort by updated_at (Waktu Login Terakhir)
    const result = await pool.query('SELECT * FROM sso_users ORDER BY updated_at DESC');
    const users = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
    res.json(users);
  } catch (err) {
    console.error('Get SSO users error:', err);
    res.status(500).json({ error: 'Gagal mengambil data pengguna SSO.' });
  }
});

// Add New SSO User
app.post('/api/sso-users', async (req, res) => {
  const { email, name } = req.body;
  try {
    // Check if email already exists
    const existing = await pool.query('SELECT id FROM sso_users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email sudah terdaftar.' });
    }

    const id = `SSO-${Date.now()}`;
    await pool.query(
      'INSERT INTO sso_users (id, email, name, status) VALUES ($1, $2, $3, $4)',
      [id, email, name, 'Aktif']
    );
    res.json({ success: true, id });
  } catch (err) {
    console.error('Add SSO user error:', err);
    res.status(500).json({ error: 'Gagal menambah pengguna SSO.' });
  }
});

// Update SSO User
app.put('/api/sso-users/:id', async (req, res) => {
  const { id } = req.params;
  const { email, name } = req.body;
  try {
    // Check if email is used by another user
    const existing = await pool.query('SELECT id FROM sso_users WHERE email = $1 AND id != $2', [email, id]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email sudah digunakan pengguna lain.' });
    }

    await pool.query(
      'UPDATE sso_users SET email = $1, name = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [email, name, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update SSO user error:', err);
    res.status(500).json({ error: 'Gagal update pengguna SSO.' });
  }
});

// Toggle SSO User Status
app.put('/api/sso-users/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query(
      'UPDATE sso_users SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [status, id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Update SSO user status error:', err);
    res.status(500).json({ error: 'Gagal update status pengguna SSO.' });
  }
});

// Delete SSO User
app.delete('/api/sso-users/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM sso_users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete SSO user error:', err);
    res.status(500).json({ error: 'Gagal menghapus pengguna SSO.' });
  }
});

// Helper function to automatically log errors from API calls
const logError = async (error, req, customMessage = null) => {
  try {
    const errorType = error.type || 'API';
    const errorMessage = customMessage || error.message || 'Unknown error';
    const errorStack = error.stack || null;
    const endpoint = req.path || null;
    const method = req.method || null;
    const userId = req.user?.id || null;
    const userEmail = req.user?.email || null;
    const severity = error.severity || 'ERROR';

    const browserInfo = req.headers['user-agent'] || 'Unknown';
    const ipAddress = req.ip || req.connection?.remoteAddress || 'Unknown';

    await pool.query(
      `INSERT INTO error_logs 
        (error_type, error_message, error_stack, endpoint, method, user_id, user_email, browser_info, ip_address, severity)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [errorType, errorMessage, errorStack, endpoint, method, userId, userEmail, browserInfo, ipAddress, severity]
    );
  } catch (logErr) {
    console.error('Failed to log error to database:', logErr);
  }
};

// Jalankan Server
app.listen(port, () => {
  console.log(`Backend server berjalan di http://localhost:${port}`);
});
