import express from 'express';
import { pool } from '../config/database.js';
const router = express.Router();

// --- LOANS (Tabel: transactions & loans) ---

router.get('/loans', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT l.*, t.nama_peminjam, t.peminjam_identifier, t.petugas_pinjam, t.jaminan, t.tgl_pinjam, t.waktu_pinjam, 
                   i.nama as equipment_name, i.lokasi as current_location,
                   (SELECT from_location FROM item_movements WHERE loan_id = l.id AND movement_type = 'Peminjaman' LIMIT 1) as original_location
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
            borrowerName: row.nama_peminjam,
            nim: row.peminjam_identifier,
            borrowOfficer: row.petugas_pinjam,
            returnOfficer: row.petugas_pengembalian,
            guarantee: row.jaminan,
            borrowDate: new Date(row.tgl_pinjam).toLocaleDateString('en-CA'),
            borrowTime: row.waktu_pinjam ? row.waktu_pinjam.substring(0, 5) : '',
            actualReturnDate: row.actual_return_date ? new Date(row.actual_return_date).toLocaleDateString('en-CA') : null,
            actualReturnTime: row.actual_return_time ? row.actual_return_time.substring(0, 5) : null,
            status: row.status,
            location: row.current_location, // Menambahkan lokasi saat ini dari inventory
            originalLocation: row.original_location // Menambahkan lokasi asal
        }));
        res.json(loans);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'DB Error' });
    }
});

router.post('/loans', async (req, res) => {
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

router.put('/loans/group/:id', async (req, res) => {
    const { id } = req.params;
    const { equipmentIds, borrowerName, nim, guarantee, borrowDate, borrowTime, borrowOfficer, location } = req.body;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // 1. Update data transaksi utama
        await client.query(
            'UPDATE transactions SET peminjam_identifier=$1, nama_peminjam=$2, petugas_pinjam=$3, jaminan=$4, tgl_pinjam=$5, waktu_pinjam=$6 WHERE id=$7',
            [nim, borrowerName, borrowOfficer, guarantee, borrowDate, borrowTime, id]
        );

        // 2. Ambil data barang yang sedang dipinjam pada transaksi ini
        const currentLoansRes = await client.query('SELECT id, inventory_id FROM loans WHERE transaction_id = $1', [id]);
        const currentLoans = currentLoansRes.rows;
        const currentEqIds = currentLoans.map(l => l.inventory_id);
        
        // Pisahkan ID mana yang dihapus, ditambah, dan tetap dipertahankan
        const eqIdsToRemove = currentEqIds.filter(eqId => !equipmentIds.includes(eqId));
        const eqIdsToAdd = equipmentIds.filter(eqId => !currentEqIds.includes(eqId));
        const eqIdsToKeep = currentEqIds.filter(eqId => equipmentIds.includes(eqId));

        // 3. Hapus barang yang dikurangi dari peminjaman
        for (const eqId of eqIdsToRemove) {
            const loanId = currentLoans.find(l => l.inventory_id === eqId).id;
            
            // Ambil lokasi asal sebelum menghapus data perpindahan
            const movRes = await client.query('SELECT from_location FROM item_movements WHERE loan_id = $1 AND movement_type = \'Peminjaman\'', [loanId]);
            const originalLoc = movRes.rows.length > 0 ? (movRes.rows[0].from_location || '') : '';
            
            await client.query('UPDATE inventory SET is_available = TRUE, lokasi = $1 WHERE id = $2', [originalLoc, eqId]);
            await client.query('DELETE FROM item_movements WHERE loan_id = $1 AND movement_type = \'Peminjaman\'', [loanId]);
            await client.query('DELETE FROM loans WHERE id = $1', [loanId]);
        }

        // 4. Tambahkan barang baru ke peminjaman
        for (const eqId of eqIdsToAdd) {
            // Cek ketersediaan
            const invCheck = await client.query('SELECT is_available, lokasi, nama FROM inventory WHERE id = $1', [eqId]);
            if (invCheck.rows.length === 0 || !invCheck.rows[0].is_available) {
                throw new Error(`Barang ${invCheck.rows[0]?.nama || eqId} tidak tersedia atau sedang dipinjam.`);
            }
            const fromLocation = invCheck.rows[0].lokasi || '';

            const loanId = `L-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await client.query(
                'INSERT INTO loans (id, transaction_id, inventory_id, status) VALUES ($1, $2, $3, $4)',
                [loanId, id, eqId, 'Dipinjam']
            );
            
            await client.query('UPDATE inventory SET is_available = FALSE, lokasi = $1 WHERE id = $2', [location || fromLocation, eqId]);
            
            const movId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
            await client.query(
                `INSERT INTO item_movements (id, inventory_id, movement_date, movement_type, from_person, to_person, moved_by, quantity, from_location, to_location, loan_id) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
                [movId, eqId, borrowDate, 'Peminjaman', borrowOfficer, borrowerName, borrowOfficer, 1, fromLocation, location || fromLocation, loanId]
            );
        }

        // 5. Update histori perpindahan barang yang tetap dipertahankan (jika nama peminjam/tanggal/lokasi berubah)
        for (const eqId of eqIdsToKeep) {
            const loanId = currentLoans.find(l => l.inventory_id === eqId).id;
            
            if (location) {
                await client.query('UPDATE inventory SET lokasi = $1 WHERE id = $2', [location, eqId]);
            }

            await client.query(
                `UPDATE item_movements 
                 SET movement_date = $1, to_person = $2, moved_by = $3, to_location = COALESCE($4, to_location)
                 WHERE loan_id = $5 AND movement_type = 'Peminjaman'`,
                [borrowDate, borrowerName, borrowOfficer, location || null, loanId]
            );
        }

        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Update loan error:', err);
        res.status(400).json({ error: err.message || 'Gagal memperbarui peminjaman' });
    } finally {
        client.release();
    }
});

router.put('/loans/return', async (req, res) => {
    const { loanIds, returnDate, returnTime, returnOfficer, returnLocation, condition } = req.body;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        for (const loanId of loanIds) {
            const loanRes = await client.query(`
                SELECT l.inventory_id, t.nama_peminjam, i.lokasi
                FROM loans l
                JOIN transactions t ON l.transaction_id = t.id
                JOIN inventory i ON l.inventory_id = i.id
                WHERE l.id = $1
            `, [loanId]);
            
            if (loanRes.rows.length > 0) {
                const invId = loanRes.rows[0].inventory_id;
                const borrowerName = loanRes.rows[0].nama_peminjam;
                const fromLocation = loanRes.rows[0].lokasi || '';

                await client.query(
                    'UPDATE loans SET status=$1, actual_return_date=$2, actual_return_time=$3, petugas_pengembalian=$4 WHERE id=$5',
                    ['Dikembalikan', returnDate, returnTime, returnOfficer, loanId]
                );
                await client.query('UPDATE inventory SET is_available = TRUE, lokasi = $1, kondisi = $2 WHERE id = $3', [returnLocation || '', condition || 'Baik', invId]);
                
                const movId = `MOV-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
                await client.query(
                    `INSERT INTO item_movements (id, inventory_id, movement_date, movement_type, from_person, to_person, moved_by, quantity, from_location, to_location, notes, loan_id) 
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
                    [movId, invId, returnDate, 'Pengembalian', borrowerName, returnOfficer, returnOfficer, 1, fromLocation, returnLocation || '', `Kondisi: ${condition || 'Baik'}`, loanId]
                );
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

router.delete('/loans/group', async (req, res) => {
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

export default router;
