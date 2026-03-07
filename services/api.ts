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
      ...headers, // Bisa di-override jika perlu
    },
  };

  // Ambil token dari localStorage dan tambahkan ke header jika ada
  const token = localStorage.getItem('authToken');
  if (token) {
    (config.headers as any)['Authorization'] = `Bearer ${token}`;
  }

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
    // Jika API_BASE_URL localhost, gunakan relative path agar request via HP/Tailscale masuk ke Proxy Vite
    const baseUrl = API_BASE_URL.includes('localhost') ? '' : API_BASE_URL;
    const response = await fetch(`${baseUrl}${endpoint}`, config);

    // --- Global Error Handling (Interceptor Response) ---
    
    // Cek jika status 401 (Unauthorized) atau 403 (Forbidden)
    if (response.status === 401 || response.status === 403) {
      // PENTING: Jangan logout jika error 401 berasal dari endpoint login 
      // (karena itu berarti "Password Salah", bukan "Sesi Habis")
      // Juga tidak logout untuk endpoint publik lainnya
      const publicEndpoints = ['/login', '/register', '/set-password', '/settings/maintenance', '/logout'];
      const isPublicEndpoint = publicEndpoints.some(ep => endpoint.includes(ep));
      
      if (!isPublicEndpoint) {
        console.warn('Sesi kadaluarsa atau tidak valid. Melakukan logout otomatis...');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('authToken'); // Hapus token yang tidak valid
        localStorage.removeItem('userId');   // Hapus ID user yang invalid
        localStorage.removeItem('userName'); // Bersihkan nama user
        window.location.href = '/'; // Redirect paksa ke halaman login
      }
    }

    return response;
  } catch (error) {
    console.error("API Network Error:", error);
    // Lempar error agar bisa ditangkap di komponen jika perlu
    // Tapi jangan otomatis logout karena ini bisa jadi jaringan sedang bermasalah
    throw error;
  }
};
