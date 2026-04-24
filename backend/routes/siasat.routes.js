import express from 'express';
import { XMLParser } from 'fast-xml-parser';
import { pool } from '../config/database.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Setup XML Parser
const parser = new XMLParser({
  ignoreAttributes: false,
  textNodeName: "_text",
});

// Konfigurasi API SIASAT (Sangat disarankan untuk memindahkannya ke file .env)
const SOAP_URL = process.env.SIASAT_SOAP_URL;
const SOAP_USER = process.env.SIASAT_SOAP_USER;
const SOAP_PASS = process.env.SIASAT_SOAP_PASS;

const getAutoSemesterCode = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  if (month >= 1 && month <= 4) return `${year - 1}2`;
  if (month >= 5 && month <= 8) return `${year - 1}3`;
  return `${year}1`;
};

const formatSemesterInfo = (semesterCode) => {
  if (!semesterCode || !/^\d{4}[123]$/.test(String(semesterCode))) {
    return { semesterCode: '', semesterName: '', academicYear: '', label: '' };
  }

  const code = String(semesterCode);
  const year = parseInt(code.slice(0, 4), 10);
  const type = code.slice(4);

  if (type === '1') {
    return {
      semesterCode: code,
      semesterName: 'Ganjil',
      academicYear: `${year}/${year + 1}`,
      label: `Ganjil ${year}/${year + 1}`
    };
  }

  if (type === '2') {
    return {
      semesterCode: code,
      semesterName: 'Genap',
      academicYear: `${year - 1}/${year}`,
      label: `Genap ${year - 1}/${year}`
    };
  }

  return {
    semesterCode: code,
    semesterName: 'Antara',
    academicYear: `${year - 1}/${year}`,
    label: `Antara ${year - 1}/${year}`
  };
};

const resolveSemesterCode = async (requestedSemester) => {
  if (requestedSemester) return String(requestedSemester);

  try {
    const result = await pool.query("SELECT value FROM system_settings WHERE key = 'tu_current_semester_code' LIMIT 1");
    const configuredSemester = result.rows[0]?.value;
    if (configuredSemester) return String(configuredSemester);
  } catch (error) {
    console.error('Failed to read semester setting:', error);
  }

  return getAutoSemesterCode();
};

// 1. Endpoint Get Profil Mahasiswa
router.get('/siasat/mahasiswa/:nim', verifyToken, async (req, res) => {
  const { nim } = req.params;

  const xmlBody = `
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <getData xmlns="http://kpftiservice.org/">
          <nim>${nim}</nim>
          <useracc>${SOAP_USER}</useracc>
          <pwd>${SOAP_PASS}</pwd>
        </getData>
      </soap:Body>
    </soap:Envelope>
  `;

  try {
    const response = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://kpftiservice.org/getData'
      },
      body: xmlBody
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const xmlText = await response.text();
    const resultObj = parser.parse(xmlText);
    
    // Telusuri hierarki respon XML untuk mendapatkan listmhs
    const listMhs = resultObj['soap:Envelope']?.['soap:Body']?.['getDataResponse']?.['getDataResult']?.['listmhs'];
    
    if (!listMhs) {
      return res.status(404).json({ error: 'Data mahasiswa tidak ditemukan di SIASAT' });
    }

    res.json({ success: true, data: listMhs });
  } catch (error) {
    console.error('Error fetch SIASAT Data Mahasiswa:', error);
    res.status(500).json({ error: 'Gagal terhubung ke service SIASAT. Pastikan jaringan terhubung ke intranet.' });
  }
});

// 2. Endpoint Get Jadwal KST Mahasiswa (Untuk Verifikasi)
router.get('/siasat/kst/:nim', verifyToken, async (req, res) => {
  const { nim } = req.params;
  const { semester: rawSemester } = req.query; // contoh: "20241"
  const semester = await resolveSemesterCode(rawSemester);

  if (!/^\d{4}[123]$/.test(semester)) {
      return res.status(400).json({ error: 'Parameter semester tidak valid. Gunakan format seperti 20251, 20252, atau 20253.' });
  }

  const xmlBody = `
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <GetKartuStudi xmlns="http://kpftiservice.org/">
          <nim>${nim}</nim>
          <tahunsem>${semester}</tahunsem>
          <useracc>${SOAP_USER}</useracc>
          <pwd>${SOAP_PASS}</pwd>
        </GetKartuStudi>
      </soap:Body>
    </soap:Envelope>
  `;

  try {
    const response = await fetch(SOAP_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': 'http://kpftiservice.org/GetKartuStudi'
      },
      body: xmlBody
    });

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const xmlText = await response.text();
    const resultObj = parser.parse(xmlText);
    
    // Ambil list KST
    let listKst = resultObj['soap:Envelope']?.['soap:Body']?.['GetKartuStudiResponse']?.['GetKartuStudiResult']?.['listmhskst'];
    
    if (!listKst) {
      return res.json({ success: true, data: [] });
    }

    // Jika mata kuliah yang diambil cuma 1, parser mengubahnya jadi object biasa. Paksa jadi array:
    if (!Array.isArray(listKst)) {
        listKst = [listKst];
    }

    // Format output data untuk membuang field yang tidak perlu
    const formattedKST = listKst.map(item => ({
        kode: item.kodemkl,
        makul: item.namamkl,
        hari: item.hari,
        jamMulai: item.jammulai ? String(item.jammulai).substring(0, 5) : '', // '08:00:00' -> '08:00'
        jamUsai: item.jamusai ? String(item.jamusai).substring(0, 5) : '',
        ruang: item.ruang
    }));

    res.json({ success: true, data: formattedKST, semester: formatSemesterInfo(semester) });
  } catch (error) {
    console.error('Error fetch SIASAT KST:', error);
    res.status(500).json({ error: 'Gagal terhubung ke service SIASAT' });
  }
});

export default router;
