import { useState, useCallback, useEffect } from 'react';
import { api } from '../services/api';
import { Room } from '../types';

interface UseRoomsOptions {
  autoFetch?: boolean;
  excludeImage?: boolean;
}

export const useRooms = (options?: UseRoomsOptions) => {
  const { autoFetch = true, excludeImage = false } = options || {};

  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(autoFetch);
  const [error, setError] = useState<string | null>(null);

  const fetchRooms = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Parameter query exclude_image berguna untuk mempercepat loading 
      // jika gambar base64 tidak diperlukan di tampilan saat itu
      const endpoint = excludeImage ? '/api/rooms?exclude_image=true' : '/api/rooms';
      const response = await api(endpoint);

      if (!response.ok) {
        throw new Error('Gagal mengambil data ruangan');
      }

      const data = await response.json();
      setRooms(data);
      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Terjadi kesalahan saat memuat data ruangan';
      setError(errorMessage);
      console.error('Error fetching rooms:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [excludeImage]);

  useEffect(() => {
    if (autoFetch) {
      fetchRooms();
    } else {
      setIsLoading(false);
    }
  }, [fetchRooms, autoFetch]);

  return { rooms, isLoading, error, fetchRooms, setRooms };
};
