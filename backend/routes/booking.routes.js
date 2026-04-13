import express from 'express';
import multer from 'multer';
import ExcelJS from 'exceljs';
import { pool } from '../config/database.js';
import { verifyRole } from '../middleware/auth.js';
const router = express.Router();

// Konfigurasi Upload (Simpan sementara di folder uploads/)
const upload = multer({ dest: 'uploads/' });

// Endpoint Summary untuk Statistik Dashboard
router.get('/dashboard/summary', verifyRole(['Admin', 'Laboran', 'Supervisor']), async (req, res) => {
    try {
        const [activeLoans, totalUsers, inventoryStats, bookingStats, roomStats, recentBookings] = await Promise.all([
            pool.query("SELECT COUNT(*) as count FROM loans WHERE status = 'Dipinjam'"),
            pool.query("SELECT COUNT(*) as count FROM users WHERE role != 'Admin'"),
            pool.query("SELECT kondisi, COUNT(*) as count FROM inventory GROUP BY kondisi"),
            pool.query("SELECT status, COUNT(*) as count FROM bookings GROUP BY status"),
            pool.query(`
                SELECT r.name, COUNT(b.id) as count 
                FROM rooms r 
                LEFT JOIN bookings b ON r.id = b.room_id 
                GROUP BY r.id, r.name
            `),
            pool.query(`
                SELECT b.id, b.keperluan as purpose, b.status, b.created_at as date, 
                       u.nama as "userName",
                       (SELECT start_time::text FROM booking_schedules bs WHERE bs.booking_id = b.id ORDER BY schedule_date ASC LIMIT 1) as "startTime"
                FROM bookings b
                JOIN users u ON b.user_id = u.id
                ORDER BY b.created_at DESC LIMIT 5
            `)
        ]);

        let good = 0, minor = 0, major = 0, totalEq = 0;
        inventoryStats.rows.forEach(row => {
            const count = parseInt(row.count);
            totalEq += count;
            if (row.kondisi === 'Baik') good += count;
            else if (row.kondisi === 'Rusak Ringan') minor += count;
            else if (row.kondisi === 'Rusak Berat') major += count;
        });

        let totalBookings = 0, pending = 0, approved = 0, rejected = 0;
        bookingStats.rows.forEach(row => {
            const count = parseInt(row.count);
            totalBookings += count;
            if (row.status === 'Pending') pending = count;
            else if (row.status === 'Disetujui') approved = count;
            else if (row.status === 'Ditolak') rejected = count;
        });

        res.json({
            activeLoans: parseInt(activeLoans.rows[0].count),
            totalUsers: parseInt(totalUsers.rows[0].count),
            equipment: { total: totalEq, damaged: minor + major, good, minor, major },
            bookings: { total: totalBookings, pending, approved, rejected },
            roomStats: roomStats.rows.map(r => ({ name: r.name.split(' ').slice(0, 2).join(' '), bookings: parseInt(r.count) })),
            recentBookings: recentBookings.rows.map(b => ({
                ...b,
                startTime: b.startTime ? b.startTime.substring(0, 5) : '-'
            }))
        });
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil summary dashboard.' });
    }
});

// Endpoint Summary khusus untuk User (Mahasiswa/Dosen)
router.get('/dashboard/user-summary', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ error: 'Unauthorized' });

        const [bookingStats, recentBookings] = await Promise.all([
            pool.query("SELECT status, COUNT(*) as count FROM bookings WHERE user_id = $1 GROUP BY status", [userId]),
            pool.query(`
                SELECT b.id, b.keperluan as purpose, b.status, b.created_at as date, 
                       u.nama as "userName",
                       (SELECT start_time::text FROM booking_schedules bs WHERE bs.booking_id = b.id ORDER BY schedule_date ASC LIMIT 1) as "startTime"
                FROM bookings b
                JOIN users u ON b.user_id = u.id
                WHERE b.user_id = $1
                ORDER BY b.created_at DESC LIMIT 5
            `, [userId])
        ]);

        let totalBookings = 0, pending = 0, approved = 0, rejected = 0;
        bookingStats.rows.forEach(row => {
            const count = parseInt(row.count);
            totalBookings += count;
            if (row.status === 'Pending') pending = count;
            else if (row.status === 'Disetujui') approved = count;
            else if (row.status === 'Ditolak') rejected = count;
        });

        res.json({
            bookings: { total: totalBookings, pending, approved, rejected },
            recentBookings: recentBookings.rows.map(b => ({
                ...b,
                startTime: b.startTime ? b.startTime.substring(0, 5) : '-'
            }))
        });
    } catch (err) {
        res.status(500).json({ error: 'Gagal mengambil summary user.' });
    }
});

// --- BOOKINGS (Tabel: bookings & booking_schedules) ---

router.get('/bookings', async (req, res) => {
    try {
        const excludeFile = req.query.exclude_file === 'true';
        const columns = excludeFile 
            ? 'b.id, b.room_id, b.user_id, b.penanggung_jawab, b.contact_person, b.keperluan, b.status, NULL as file_proposal, CASE WHEN b.file_proposal IS NOT NULL THEN true ELSE false END as has_file, b.tech_support_pic, b.tech_support_needs, b.rejection_reason, b.created_at, b.updated_at'
            : 'b.*, CASE WHEN b.file_proposal IS NOT NULL THEN true ELSE false END as has_file';

        const result = await pool.query(`
            SELECT ${columns}, u.nama as user_name, r.name as room_name, 
                   (SELECT string_agg(s.nama, ', ') FROM staff s WHERE s.id = ANY(b.tech_support_pic)) as tech_pic_name,
                   (SELECT json_agg(json_build_object('date', bs2.schedule_date, 'startTime', bs2.start_time, 'endTime', bs2.end_time) ORDER BY bs2.schedule_date)
                    FROM booking_schedules bs2 
                    WHERE bs2.booking_id = b.id) as all_schedules
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN rooms r ON b.room_id = r.id
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
            // Ambil jadwal pertama sebagai default display
            date: (row.all_schedules && row.all_schedules.length > 0) ? new Date(row.all_schedules[0].date).toLocaleDateString('en-CA') : '',
            startTime: (row.all_schedules && row.all_schedules.length > 0) ? row.all_schedules[0].startTime.substring(0, 5) : '',
            endTime: (row.all_schedules && row.all_schedules.length > 0) ? row.all_schedules[0].endTime.substring(0, 5) : '',
            schedules: row.all_schedules || [], // All schedules as array
            status: row.status,
            proposalFile: row.file_proposal ? `data:application/pdf;base64,${row.file_proposal.toString('base64')}` : null,
            hasFile: row.has_file || (row.file_proposal ? true : false),
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

// Endpoint untuk On-Demand Fetching File Proposal
router.get('/bookings/:id/file', async (req, res) => {
    try {
        const result = await pool.query('SELECT file_proposal FROM bookings WHERE id = $1', [req.params.id]);
        if (result.rows.length === 0 || !result.rows[0].file_proposal) {
            return res.status(404).json({ error: 'File tidak ditemukan' });
        }
        const base64Data = `data:application/pdf;base64,${result.rows[0].file_proposal.toString('base64')}`;
        res.json({ file: base64Data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

router.post('/bookings', upload.single('file'), async (req, res) => {
  const { roomId, userId, responsiblePerson, contactPerson, purpose, schedules, autoApprove, techSupportPic, techSupportNeeds } = req.body;
  
  // 1. Validasi & Konversi File Proposal (Sebelum Transaksi DB)
  let proposalBuffer = null;
  if (req.file && req.file.buffer) {
    proposalBuffer = req.file.buffer;
    // Validasi Ukuran: Max 5MB
    if (proposalBuffer.length > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'Ukuran file proposal melebihi batas maksimum 5MB.' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const bookingId = `BOOK-${Date.now()}`;
    
    // 2. Set Status Default ke Pending
    let initialStatus = 'Pending';
    if (req.user && (req.user.role === 'Admin' || req.user.role === 'Laboran' || req.user.role === 'Supervisor') && autoApprove) {
      initialStatus = 'Disetujui';
    }

    // Insert Header Booking
    await client.query(
      `INSERT INTO bookings (id, room_id, user_id, penanggung_jawab, contact_person, keperluan, file_proposal, status, tech_support_pic, tech_support_needs)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [bookingId, roomId, userId, responsiblePerson, contactPerson, purpose, proposalBuffer, initialStatus, techSupportPic || [], techSupportNeeds || null]
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

export default router;
