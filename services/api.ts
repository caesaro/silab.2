import { API_BASE_URL } from '../config';

interface ApiOptions extends RequestInit {
  data?: any; // Shortcut untuk body yang otomatis di-stringify
}

export const api = async (endpoint: string, options: ApiOptions = {}) => {
  const { data, headers, ...customConfig } = options;

  // Default Config (Interceptor Request)
  const config: RequestInit = {
    ...customConfig,
    headers: {
      'Content-Type': 'application/json', // Default header
      'x-user-id': localStorage.getItem('userId') || '', // Kirim ID user untuk validasi sesi
      ...headers, // Bisa di-override jika perlu
    },
  };

  // Auto-stringify body jika ada properti 'data'
  if (data) {
    if (data instanceof FormData) {
      config.body = data;
      // Hapus Content-Type agar browser yang mengaturnya (multipart/form-data boundary)
      delete (config.headers as any)['Content-Type'];
    } else {
      config.body = JSON.stringify(data);
    }
  }

  // Eksekusi Fetch
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // --- Global Error Handling (Interceptor Response) ---
    
    // Cek jika status 401 (Unauthorized)
    if (response.status === 401) {
      // PENTING: Jangan logout jika error 401 berasal dari endpoint login 
      // (karena itu berarti "Password Salah", bukan "Sesi Habis")
      if (!endpoint.includes('/login')) {
        console.warn('Sesi kadaluarsa atau tidak valid. Melakukan logout otomatis...');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentRole');
        localStorage.removeItem('userId');   // Hapus ID user yang invalid
        localStorage.removeItem('userName'); // Bersihkan nama user
        window.location.href = '/'; // Redirect paksa ke halaman login
      }
    }

    return response;
  } catch (error) {
    console.error("API Network Error:", error);
    throw error; // Lempar error agar bisa ditangkap di komponen jika perlu
  }
};