import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Endpoint Cek Status Maintenance
router.get('/settings/maintenance', async (req, res) => {
  try {
    // Query using the Key-Value structure
    const result = await pool.query("SELECT value FROM system_settings WHERE key = 'maintenance_mode' LIMIT 1");
    const isMaintenance = result.rows[0]?.value === 'true'; // Convert string 'true' to boolean
    res.json({ maintenance_mode: isMaintenance });
  } catch (err) {
    console.error('Error fetching maintenance status:', err);
    res.status(500).json({ error: 'Failed to fetch maintenance status' });
  }
});

// Endpoint Cek Global Announcement
router.get('/settings/announcement', async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM system_settings WHERE key = 'global_announcement' LIMIT 1");
    
    // Default structure in case it's not found
    let announcement = { active: false, message: "", type: "info" };
    
    if (result.rows.length > 0 && result.rows[0].value) {
      try {
        announcement = JSON.parse(result.rows[0].value);
      } catch (e) {
        console.error('Error parsing announcement JSON:', e);
      }
    }
    
    res.json(announcement);
  } catch (err) {
    console.error('Error fetching global announcement:', err);
    res.status(500).json({ error: 'Failed to fetch global announcement' });
  }
});

// Endpoint Cek Konfigurasi SSO
router.get('/settings/sso-config', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM sso_config LIMIT 1');
    res.json(result.rows[0] || { enabled: false, client_id: null, domain: null });
  } catch (err) {
    console.error('Error fetching SSO config:', err);
    res.status(500).json({ error: 'Failed to fetch SSO config' });
  }
});

export default router;