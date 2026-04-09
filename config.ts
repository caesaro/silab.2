// Konfigurasi Global Aplikasi
export const APP_VERSION = "1.7.9";
export const APP_NAME = "CORE.FTI";
export const APP_FULL_NAME = "Campus Operational Resource Environment";
export const INSTITUTION_NAME = "Fakultas Teknologi Informasi - UKSW";

// Logika API URL Dinamis:
// 1. Gunakan nilai dari .env jika ada
// 2. Di Production, gunakan string kosong "" (browser otomatis pakai domain saat ini)
// 3. Di Development, gunakan localhost:5000
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "" : "http://localhost:5000");