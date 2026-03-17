import React, { useState, useEffect } from 'react';
import { Room } from '../types';
import { api } from '../services/api';
import BookingForm from '../components/BookingForm';
import { Skeleton } from '../components/Skeleton';

interface BuatPesananProps {
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  onNavigate: (page: string) => void;
}

const BuatPesanan: React.FC<BuatPesananProps> = ({ showToast, onNavigate }) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const res = await api('/api/rooms?exclude_image=true');
        if (res.ok) setRooms(await res.json());
      } catch (e) {
        console.error(e);
        showToast("Gagal memuat data ruangan", "error");
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-2 sm:px-0">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Buat Pesanan Baru</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Isi formulir untuk mengajukan peminjaman ruangan</p>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <BookingForm
          rooms={rooms}
          showToast={showToast}
          onSuccess={() => onNavigate('bookings')}
          onCancel={() => onNavigate('dashboard')}
        />
      )}
    </div>
  );
};

export default BuatPesanan;
