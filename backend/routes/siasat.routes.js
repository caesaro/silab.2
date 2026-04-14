import express from 'express';
import { XMLParser } from 'fast-xml-parser';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Setup XML Parser
const parser = new XMLParser({
  ignoreAttributes: false,
  textNodeName: "_text",
});

// Konfigurasi API SIASAT (Sangat disarankan untuk memindahkannya ke file .env)
const SOAP_URL = process.env.SIASAT_SOAP_URL || 'http://10.10.1.52/kpftiservice/kpservice.asmx';
const SOAP_USER = process.env.SIASAT_SOAP_USER || 'FTIKP';
const SOAP_PASS = process.env.SIASAT_SOAP_PASS || '234rtegd';

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
  const { semester } = req.query; // contoh: "20241"

  if (!semester) {
      return res.status(400).json({ error: 'Parameter semester diperlukan (contoh: 20241)' });
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

    res.json({ success: true, data: formattedKST });
  } catch (error) {
    console.error('Error fetch SIASAT KST:', error);
    res.status(500).json({ error: 'Gagal terhubung ke service SIASAT' });
  }
});

export default router;