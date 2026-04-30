import React from 'react';
import { Room, BookingStatus } from '../types';
import { Trash2, Loader2 } from 'lucide-react';
import { formatDateID } from '../src/utils/formatters';
import { Button } from './ui/button';

const DeleteBookingModal = ({ isOpen, booking, rooms, isDeleting, deleteOption, setDeleteOption, onClose, onConfirm }: any) => {
  if (!isOpen || !booking) return null;
  const getRoomName = (roomId: string) => rooms.find((r: Room) => r.id === roomId)?.name || 'Ruangan Tidak Diketahui';
  return (
    <div className="mobile-modal-shell fixed inset-0 z-80 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="mobile-modal-panel bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-gray-700 animate-fade-in-up flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
          <h3 className="font-bold text-red-800 dark:text-red-400 flex items-center">
            <Trash2 className="w-5 h-5 mr-2" /> Hapus Data Peminjaman
          </h3>
        </div>
        <div className="mobile-modal-body p-4 sm:p-6 space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">⚠️ Peringatan! Tindakan ini tidak dapat dibatalkan.</p>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">Anda akan menghapus data peminjaman berikut secara permanen:</p>
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600 space-y-2">
            <div className="flex justify-between"><span className="text-xs text-gray-500">Peminjam:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{booking.userName}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Ruangan:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{getRoomName(booking.roomId)}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Tanggal:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{formatDateID(booking.date)}</span></div>
            <div className="flex justify-between"><span className="text-xs text-gray-500">Keperluan:</span><span className="text-sm font-medium text-gray-900 dark:text-white">{booking.purpose}</span></div>
          </div>
          {booking.status === BookingStatus.APPROVED && (
            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">Hapus dari Google Calendar:</p>
              <div className="space-y-2">
                {(['single', 'thisAndFollowing', 'all'] as const).map((opt) => (
                  <label key={opt} className={`flex items-center p-2 border rounded-lg cursor-pointer transition-colors ${deleteOption === opt ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
                    <input type="radio" name="deleteOption" value={opt} checked={deleteOption === opt} onChange={() => setDeleteOption(opt)} className="mr-3 h-4 w-4 accent-red-600 focus:ring-red-500/30" />
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
          <div className="mobile-modal-actions flex justify-end gap-3 pt-2">
            <Button onClick={onClose} variant="secondary">Batal</Button>
            <Button onClick={onConfirm} disabled={isDeleting} variant="destructive">
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Hapus Permanen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteBookingModal;
