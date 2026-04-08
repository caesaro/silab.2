import { Loan, Equipment, LabStaff } from '../types';
import { API_BASE_URL } from '../config';

export const api = async (endpoint: string, options: RequestInit & { data?: any } = {}) => {
  // Pastikan format endpoint selalu valid (diawali garis miring)
  const formattedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const url = `${API_BASE_URL}${formattedEndpoint}`;
  
  // Mengambil token JWT hasil login dari localStorage
  const token = localStorage.getItem('authToken');
  const customHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    customHeaders['Authorization'] = `Bearer ${token}`;
  }

  
  const config: RequestInit = {
    method: options.method || 'GET',
    headers: {
      ...customHeaders,
      ...options.headers,
    },
    ...options,
  };

  // Handle POST/PUT data
  if (options.data) {
    config.body = JSON.stringify(options.data);
  }

  try {
    const response = await fetch(url, config);
    return response;
  } catch (error) {
    console.error(`API Error [${formattedEndpoint}]:`, error);
    throw error;
  }
};

// Convenience typed endpoints for loans
export const loansApi = {
  list: () => api('/api/loans'),
  create: (data: { equipmentIds: string[], borrowerName: string, nim?: string, guarantee: string, borrowDate: string, borrowTime: string, borrowOfficer: string, location: string }) => 
    api('/api/loans', { method: 'POST', data }),  
  updateGroup: (transactionId: string, data: any) => 
    api(`/api/loans/group/${transactionId}`, { method: 'PUT', data }),
  returnBulk: (data: { loanIds: string[], returnDate: string, returnTime: string, returnOfficer: string, returnLocation: string, condition: string }) => 
    api('/api/loans/return', { method: 'PUT', data }),
  deleteGroup: (data: { loanIds: string[] }) => 
    api('/api/loans/group', { method: 'DELETE', data }),
};

// Inventory endpoint
export const inventoryApi = {
  list: () => api('/api/inventory'),
};

// Staff endpoint  
export const staffApi = {
  list: () => api('/api/staff'),
};

export default api;

