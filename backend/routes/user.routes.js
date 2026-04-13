import express from 'express';
import { pool } from '../config/database.js';
import { verifyRole } from '../middleware/auth.js';
const router = express.Router();

// Endpoint untuk mengambil data users
router.get('/users', verifyRole(['Admin', 'Laboran', 'Supervisor']), async (req, res) => {
  try {
    const { type } = req.query;
    
    // Sort by last_login agar user yang baru aktif (Internal/SSO) muncul paling atas
    let query = 'SELECT * FROM users';
    let params = [];
    
    // Filter berdasarkan tipe user (internal vs SSO)
    if (type === 'internal') {
      // Internal: user yang memiliki password (dibuat manual)
      query += ' WHERE password IS NOT NULL';
    } else if (type === 'sso') {
      // SSO: user yang login via Google (password NULL)
      query += ' WHERE password IS NULL';
    }
    
    query += ' ORDER BY last_login DESC NULLS LAST, created_at DESC';
    
    const result = await pool.query(query, params);
    
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
router.get('/users/:id', verifyRole(['Admin', 'Laboran', 'User', 'Supervisor']), async (req, res) => {
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
router.get('/users/:id/account-info', verifyRole(['Admin', 'Laboran', 'User', 'Supervisor']), async (req, res) => {
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

// --- NOTIFICATIONS ---

// Endpoint untuk mengambil data notifikasi
router.get('/notifications', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    let query = 'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50';
    let params = [userId];
    
    // Admin dan Laboran juga melihat notifikasi sistem (user_id IS NULL)
    if (userRole === 'Admin' || userRole === 'Laboran') {
      query = 'SELECT * FROM notifications WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC LIMIT 50';
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ error: 'Gagal mengambil notifikasi' });
  }
});

// Endpoint untuk menandai semua notifikasi sudah dibaca
router.put('/notifications/read-all', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role;
    
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (userRole === 'Admin' || userRole === 'Laboran') {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1 OR user_id IS NULL', [userId]);
    } else {
      await pool.query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [userId]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating all notifications:', err);
    res.status(500).json({ error: 'Gagal update semua notifikasi' });
  }
});

// Endpoint untuk menandai notifikasi sudah dibaca
router.put('/notifications/:id/read', async (req, res) => {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating notification:', err);
    res.status(500).json({ error: 'Gagal update notifikasi' });
  }
});

export default router;
