import React from 'react';
import { Room, BookingStatus } from '../types';
import { AlertTriangle, XCircle } from 'lucide-react';

const RejectionModal = ({ isOpen, booking, rooms, rejectionReason, setRejectionReason, deleteOption, setDeleteOption, onClose, onConfirm }: any) => {
  if (!isOpen || !booking) return null;
  const getRoomName = (roomId: string) => rooms.find((r: Room) => r.id === roomId)?.name || 'Ruangan Tidak Diketahui';
  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center">
            {booking.status === BookingStatus.APPROVED ? <AlertTriangle className="w-5 h-5 mr-2" /> : <XCircle className="w-5 h-5 mr-2" />}
            <span>{booking.status === BookingStatus.APPROVED ? 'Batalkan Peminjaman' : 'Tolak Peminjaman'}</span>
          </h3>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Anda akan {booking.status === BookingStatus.APPROVED ? 'membatalkan' : 'menolak'} peminjaman ruangan <strong>{getRoomName(booking.roomId)}</strong>. Mohon berikan alasan {booking.status === BookingStatus.APPROVED ? 'pembatalan' : 'penolakan'} untuk peminjam.
          </p>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white text-sm focus:ring-2 focus:ring-red-500"
            rows={3}
            placeholder="Contoh: Ruangan sedang dalam perbaikan, Jadwal bentrok dengan kegiatan fakultas..."
            autoFocus
          />
          {booking.status === BookingStatus.APPROVED && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Hapus dari Google Calendar:</p>
              <div className="space-y-2">
                {(['single', 'thisAndFollowing', 'all'] as const).map((opt) => (
                  <label key={opt} className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${deleteOption === opt ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <input type="radio" name="deleteOption" value={opt} checked={deleteOption === opt} onChange={() => setDeleteOption(opt)} className="mr-3" />
                    <div>
                      {opt === 'single' && <p className="text-sm text-gray-900 dark:text-white">Hapus event ini saja</p>}
                      {opt === 'thisAndFollowing' && <p className="text-sm text-gray-900 dark:text-white">Ini dan event selanjutnya</p>}
                      {opt === 'all' && <p className="text-sm text-gray-900 dark:text-white">Semua event terkait</p>}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">Batal</button>
            <button onClick={onConfirm} className="px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 rounded-lg shadow-md">
              Simpan & {booking.status === BookingStatus.APPROVED ? 'Batalkan' : 'Tolak'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RejectionModal;